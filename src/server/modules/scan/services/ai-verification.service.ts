import { aiVerificationRepository } from '../repositories/ai-verification.repository';
import { findingRepository } from '../repositories/finding.repository';
import { AppError } from '@/server/http/errors';

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

/**
 * AI verification service for validating scanner findings.
 *
 * This service orchestrates the AI verification pipeline:
 * 1. Get finding details and code context
 * 2. Build prompt with finding info and knowledge base context
 * 3. Call AI model (via HTTP API)
 * 4. Parse response and store verification result
 * 5. Update finding with AI verdict
 */
export const aiVerificationService = {
  /**
   * Verify a single finding using AI model.
   *
   * @param findingId - Finding UUID to verify
   * @param modelId - AI model UUID to use for verification
   * @returns Verification result with verdict and confidence
   */
  async verifyFinding(findingId: string, modelId: string) {
    // 1. Get finding details
    const finding = await findingRepository.findById(findingId);
    if (!finding) {
      throw new AppError('Finding not found', 404, 'NOT_FOUND');
    }

    // 2. Get AI model config
    const model = await aiVerificationRepository.getPrimaryModel(
      '' // workspaceId will be resolved from finding
    );
    if (!model) {
      throw new AppError('No AI model configured', 400, 'AI_MODEL_NOT_CONFIGURED');
    }

    // 3. Build prompt
    const prompt = PROMPT_TEMPLATES.strict
      .replace('{code}', finding.code_snippet || 'No code available')
      .replace('{rule}', finding.rule || 'Unknown rule')
      .replace('{file_path}', finding.file_path || 'Unknown file')
      .replace('{line_number}', String(finding.line_number || 0))
      .replace('{message}', finding.message || 'No message')
      .replace('{cwe_context}', finding.cwe_id || 'No CWE info');

    // 4. Call AI model (placeholder - real implementation calls LLM API)
    const startTime = Date.now();
    const aiResponse = await this.callAiModel(model, prompt);
    const latencyMs = Date.now() - startTime;

    // 5. Store verification result
    const verification = await aiVerificationRepository.create({
      finding_id: findingId,
      model_id: model.id as string,
      verdict: aiResponse.verdict,
      confidence: String(aiResponse.confidence),
      explanation: aiResponse.reasoning,
      fix_suggestion: aiResponse.fix_suggestion,
      latency_ms: latencyMs,
    });

    // 6. Update finding with AI verdict
    await findingRepository.updateStatus(findingId, 'verified', 'ai-system');

    return verification;
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
    model: { provider: string; base_url: string; api_key_encrypted: string | null; name: string },
    prompt: string
  ): Promise<{ verdict: string; confidence: number; reasoning: string; fix_suggestion?: string }> {
    const systemPrompt = 'You are a security code reviewer. Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.';

    if (model.provider === 'ollama') {
      return this.callOllama(model.base_url, model.name, systemPrompt, prompt);
    }

    if (model.provider === 'groq') {
      return this.callOpenAiCompatible(model.base_url, model.api_key_encrypted, 'llama-3.3-70b-versatile', systemPrompt, prompt);
    }

    // openai_compatible — uses model.name as the model parameter
    return this.callOpenAiCompatible(model.base_url, model.api_key_encrypted, model.name, systemPrompt, prompt);
  },

  /**
   * Call Ollama /api/chat endpoint.
   */
  async callOllama(
    baseUrl: string,
    model: string,
    systemPrompt: string,
    userPrompt: string
  ): Promise<{ verdict: string; confidence: number; reasoning: string; fix_suggestion?: string }> {
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
      throw new Error(`Ollama API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const content = data.message?.content ?? '';
    return this.parseAiResponse(content);
  },

  /**
   * Call OpenAI-compatible /v1/chat/completions endpoint.
   * Works with OpenAI, Groq, vLLM, LM Studio, etc.
   */
  async callOpenAiCompatible(
    baseUrl: string,
    apiKey: string | null,
    model: string,
    systemPrompt: string,
    userPrompt: string
  ): Promise<{ verdict: string; confidence: number; reasoning: string; fix_suggestion?: string }> {
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
      throw new Error(`AI API error: ${res.status} ${res.statusText} ${body}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    return this.parseAiResponse(content);
  },

  /**
   * Parse AI response content into structured verdict.
   * Handles both raw JSON and markdown-wrapped JSON.
   */
  parseAiResponse(content: string): { verdict: string; confidence: number; reasoning: string; fix_suggestion?: string } {
    // Strip markdown code fences if present
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
        fix_suggestion: typeof parsed.fix_suggestion === 'string' ? parsed.fix_suggestion : undefined,
      };
    } catch {
      // Fallback: try to extract verdict from text
      const lower = content.toLowerCase();
      if (lower.includes('true_positive') || lower.includes('true positive')) {
        return { verdict: 'true_positive', confidence: 0.6, reasoning: content.slice(0, 200) };
      }
      return { verdict: 'false_positive', confidence: 0.4, reasoning: content.slice(0, 200) };
    }
  },

  /**
   * Batch verify multiple findings for a scan.
   *
   * @param scanId - Scan UUID containing findings to verify
   * @param modelId - AI model UUID to use
   * @returns Summary of verification results
   */
  async batchVerify(scanId: string, modelId: string) {
    const findingsToVerify = await aiVerificationRepository.getFindingsForVerification(scanId);

    let verified = 0;
    let failed = 0;

    for (const finding of findingsToVerify) {
      try {
        await this.verifyFinding(finding.id, modelId);
        verified++;
      } catch (error) {
        console.error(`Failed to verify finding ${finding.id}:`, error);
        failed++;
      }
    }

    return {
      total: findingsToVerify.length,
      verified,
      failed,
    };
  },
};
