import { logger } from '@/server/lib/logger';
import { aiVerificationRepository } from '../repositories/ai-verification.repository';
import { findingRepository } from '../repositories/finding.repository';
import { AppError } from '@/server/http/errors';
import { SCAN } from '../constants';

/**
 * Prompt templates for AI verification.
 * Based on the thesis research with Qwen2.5-Coder-SVA model.
 */
const PROMPT_TEMPLATES = {
  strict: `You are a security code reviewer. Analyze the following code finding and determine if it is a TRUE POSITIVE or FALSE POSITIVE.

Code Snippet:
{code}

Scanner Rule: {rule}
File: {file_path}
Line: {line_number}
Message: {message}

CWE Context: {cwe_context}

Respond with JSON:
{
  "verdict": "true_positive" or "false_positive",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "fix_suggestion": "Suggested fix if true positive"
}`,

  balanced: `You are a security code reviewer. Analyze this finding:
{rule} at {file_path}:{line_number}
Message: {message}

Code:
{code}

Is this a true positive or false positive? Respond with JSON:
{
  "verdict": "true_positive" or "false_positive",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}`,
};

export const aiVerificationService = {
  /**
   * Verify a single finding using an AI model.
   *
   * @param findingId - Finding UUID to verify
   * @param modelId - AI model UUID to use for verification
   * @returns Verification result with verdict and confidence
   */
  async verifyFinding(findingId: string, modelId: string) {
    logger.scan.info('verifyFinding', { findingId, modelId });

    try {
      const finding = await findingRepository.findById(findingId);
      if (!finding) {
        throw new AppError('Finding not found', 404, SCAN.ERRORS.NOT_FOUND_CODE);
      }

      // Use specified model or fall back to primary
      let model = await aiVerificationRepository.getModelById(modelId);
      if (!model) {
        model = await aiVerificationRepository.getPrimaryModel();
      }
      if (!model) {
        throw new AppError('No AI model configured', 400, SCAN.ERRORS.AI_MODEL_NOT_CONFIGURED);
      }

      const prompt = PROMPT_TEMPLATES.strict
        .replace('{code}', finding.codeSnippet || 'No code available')
        .replace('{rule}', finding.rule || 'Unknown rule')
        .replace('{file_path}', finding.filePath || 'Unknown file')
        .replace('{line_number}', String(finding.lineNumber || 0))
        .replace('{message}', finding.message || 'No message')
        .replace('{cwe_context}', finding.cweId || 'No CWE info');

      const startTime = Date.now();
      const aiResponse = await this.callAiModel(model, prompt);
      const latencyMs = Date.now() - startTime;

      const verification = await aiVerificationRepository.create({
        findingId: findingId,
        modelId: model.id,
        verdict: aiResponse.verdict,
        confidence: String(aiResponse.confidence),
        explanation: aiResponse.reasoning,
        fixSuggestion: aiResponse.fixSuggestion,
        latencyMs: latencyMs,
      });

      // Keep original status, don't overwrite with 'verified'
      logger.scan.info('verifyFinding completed', { findingId, verdict: aiResponse.verdict, confidence: aiResponse.confidence });
      return verification;
    } catch (error) {
      logger.scan.error('verifyFinding failed', { error, findingId });
      throw error;
    }
  },

  /**
   * Batch verify all findings in a scan.
   *
   * @param scanId - Scan UUID containing findings to verify
   * @param modelId - AI model UUID to use for verification
   * @returns Summary of verification results
   */
  async verifyFindingsBatch(scanId: string, modelId: string) {
    logger.scan.info('verifyFindingsBatch', { scanId, modelId });

    try {
      const findingsToVerify = await findingRepository.listByScan(scanId, {
        page: 1,
        perPage: 1000,
        status: 'open',
      });

      const BATCH_SIZE = 5;
      let verified = 0;
      let failed = 0;

      // Process findings in parallel batches
      for (let i = 0; i < findingsToVerify.data.length; i += BATCH_SIZE) {
        const batch = findingsToVerify.data.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((finding) => this.verifyFinding(finding.id, modelId))
        );
        for (const r of results) {
          if (r.status === 'fulfilled') verified++;
          else failed++;
        }
      }

      const result = { total: findingsToVerify.data.length, verified, failed };
      logger.scan.info('verifyFindingsBatch completed', { scanId, ...result });
      return result;
    } catch (error) {
      logger.scan.error('verifyFindingsBatch failed', { error, scanId });
      throw error;
    }
  },

  /**
   * Get the latest AI verification result for a finding.
   *
   * @param findingId - Finding UUID
   * @returns Latest verification record or null
   */
  async getVerificationResult(findingId: string) {
    logger.scan.debug('getVerificationResult', { findingId });

    try {
      const result = await aiVerificationRepository.getLatestByFinding(findingId);
      logger.scan.debug('getVerificationResult completed', { findingId, found: !!result });
      return result;
    } catch (error) {
      logger.scan.error('getVerificationResult failed', { error, findingId });
      throw error;
    }
  },

  /**
   * Get all AI verification records for a finding (full history).
   *
   * @param findingId - Finding UUID
   * @returns Array of verification records ordered by creation date
   */
  async getVerificationHistory(findingId: string) {
    logger.scan.debug('getVerificationHistory', { findingId });

    try {
      const result = await aiVerificationRepository.listByFinding(findingId);
      logger.scan.debug('getVerificationHistory completed', { findingId, count: result.length });
      return result;
    } catch (error) {
      logger.scan.error('getVerificationHistory failed', { error, findingId });
      throw error;
    }
  },

  /**
   * Call AI model API for verification.
   * Supports Ollama, OpenAI-compatible, and Groq providers.
   *
   * @param model - AI model configuration
   * @param prompt - The prompt to send to the model
   * @returns AI response with verdict and confidence
   */
  async callAiModel(
    model: { provider: string; baseUrl: string; apiKeyEncrypted: string | null; name: string },
    prompt: string,
  ): Promise<{ verdict: string; confidence: number; reasoning: string; fixSuggestion?: string }> {
    const systemPrompt = 'You are a security code reviewer. Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.';

    if (model.provider === 'ollama') {
      return this.callOllama(model.baseUrl, model.name, systemPrompt, prompt);
    }

    return this.callOpenAiCompatible(model.baseUrl, model.apiKeyEncrypted, model.name, systemPrompt, prompt);
  },

  /**
   * Call Ollama /api/chat endpoint.
   *
   * @param baseUrl - Ollama server base URL
   * @param model - Model name
   * @param systemPrompt - System prompt
   * @param userPrompt - User prompt
   * @returns Parsed AI response
   */
  async callOllama(
    baseUrl: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<{ verdict: string; confidence: number; reasoning: string; fixSuggestion?: string }> {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        format: 'json',
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new AppError(`Ollama API error: ${res.status} ${res.statusText}`, 500, SCAN.ERRORS.AI_MODEL_NOT_CONFIGURED);
    }

    const data = await res.json();
    const content = data.message?.content ?? '';
    return this.parseAiResponse(content);
  },

  /**
   * Call OpenAI-compatible /v1/chat/completions endpoint.
   * Works with OpenAI, Groq, vLLM, LM Studio, etc.
   *
   * @param baseUrl - API server base URL
   * @param apiKey - API key (null for local servers)
   * @param model - Model name
   * @param systemPrompt - System prompt
   * @param userPrompt - User prompt
   * @returns Parsed AI response
   */
  async callOpenAiCompatible(
    baseUrl: string,
    apiKey: string | null,
    model: string,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<{ verdict: string; confidence: number; reasoning: string; fixSuggestion?: string }> {
    const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 512,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new AppError(`AI API error: ${res.status} ${res.statusText} ${body}`, 500, SCAN.ERRORS.AI_MODEL_NOT_CONFIGURED);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    return this.parseAiResponse(content);
  },

  /**
   * Parse AI response content into structured verdict.
   * Handles both raw JSON and markdown-wrapped JSON.
   *
   * @param content - Raw AI response text
   * @returns Parsed verdict with confidence and reasoning
   */
  parseAiResponse(content: string): { verdict: string; confidence: number; reasoning: string; fixSuggestion?: string } {
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    try {
      const parsed = JSON.parse(cleaned);
      return {
        verdict: parsed.verdict === 'true_positive' ? 'true_positive' : 'false_positive',
        confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'No reasoning provided',
        fixSuggestion: typeof parsed.fix_suggestion === 'string' ? parsed.fix_suggestion : undefined,
      };
    } catch {
      const lower = content.toLowerCase();
      if (lower.includes('true_positive') || lower.includes('true positive')) {
        return { verdict: 'true_positive', confidence: 0.6, reasoning: content.slice(0, 200) };
      }
      return { verdict: 'false_positive', confidence: 0.4, reasoning: content.slice(0, 200) };
    }
  },
};
