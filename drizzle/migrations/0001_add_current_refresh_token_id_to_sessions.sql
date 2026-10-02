-- ============================================================================
-- Migration: 0001_add_current_refresh_token_id_to_sessions
-- Purpose  : Support Refresh Token Rotation + Reuse Detection (Issue #26)
-- Date     : 2026-05-30
-- Author   : Security Hardening Work
-- ============================================================================
--
-- Context:
--   As part of auth security hardening, we introduced refresh token rotation.
--   Every time a refresh token is successfully used, we generate a new
--   `refreshTokenId` and store it in the session. On the next refresh,
--   we compare the ID from the token against this column.
--
--   If they don't match → token reuse detected → we immediately revoke
--   the entire session (security best practice against token theft).
--
-- Column Details:
--   - current_refresh_token_id: Stores the ID of the currently valid
--     refresh token for this session.
--   - Length 64 is more than enough for a UUID string.
--   - The column is nullable to support existing sessions after migration
--     (they will get a value on their first successful refresh).
--
-- Rollback:
--   ALTER TABLE sessions DROP COLUMN current_refresh_token_id;
--
-- Notes:
--   - No index is added at this time (query by this column is rare).
--   - If performance becomes an issue later, consider adding an index.
-- ============================================================================

ALTER TABLE sessions
ADD COLUMN current_refresh_token_id VARCHAR(64);

-- If in the future you need to quickly look up sessions by refresh token id:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS
--   idx_sessions_current_refresh_token_id
--   ON sessions (current_refresh_token_id);