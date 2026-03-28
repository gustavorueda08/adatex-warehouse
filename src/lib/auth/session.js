/**
 * @fileoverview Session cookie management for the Next.js proxy layer.
 *
 * The JWT issued by Strapi is stored in an HttpOnly cookie so it is never
 * exposed to client-side JavaScript. All API route handlers read it via
 * `getTokenFromCookies()` and forward it as a Bearer token to Strapi.
 *
 * Cookie name defaults to `adatex_session` and can be overridden via the
 * `AUTH_COOKIE_NAME` environment variable.
 *
 * Relevant env vars:
 *  - `AUTH_COOKIE_NAME`   — Cookie name (default: `"adatex_session"`)
 *  - `AUTH_COOKIE_SECURE` — Set to `"true"` to require HTTPS (recommended in production)
 *  - `AUTH_COOKIE_DOMAIN` — Optional domain for cross-subdomain sharing
 */

import { cookies } from "next/headers";

const NAME = process.env.AUTH_COOKIE_NAME || "adatex_session";

/**
 * Reads the JWT from the session cookie.
 *
 * Must be called from a Next.js Server Component or Route Handler
 * (uses the `next/headers` cookies API).
 *
 * @returns {Promise<string|null>} The JWT string, or `null` if not present.
 */
export async function getTokenFromCookies() {
  const c = (await cookies()).get(NAME);
  return c?.value || null;
}

/**
 * Writes the JWT to the session cookie.
 *
 * Called after a successful Strapi login. The cookie is HttpOnly and
 * SameSite=lax by default to protect against CSRF attacks.
 *
 * @param {string} token - The Strapi JWT to persist.
 * @param {Object} [options]
 * @param {number} [options.maxAgeDays=7] - Cookie lifetime in days.
 * @returns {Promise<void>}
 */
export async function setSessionCookie(token, { maxAgeDays = 7 } = {}) {
  const c = await cookies();
  c.set(NAME, token, {
    httpOnly: true,
    secure: process.env.AUTH_COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * maxAgeDays,
    domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
  });
}

/**
 * Deletes the session cookie, effectively logging the user out.
 *
 * @returns {Promise<void>}
 */
export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(NAME);
}
