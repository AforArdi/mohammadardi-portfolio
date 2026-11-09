export function validOwnerClaims(claims: Record<string, unknown>, ownerId: string, requireMfa = true) {
  return claims.sub === ownerId && claims.aud === "authenticated" && typeof claims.session_id === "string" && /^[0-9a-f-]{36}$/i.test(claims.session_id) && (!requireMfa || claims.aal === "aal2");
}
export class AuthorizationError extends Error { constructor(message = "Please sign in again with your authenticator.") { super(message); this.name = "AuthorizationError"; } }
