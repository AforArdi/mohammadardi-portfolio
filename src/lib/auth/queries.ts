import { sql } from "drizzle-orm";

export function establishAdminSession(nonce: string, userId: string, sessionId: string) {
  return sql`WITH consumed AS (
    UPDATE portfolio.fresh_login_nonces SET used_at = now()
    WHERE nonce = ${nonce} AND user_id = ${userId}::uuid AND session_id = ${sessionId}::uuid
      AND used_at IS NULL AND expires_at > now() AND failed_attempts BETWEEN 1 AND 3
      AND security_generation = COALESCE((SELECT generation FROM portfolio.owner_security WHERE user_id = ${userId}::uuid), 0)
      AND NOT EXISTS (SELECT 1 FROM portfolio.owner_security WHERE user_id = ${userId}::uuid AND password_change_id IS NOT NULL)
    RETURNING user_id, session_id
  ) INSERT INTO portfolio.admin_sessions (session_id, user_id, aal2_verified_at, deadline_at, is_revoked)
    SELECT session_id, user_id, now(), now() + interval '24 hours', false FROM consumed
    ON CONFLICT (session_id) DO NOTHING RETURNING session_id`;
}

export function reserveMfaAttempt(nonce: string, userId: string, sessionId: string) {
  return sql`UPDATE portfolio.fresh_login_nonces SET failed_attempts = failed_attempts + 1
    WHERE nonce = ${nonce} AND user_id = ${userId}::uuid AND session_id = ${sessionId}::uuid
      AND used_at IS NULL AND expires_at > now() AND failed_attempts < 3 RETURNING nonce`;
}

export function reserveRateLimit(key: string, limit: number, seconds: number) {
  return sql`INSERT INTO portfolio.rate_limit_buckets (key, count, expires_at) VALUES (${key}, 1, now() + ${seconds} * interval '1 second')
    ON CONFLICT (key) DO UPDATE SET count = CASE WHEN portfolio.rate_limit_buckets.expires_at <= now() THEN 1 ELSE portfolio.rate_limit_buckets.count + 1 END,
      expires_at = CASE WHEN portfolio.rate_limit_buckets.expires_at <= now() THEN now() + ${seconds} * interval '1 second' ELSE portfolio.rate_limit_buckets.expires_at END
    WHERE portfolio.rate_limit_buckets.expires_at <= now() OR portfolio.rate_limit_buckets.count < ${limit}
    RETURNING key`;
}
