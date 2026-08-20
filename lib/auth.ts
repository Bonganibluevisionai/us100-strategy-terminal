export const SESSION_COOKIE = "us100_session";

/**
 * The session token is a hash of the access code, so changing the code
 * invalidates every existing session. Web Crypto keeps this usable in both
 * the edge middleware and Node route handlers.
 */
export async function sessionTokenFor(accessCode: string): Promise<string> {
  const data = new TextEncoder().encode(
    `us100-terminal-session-v1:${accessCode}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
