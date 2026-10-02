import { aiVerificationService } from '@/server/modules/scan/services/ai-verification.service';

export interface AiVerifyJobData {
  /** Scan UUID containing findings to verify */
  scanId: string;
  /** AI model UUID to use for verification */
  modelId: string;
}

/**
 * Background job handler for AI verification of findings.
 *
 * This job:
 * - Gets all findings for a scan
 * - Calls AI model for each finding
 * - Stores verification results
 * - Updates findings with AI verdicts
 *
 * Registered automatically in instrumentation.ts on server startup.
 */
export async function processAiVerifyJob(job: { data: AiVerifyJobData }) {
  const { scanId, modelId } = job.data;

  try {
    console.info(`[ai-verify] Starting AI verification for scan ${scanId}`);

    const result = await aiVerificationService.batchVerify(scanId, modelId);

    console.info(
      `[ai-verify] Completed: ${result.verified}/${result.total} verified, ${result.failed} failed`
    );

    return result;
  } catch (error) {
    console.error(`[ai-verify] Failed for scan ${scanId}:`, error);
    throw error;
  }
}
