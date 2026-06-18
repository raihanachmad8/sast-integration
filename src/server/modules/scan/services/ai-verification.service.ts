import { logger } from '@/server/lib/logger';
import { aiVerificationRepository } from '../repositories/ai-verification.repository';
import { findingRepository } from '../repositories/finding.repository';
import { knowledgeBaseRepository } from '@/server/modules/knowledge-base/knowledge-base.repository';
import { AppError } from '@/server/http/errors';
import { SCAN } from '../constants';
import type { AiModelResponse } from '@/commons/types/findings';

/**
 * System prompt for AI verification — strict rules from thesis research.
 * Ensures model defaults to TP unless clear proof of safety exists.
 */
const SYSTEM_PROMPT = `You are a strict security auditor. Your job is to verify scanner findings.

IMPORTANT RULES:
- Default assumption: the scanner is CORRECT (true_positive) unless you see CLEAR mitigation
- Only classify as "false_positive" if ALL of these are true:
  1. There is EXPLICIT bounds checking, input validation, or sanitization in the visible code
  2. The mitigation FULLY prevents exploitation (partial mitigation = still true_positive)
  3. The dangerous function is called AFTER the validation succeeds
- If the code uses dangerous functions (strcpy, gets, system, sprintf) WITHOUT visible bounds checking → true_positive
- If you are unsure → true_positive
- "The code might be safe" is NOT enough for false_positive. You need PROOF of safety.

Return ONLY valid JSON. No markdown, no explanation outside the JSON.`;

/**
 * Prompt templates for AI verification.
 * Based on the thesis research with Qwen2.5-Coder-SVA model.
 */
const PROMPT_TEMPLATES = {
  strict: `Scanner: {rule}
CWE: {cwe_id}
File: {file_path}:{line_number}
Message: {message}

{cwe_context}

Source code:
\`\`\`
{code}
\`\`\`

Is this a true positive (real vulnerability) or false positive (safe code)?

Respond with JSON:
{
  "verdict": "true_positive" or "false_positive",
  "confidence": 0.0-1.0,
  "explanation": "detailed explanation",
  "data_flow": "how tainted data reaches the sink (source → transform → sink)",
  "taint_source": "untrusted input origin",
  "match_detail": "what the scanner found and why it flagged this",
  "likely_cwe": ["CWE-XXX"],
  "fix_suggestion": "specific code fix"
}`,

  balanced: `Scanner: {rule}
CWE: {cwe_id}
File: {file_path}:{line_number}
Message: {message}

{cwe_context}

Source code:
\`\`\`
{code}
\`\`\`

Is this a true positive or false positive? Respond with JSON:
{
  "verdict": "true_positive" or "false_positive",
  "confidence": 0.0-1.0,
  "explanation": "brief explanation",
  "data_flow": "how tainted data reaches the sink",
  "taint_source": "untrusted input origin",
  "match_detail": "what the scanner found",
  "likely_cwe": ["CWE-XXX"],
  "fix_suggestion": "suggested fix"
}`,
};

export const aiVerificationService = {
  /**
   * Build rich CWE context string from knowledge base entries (global).
   * Queries knowledge_entries matching the finding's CWE ID.
   * Falls back to plain CWE ID if no knowledge base entries found.
   *
   * @param cweId - CWE identifier (e.g. "CWE-787")
   * @returns Formatted CWE context string for prompt injection
   */
  async buildCweContext(cweId: string | null): Promise<string> {
    if (!cweId) return 'No CWE information available.';

    try {
      const entries = await knowledgeBaseRepository.findByCweId(cweId);
      if (entries.length === 0) return `CWE: ${cweId}`;

      const entry = entries[0];
      const parts: string[] = [`CWE Knowledge (${cweId} - ${entry.title}):`];

      if (entry.content) {
        parts.push(`Description: ${entry.content}`);
      }
      if (entry.severity) {
        parts.push(`Severity: ${entry.severity}`);
      }
      if (entry.remediation) {
        parts.push(`Remediation: ${entry.remediation}`);
      }

      return parts.join('\n');
    } catch (error) {
      logger.scan.warn('Failed to fetch CWE context from knowledge base', { cweId, error });
      return `CWE: ${cweId}`;
    }
  },

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

      // Build enriched CWE context from global knowledge base
      const cweContext = await this.buildCweContext(finding.cweId);

      // Select prompt template based on model's prompt preset
      const templateKey = (model.promptPreset === 'balanced') ? 'balanced' : 'strict';
      const prompt = PROMPT_TEMPLATES[templateKey]
        .replace('{code}', finding.codeSnippet || 'No code available')
        .replace('{rule}', finding.rule || 'Unknown rule')
        .replace('{cwe_id}', finding.cweId || 'N/A')
        .replace('{file_path}', finding.filePath || 'Unknown file')
        .replace('{line_number}', String(finding.lineNumber || 0))
        .replace('{message}', finding.message || 'No message')
        .replace('{cwe_context}', cweContext);

      const startTime = Date.now();
      const aiResponse = await this.callAiModel(model, prompt);
      const latencyMs = Date.now() - startTime;

      const verification = await aiVerificationRepository.create({
        findingId: findingId,
        modelId: model.id,
        verdict: aiResponse.verdict,
        confidence: String(aiResponse.confidence),
        explanation: aiResponse.explanation,
        dataFlow: aiResponse.dataFlow,
        taintSource: aiResponse.taintSource,
        matchDetail: aiResponse.matchDetail,
        likelyCwe: aiResponse.likelyCwe,
        fixSuggestion: aiResponse.fixSuggestion,
        latencyMs: latencyMs,
        rawResponse: aiResponse.rawResponse,
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
   * @returns AI response with verdict, confidence, and detailed analysis
   */
  async callAiModel(
    model: { provider: string; baseUrl: string; apiKeyEncrypted: string | null; name: string },
    prompt: string,
  ): Promise<AiModelResponse> {
    if (model.provider === 'ollama') {
      return this.callOllama(model.baseUrl, model.name, SYSTEM_PROMPT, prompt);
    }

    return this.callOpenAiCompatible(model.baseUrl, model.apiKeyEncrypted, model.name, SYSTEM_PROMPT, prompt);
  },

  /**
   * Call Ollama /api/chat endpoint.
   *
   * @param baseUrl - Ollama server base URL
   * @param model - Model name
   * @param systemPrompt - System prompt
   * @param userPrompt - User prompt
   * @returns Parsed AI response with detailed analysis
   */
  async callOllama(
    baseUrl: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<AiModelResponse> {
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
    const parsed = this.parseAiResponse(content);
    return { ...parsed, rawResponse: content };
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
   * @returns Parsed AI response with detailed analysis
   */
  async callOpenAiCompatible(
    baseUrl: string,
    apiKey: string | null,
    model: string,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<AiModelResponse> {
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
   * Supports both old format (reasoning) and new format (explanation).
   *
   * @param content - Raw AI response text
   * @returns Parsed verdict with confidence, explanation, and detailed analysis
   */
  parseAiResponse(content: string): AiModelResponse {
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    try {
      const parsed = JSON.parse(cleaned);
      const verdict = parsed.verdict === 'true_positive' ? 'true_positive' : 'false_positive';
      const confidence = typeof parsed.confidence === 'number'
        ? (parsed.confidence > 1 ? parsed.confidence / 100 : Math.min(1, Math.max(0, parsed.confidence)))
        : 0.5;
      const explanation = typeof parsed.explanation === 'string'
        ? parsed.explanation
        : typeof parsed.reasoning === 'string'
          ? parsed.reasoning
          : 'No explanation provided';

      return {
        verdict,
        confidence,
        explanation,
        dataFlow: typeof parsed.data_flow === 'string' ? parsed.data_flow : undefined,
        taintSource: typeof parsed.taint_source === 'string' ? parsed.taint_source : undefined,
        matchDetail: typeof parsed.match_detail === 'string' ? parsed.match_detail : undefined,
        likelyCwe: Array.isArray(parsed.likely_cwe) ? parsed.likely_cwe : undefined,
        fixSuggestion: typeof parsed.fix_suggestion === 'string' ? parsed.fix_suggestion : undefined,
      };
    } catch {
      const lower = content.toLowerCase();
      if (lower.includes('true_positive') || lower.includes('true positive')) {
        return { verdict: 'true_positive', confidence: 0.6, explanation: content.slice(0, 200) };
      }
      return { verdict: 'false_positive', confidence: 0.4, explanation: content.slice(0, 200) };
    }
  },
};
