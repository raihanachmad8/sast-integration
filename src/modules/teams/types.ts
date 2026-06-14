/** Team form input for creating or updating a team. */
export interface TeamFormInput {
  /** Team display name. */
  name: string;
  /** URL-friendly slug identifier. */
  slug: string;
  /** Optional description of the team's purpose. */
  description: string;
  /** Array of user IDs to add as team members. */
  memberIds: string[];
}
