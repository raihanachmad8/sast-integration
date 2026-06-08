/**
 * Webhook types — mirror the Drizzle schema for frontend development.
 *
 * @module commons-types-webhooks
 */

/**
 * Mock webhook — outbound HTTP call on scan/finding events.
 *
 * @example
 * ```ts
 * const webhook: WebhookRow = {
 *   id: 'wh_01',
 *   workspaceId: 'ws_01',
 *   name: 'Slack Notifications',
 *   url: 'https://hooks.slack.com/services/T00/B00/xxx',
 *   events: ['scan.completed', 'finding.critical'],
 *   active: true,
 *   lastTriggeredAt: '2026-06-04T06:12:00Z',
 *   createdAt: '2026-02-01T08:00:00Z',
 * };
 * ```
 */
export type WebhookRow = {
  /** Unique webhook ID. */
  id: string;
  /** Workspace ID. */
  workspaceId: string;
  /** Webhook display name. */
  name: string;
  /** Target URL for the webhook payload. */
  url: string;
  /** Events that trigger this webhook. */
  events: string[];
  /** Whether the webhook is active. */
  active: boolean;
  /** ISO 8601 last trigger timestamp. */
  lastTriggeredAt: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
};
