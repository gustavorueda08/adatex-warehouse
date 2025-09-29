import { cookies } from "next/headers";

const NAME = process.env.AUTH_COOKIE_NAME || "adatex_session";

export async function getTokenFromCookies() {
  const c = (await cookies()).get(NAME);
  return c?.value || null;
}

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

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(NAME);
}
