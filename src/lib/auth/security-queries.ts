import { sql } from "drizzle-orm";

export const ensureSecurity = (userId: string) => sql`INSERT INTO portfolio.owner_security (user_id) VALUES (${userId}::uuid) ON CONFLICT DO NOTHING`;
export const lockSecurity = (userId: string) => sql`SELECT generation, password_change_id FROM portfolio.owner_security WHERE user_id = ${userId}::uuid FOR UPDATE`;
export const revokeAuthorizations = (userId: string) => sql`UPDATE portfolio.admin_sessions SET is_revoked = true WHERE user_id = ${userId}::uuid`;
export const deleteLoginProofs = (userId: string) => sql`DELETE FROM portfolio.fresh_login_nonces WHERE user_id = ${userId}::uuid`;
export const startPasswordChange = (userId: string, operation: string, sessionId: string) => sql`
  UPDATE portfolio.owner_security SET generation = generation + 1,
    password_change_id = ${operation}::uuid, password_change_started_at = now()
  WHERE user_id = ${userId}::uuid AND password_change_id IS NULL
    AND EXISTS (SELECT 1 FROM portfolio.admin_sessions WHERE user_id = ${userId}::uuid
      AND session_id = ${sessionId}::uuid AND NOT is_revoked AND deadline_at > now())
  RETURNING generation`;
export const finishPasswordChange = (userId: string, operation: string) => sql`
  UPDATE portfolio.owner_security SET password_change_id = NULL, password_change_started_at = NULL
  WHERE user_id = ${userId}::uuid AND password_change_id = ${operation}::uuid RETURNING user_id`;
