/**
 * AI model types — mirror the Drizzle schema for frontend development.
 *
 * @module commons-types-ai-models
 */

/**
 * Mock AI model — LLM configuration for TP/FP verification.
 *
 * @example
 * ```ts
 * const model: AiModelRow = {
 *   id: 'aim_01',
 *   workspaceId: 'ws_01',
 *   name: 'Qwen 2.5 72B',
 *   provider: 'modal',
 *   baseUrl: 'https://modal.com/v1',
 *   role: 'primary',
 *   priority: 1,
 *   promptPreset: 'strict',
 *   status: 'reachable',
 *   lastTestedAt: '2026-06-04T06:00:00Z',
 *   createdAt: '2026-03-01T08:00:00Z',
 * };
 * ```
 */
export type AiModelRow = {
  /** Unique AI model ID. */
  id: string;
  /** Workspace ID. */
  workspaceId: string;
  /** Model display name. */
  name: string;
  /** Provider name (modal, ollama, openai, etc.). */
  provider: string;
  /** API base URL. */
  baseUrl: string;
  /** Model role — primary or fallback. */
  role: 'primary' | 'fallback';
  /** Fallback priority (lower = higher priority). */
  priority: number;
  /** Prompt preset identifier. */
  promptPreset: string;
  /** Connection status. */
  status: 'reachable' | 'unreachable';
  /** ISO 8601 last tested timestamp. */
  lastTestedAt: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
};
