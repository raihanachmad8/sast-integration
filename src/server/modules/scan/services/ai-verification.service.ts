import { logger } from '@/server/lib/logger';
import { aiVerificationRepository } from '../repositories/ai-verification.repository';
import { findingRepository } from '../repositories/finding.repository';
import { knowledgeBaseRepository } from '@/server/modules/knowledge-base/knowledge-base.repository';
import { AppError } from '@/server/http/errors';
import { SCAN } from '../constants';
import type { AiModelResponse } from '@/commons/types/findings';
import { db } from '@/server/db/client';
import { workspaceSettings } from '@drizzle/schema/workspaces';
import { eq, and } from 'drizzle-orm';

/**
 * Error classification for fallback chain decisions.
 */
enum ErrorClass {
  RETRYABLE = 'retryable',
  NON_RETRYABLE = 'non_retryable',
}

/**
 * Track each model attempt in the fallback chain.
 */
interface ModelAttemptResult {
  modelId: string;
  modelName: string;
  provider: string;
  success: boolean;
  error?: string;
  errorClass?: ErrorClass;
  latencyMs?: number;
  retryOfModelId?: string;
}

/**
 * In-memory model health tracker.
 * Tracks consecutive failures per model to skip unhealthy models faster.
 */
const MODEL_HEALTH = new Map<string, { consecutiveFailures: number; lastFailureAt: number; markedUnhealthyAt: number }>();
const MAX_CONSECUTIVE_FAILURES = 3;
const UNHEALTHY_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a model is healthy enough to try.
 *
 * @param modelId - Model UUID
 * @returns true if model is healthy or cooldown expired
 */
function isModelHealthy(modelId: string): boolean {
  const health = MODEL_HEALTH.get(modelId);
  if (!health) return true;
  if (health.consecutiveFailures < MAX_CONSECUTIVE_FAILURES) return true;
  // Cooldown expired — give it another chance
  if (Date.now() - health.markedUnhealthyAt > UNHEALTHY_COOLDOWN_MS) return true;
  return false;
}

/**
 * Record a model failure.
 */
function recordModelFailure(modelId: string): void {
  const existing = MODEL_HEALTH.get(modelId);
  const consecutiveFailures = (existing?.consecutiveFailures ?? 0) + 1;
  const markedUnhealthyAt = consecutiveFailures >= MAX_CONSECUTIVE_FAILURES
    ? (existing?.markedUnhealthyAt ?? Date.now())
    : 0;
  MODEL_HEALTH.set(modelId, {
    consecutiveFailures,
    lastFailureAt: Date.now(),
    markedUnhealthyAt,
  });
}

/**
 * Record a model success — reset failure counter.
 */
function recordModelSuccess(modelId: string): void {
  MODEL_HEALTH.delete(modelId);
}

/**
 * Classify AI model errors for fallback decisions.
 *
 * RETRYABLE: timeout, rate limit, network, 5xx — next model might work.
 * NON_RETRYABLE: auth, quota, invalid model — no point trying next model.
 *
 * @param error - The error thrown by callAiModel
 * @returns Error class indicating whether to retry with next model
 */
function classifyError(error: Error): ErrorClass {
  const msg = error.message.toLowerCase();

  if (msg.includes('unauthorized') || msg.includes('api key')) return ErrorClass.NON_RETRYABLE;
  if (msg.includes('invalid model') || msg.includes('model not found')) return ErrorClass.NON_RETRYABLE;
  if (msg.includes('quota exceeded') || msg.includes('billing')) return ErrorClass.NON_RETRYABLE;

  if (msg.includes('timeout') || msg.includes('timed out')) return ErrorClass.RETRYABLE;
  if (msg.includes('rate limit') || msg.includes('429')) return ErrorClass.RETRYABLE;
  if (msg.includes('econnrefused') || msg.includes('enotfound')) return ErrorClass.RETRYABLE;
  if (msg.includes('500') || msg.includes('502') || msg.includes('503')) return ErrorClass.RETRYABLE;

  return ErrorClass.RETRYABLE;
}

/**
 * Validate AI model response before accepting.
 *
 * @param response - Parsed AI response
 * @returns true if response is valid
 */
function validateAiResponse(response: AiModelResponse): boolean {
  if (!response.verdict) return false;
  if (response.verdict !== 'true_positive' && response.verdict !== 'false_positive') return false;
  if (typeof response.confidence !== 'number') return false;
  if (response.confidence < 0 || response.confidence > 1) return false;
  if (!response.explanation || response.explanation.trim().length === 0) return false;
  return true;
}

/**
 * Sleep utility.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
CWE: {cweId}
File: {filePath}:{lineNumber}
Message: {message}

{cweContext}

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
  "dataFlow": "how tainted data reaches the sink (source → transform → sink)",
  "taintSource": "untrusted input origin",
  "matchDetail": "what the scanner found and why it flagged this",
  "likelyCwe": ["CWE-XXX"],
  "fixSuggestion": "specific code fix"
}`,

  balanced: `Scanner: {rule}
CWE: {cweId}
File: {filePath}:{lineNumber}
Message: {message}

{cweContext}

Source code:
\`\`\`
{code}
\`\`\`

Is this a true positive or false positive? Respond with JSON:
{
  "verdict": "true_positive" or "false_positive",
  "confidence": 0.0-1.0,
  "explanation": "brief explanation",
  "dataFlow": "how tainted data reaches the sink",
  "taintSource": "untrusted input origin",
  "matchDetail": "what the scanner found",
  "likelyCwe": ["CWE-XXX"],
  "fixSuggestion": "suggested fix"
}`,
};

export const aiVerificationService = {
  /**
   * Get verification settings for a workspace.
   * @param workspaceId - Workspace UUID
   * @returns Verification settings with defaults
   */
  async getVerificationSettings(workspaceId: string) {
    try {
      const [setting] = await db
        .select()
        .from(workspaceSettings)
        .where(and(eq(workspaceSettings.workspaceId, workspaceId), eq(workspaceSettings.key, 'verification_settings')))
        .limit(1);

      const defaults = {
        attachKnowledge: true,
        requireConfidence: true,
        allowFallback: true,
        confidenceThreshold: '90',
        timeout: '90',
        cweMismatch: 'warn',
      };

      return setting?.value ? { ...defaults, ...JSON.parse(setting.value) } : defaults;
    } catch (error) {
      logger.scan.warn('Failed to fetch verification settings', { workspaceId, error });
      return { attachKnowledge: true, requireConfidence: true, allowFallback: true, confidenceThreshold: '90', timeout: '90', cweMismatch: 'warn' };
    }
  },

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
   * Verify a single finding using an AI model with professional fallback chain.
   *
   * Flow:
   * 1. Try specified model (if provided) — retry same model once on transient error
   * 2. Try primary model — retry same model once on transient error
   * 3. If allowFallback is true, try fallback models in priority order
   * 4. Skip unhealthy models (3+ consecutive failures in last 5 minutes)
   * 5. Non-retryable errors (auth, quota) abort the chain immediately
   * 6. Response validation before accepting
   *
   * @param findingId - Finding UUID to verify
   * @param modelId - AI model UUID to use for verification (optional)
   * @param workspaceId - Workspace UUID for settings lookup (optional)
   * @returns Verification result with verdict and confidence
   */
  async verifyFinding(findingId: string, modelId: string, workspaceId?: string) {
    const chainStart = Date.now();
    logger.scan.info('verifyFinding:start', { findingId, modelId });

    try {
      const finding = await findingRepository.findById(findingId);
      if (!finding) {
        throw new AppError('Finding not found', 404, SCAN.ERRORS.NOT_FOUND_CODE);
      }

      // Skip if group already has high-confidence verification
      if (finding.groupId) {
        const existing = await aiVerificationRepository.getLatestByGroup(finding.groupId);
        if (existing && Number(existing.confidence) > 80) {
          logger.scan.info('verifyFinding:skip_already_verified', {
            findingId,
            groupId: finding.groupId,
            existingVerdict: existing.verdict,
            existingConfidence: existing.confidence,
          });
          return existing;
        }
      }

      const settings = workspaceId ? await this.getVerificationSettings(workspaceId) : { allowFallback: true, timeout: '90' };
      const allowFallback = settings.allowFallback !== false;
      const timeoutMs = (parseInt(settings.timeout) || 90) * 1000;

      // Build the model chain: specified → primary → fallbacks
      const triedModelIds = new Set<string>();
      const modelsToTry: Array<{ id: string; name: string; provider: string; baseUrl: string; apiKeyEncrypted: string | null; promptPreset: string }> = [];

      if (modelId) {
        const specifiedModel = await aiVerificationRepository.getModelById(modelId);
        if (specifiedModel) {
          modelsToTry.push(specifiedModel);
          triedModelIds.add(specifiedModel.id);
        }
      }

      const primaryModel = await aiVerificationRepository.getPrimaryModel();
      if (primaryModel && !triedModelIds.has(primaryModel.id)) {
        modelsToTry.push(primaryModel);
        triedModelIds.add(primaryModel.id);
      }

      if (allowFallback) {
        const fallbackModels = await aiVerificationRepository.getFallbackModels(modelId);
        for (const fb of fallbackModels) {
          if (!triedModelIds.has(fb.id)) {
            modelsToTry.push(fb);
            triedModelIds.add(fb.id);
          }
        }
      }

      // Filter out unhealthy models
      const healthyModels = modelsToTry.filter((m) => {
        if (!isModelHealthy(m.id)) {
          logger.scan.warn('verifyFinding:skip_unhealthy', { findingId, modelId: m.id, modelName: m.name });
          return false;
        }
        return true;
      });

      if (healthyModels.length === 0) {
        throw new AppError('No healthy AI model available', 400, SCAN.ERRORS.AI_MODEL_NOT_CONFIGURED);
      }

      const cweContext = await this.buildCweContext(finding.cweId);

      // Execute fallback chain with retry-same-model + classification-aware fallback
      const RETRY_SAME_MODEL_DELAY_MS = 2000;
      const FALLBACK_DELAYS_MS = [1000, 3000, 5000];
      const attempts: ModelAttemptResult[] = [];
      let lastError: Error | null = null;

      for (let i = 0; i < healthyModels.length; i++) {
        const model = healthyModels[i];

        // Delay before fallback to next model (skip for first model)
        if (i > 0) {
          const delayMs = FALLBACK_DELAYS_MS[Math.min(i - 1, FALLBACK_DELAYS_MS.length - 1)];
          logger.scan.info('verifyFinding:fallback_delay', {
            findingId,
            delayMs,
            nextModel: model.name,
            nextProvider: model.provider,
            attempt: i + 1,
            totalModels: healthyModels.length,
          });
          await sleep(delayMs);
        }

        // Try this model (with one retry on transient error)
        let modelSucceeded = false;
        for (let retry = 0; retry < 2; retry++) {
          if (retry > 0) {
            logger.scan.info('verifyFinding:retry_same_model', {
              findingId,
              modelId: model.id,
              modelName: model.name,
              retryAttempt: retry,
            });
            await sleep(RETRY_SAME_MODEL_DELAY_MS);
          }

          const attemptStart = Date.now();
          try {
            const templateKey = (model.promptPreset === 'balanced') ? 'balanced' : 'strict';
            const prompt = PROMPT_TEMPLATES[templateKey]
              .replace('{code}', finding.codeSnippet || 'No code available')
              .replace('{rule}', finding.rule || 'Unknown rule')
              .replace('{cweId}', finding.cweId || 'N/A')
              .replace('{filePath}', finding.filePath || 'Unknown file')
              .replace('{lineNumber}', String(finding.lineNumber || 0))
              .replace('{message}', finding.message || 'No message')
              .replace('{cweContext}', cweContext);

            const aiResponse = await this.callAiModelWithTimeout(model, prompt, timeoutMs);
            const latencyMs = Date.now() - attemptStart;

            // Validate response before accepting
            if (!validateAiResponse(aiResponse)) {
              logger.scan.warn('verifyFinding:invalid_response', {
                findingId,
                modelId: model.id,
                modelName: model.name,
                verdict: aiResponse.verdict,
                confidence: aiResponse.confidence,
              });
              lastError = new Error(`Invalid AI response: verdict=${aiResponse.verdict}, confidence=${aiResponse.confidence}`);
              attempts.push({
                modelId: model.id,
                modelName: model.name,
                provider: model.provider,
                success: false,
                error: lastError.message,
                errorClass: ErrorClass.RETRYABLE,
                latencyMs,
                retryOfModelId: retry > 0 ? model.id : undefined,
              });
              continue; // Retry same model
            }

            const verification = await aiVerificationRepository.create({
              findingId,
              groupId: finding.groupId ?? undefined,
              modelId: model.id,
              verdict: aiResponse.verdict,
              confidence: String(aiResponse.confidence),
              explanation: aiResponse.explanation,
              dataFlow: aiResponse.dataFlow,
              taintSource: aiResponse.taintSource,
              matchDetail: aiResponse.matchDetail,
              likelyCwe: aiResponse.likelyCwe,
              fixSuggestion: aiResponse.fixSuggestion,
              latencyMs,
              rawResponse: aiResponse.rawResponse,
            });

            recordModelSuccess(model.id);
            attempts.push({
              modelId: model.id,
              modelName: model.name,
              provider: model.provider,
              success: true,
              latencyMs,
              retryOfModelId: retry > 0 ? model.id : undefined,
            });

            const totalLatencyMs = Date.now() - chainStart;
            logger.scan.info('verifyFinding:success', {
              findingId,
              modelUsed: model.name,
              provider: model.provider,
              verdict: aiResponse.verdict,
              confidence: aiResponse.confidence,
              explanation: aiResponse.explanation?.slice(0, 200),
              dataFlow: aiResponse.dataFlow,
              taintSource: aiResponse.taintSource,
              matchDetail: aiResponse.matchDetail,
              likelyCwe: aiResponse.likelyCwe,
              fixSuggestion: aiResponse.fixSuggestion?.slice(0, 200),
              attemptNumber: i + 1,
              totalAttempts: attempts.length,
              totalLatencyMs,
              retried: retry > 0,
            });

            modelSucceeded = true;

            // Update group status based on AI verdict
            if (finding.groupId) {
              const newStatus = aiResponse.verdict === 'false_positive' ? 'resolved' : 'open';
              const { findingRepository } = await import('../repositories/finding.repository');
              await findingRepository.updateGroupStatus(finding.groupId, newStatus, null);
            }

            return verification;
          } catch (error) {
            const latencyMs = Date.now() - attemptStart;
            const err = error instanceof Error ? error : new Error(String(error));
            const errorClass = classifyError(err);
            lastError = err;

            attempts.push({
              modelId: model.id,
              modelName: model.name,
              provider: model.provider,
              success: false,
              error: err.message,
              errorClass,
              latencyMs,
              retryOfModelId: retry > 0 ? model.id : undefined,
            });

            logger.scan.warn('verifyFinding:model_attempt_failed', {
              findingId,
              modelId: model.id,
              modelName: model.name,
              provider: model.provider,
              error: err.message,
              errorClass,
              latencyMs,
              retry,
              attemptNumber: i + 1,
            });

            // Non-retryable: abort chain immediately
            if (errorClass === ErrorClass.NON_RETRYABLE) {
              recordModelFailure(model.id);
              logger.scan.error('verifyFinding:abort_non_retryable', {
                findingId,
                modelId: model.id,
                modelName: model.name,
                error: err.message,
              });
              break;
            }

            // Retryable: retry same model once, then move to next
            if (retry === 0) continue; // Retry same model
            // else: move to next model (break inner loop)
          }
        }

        if (!modelSucceeded) {
          recordModelFailure(model.id);
        }

        // Check if non-retryable error broke the inner loop
        const lastAttempt = attempts[attempts.length - 1];
        if (lastAttempt && !lastAttempt.success && lastAttempt.errorClass === ErrorClass.NON_RETRYABLE) {
          break;
        }
      }

      // All models failed — build structured error
      const totalLatencyMs = Date.now() - chainStart;
      const errorSummary = attempts.map((a) => `${a.modelName}${a.retryOfModelId ? '(retry)' : ''}: ${a.success ? 'OK' : a.error ?? 'unknown'}`).join(' | ');

      logger.scan.error('verifyFinding:all_models_failed', {
        findingId,
        totalAttempts: attempts.length,
        totalLatencyMs,
        errorSummary,
      });

      throw new AppError(
        `AI verification failed after ${attempts.length} attempt(s) (${totalLatencyMs}ms). ${errorSummary}`,
        500,
        SCAN.ERRORS.AI_MODEL_NOT_CONFIGURED,
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.scan.error('verifyFinding:unexpected_error', { error, findingId });
      throw new AppError(
        `Verification failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        500,
        SCAN.ERRORS.AI_MODEL_NOT_CONFIGURED,
      );
    }
  },

  /**
   * Batch verify all findings in a scan.
   *
   * @param scanId - Scan UUID containing findings to verify
   * @param modelId - AI model UUID to use for verification
   * @param workspaceId - Workspace UUID for settings lookup
   * @returns Summary of verification results
   */
  async verifyFindingsBatch(scanId: string, modelId: string, workspaceId?: string) {
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
          batch.map((finding) => this.verifyFinding(finding.id, modelId, workspaceId))
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
    signal?: AbortSignal,
  ): Promise<AiModelResponse> {
    if (model.provider === 'ollama') {
      return this.callOllama(model.baseUrl, model.name, SYSTEM_PROMPT, prompt, signal);
    }

    return this.callOpenAiCompatible(model.baseUrl, model.apiKeyEncrypted, model.name, SYSTEM_PROMPT, prompt, signal);
  },

  /**
   * Call AI model with configurable timeout.
   * Wraps callAiModel with AbortController for clean timeout handling.
   *
   * @param model - AI model configuration
   * @param prompt - The prompt to send to the model
   * @param timeoutMs - Timeout in milliseconds (default 90s)
   * @returns AI response with verdict, confidence, and detailed analysis
   */
  async callAiModelWithTimeout(
    model: { provider: string; baseUrl: string; apiKeyEncrypted: string | null; name: string },
    prompt: string,
    timeoutMs: number = 90_000,
  ): Promise<AiModelResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await this.callAiModel(model, prompt, controller.signal);
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AppError(`Model ${model.name} timed out after ${timeoutMs}ms`, 500, SCAN.ERRORS.AI_MODEL_NOT_CONFIGURED);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
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
    signal?: AbortSignal,
  ): Promise<AiModelResponse> {
    try {
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
        signal,
      });

      if (!res.ok) {
        const errorBody = await res.text().catch(() => 'unknown');
        throw new AppError(`Ollama API error: ${res.status} ${res.statusText} - ${errorBody}`, 500, SCAN.ERRORS.AI_MODEL_NOT_CONFIGURED);
      }

      const data = await res.json();
      const content = data.message?.content ?? '';
      const parsed = this.parseAiResponse(content);
      return { ...parsed, rawResponse: content };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AppError('Ollama request aborted', 500, SCAN.ERRORS.AI_MODEL_NOT_CONFIGURED);
      }
      throw error;
    }
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
    signal?: AbortSignal,
  ): Promise<AiModelResponse> {
    const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
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
        signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new AppError(`AI API error: ${res.status} ${res.statusText} ${body}`, 500, SCAN.ERRORS.AI_MODEL_NOT_CONFIGURED);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content ?? '';
      return this.parseAiResponse(content);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AppError('AI API request aborted', 500, SCAN.ERRORS.AI_MODEL_NOT_CONFIGURED);
      }
      throw error;
    }
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
        dataFlow: typeof parsed.dataFlow === 'string' ? parsed.dataFlow : typeof parsed.data_flow === 'string' ? parsed.data_flow : undefined,
        taintSource: typeof parsed.taintSource === 'string' ? parsed.taintSource : typeof parsed.taint_source === 'string' ? parsed.taint_source : undefined,
        matchDetail: typeof parsed.matchDetail === 'string' ? parsed.matchDetail : typeof parsed.match_detail === 'string' ? parsed.match_detail : undefined,
        likelyCwe: Array.isArray(parsed.likelyCwe) ? parsed.likelyCwe : Array.isArray(parsed.likely_cwe) ? parsed.likely_cwe : undefined,
        fixSuggestion: typeof parsed.fixSuggestion === 'string' ? parsed.fixSuggestion : typeof parsed.fix_suggestion === 'string' ? parsed.fix_suggestion : undefined,
      };
    } catch {
      throw new AppError(`Failed to parse AI response as JSON: ${content.slice(0, 200)}`, 500, SCAN.ERRORS.AI_MODEL_NOT_CONFIGURED);
    }
  },
};
