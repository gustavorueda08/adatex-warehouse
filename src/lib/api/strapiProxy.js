/**
 * @fileoverview Shared Strapi proxy helpers for Next.js API routes.
 *
 * Every route under `/api/strapi/` follows the same pattern:
 *  1. Read the JWT from the session cookie.
 *  2. Build the target Strapi URL.
 *  3. Forward query-string params (for GETs) or a JSON body (for mutations).
 *  4. Add the Authorization header.
 *  5. Handle non-2xx responses and empty bodies (204 / content-length: 0).
 *  6. Return a NextResponse.
 *
 * The helpers in this module encapsulate that pattern so that each route
 * file only needs to describe *what* it proxies, not *how*.
 *
 * @example — simple GET + POST route
 * ```js
 * // src/app/api/strapi/orders/route.js
 * import { proxyGet, proxyPost } from "@/lib/api/strapiProxy";
 *
 * export const GET  = (req) => proxyGet(req,  "/api/orders");
 * export const POST = (req) => proxyPost(req, "/api/orders");
 * ```
 *
 * @example — GET that needs a custom success status code
 * ```js
 * export const POST = (req) => proxyPost(req, "/api/products", { successStatus: 201 });
 * ```
 */

import { getTokenFromCookies } from "@/lib/auth/session";
import { NextResponse } from "next/server";

const STRAPI_URL = process.env.STRAPI_URL;

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Returns the Authorization header object for a given JWT token.
 * @param {string} token
 * @returns {Object}
 */
function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Reads the session cookie and returns a 401 NextResponse if missing.
 * @returns {{ token: string }|{ error: NextResponse }}
 */
async function requireToken() {
  const token = await getTokenFromCookies();
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { token };
}

/**
 * Builds a full Strapi URL, optionally forwarding all search params from
 * the incoming Next.js request.
 *
 * @param {string} strapiPath - Path on the Strapi server, e.g. `"/api/orders"`.
 * @param {Request} [request] - If provided, its search params are copied over.
 * @returns {URL}
 */
function buildStrapiUrl(strapiPath, request) {
  const url = new URL(strapiPath, STRAPI_URL);
  if (request) {
    const { searchParams } = new URL(request.url);
    searchParams.forEach((value, key) => url.searchParams.append(key, value));
  }
  return url;
}

/**
 * Parses the Strapi response body, gracefully handling 204 and empty bodies.
 *
 * @param {Response} response - The raw fetch Response from Strapi.
 * @param {number|null} entityId - Optional ID used to synthesise a fallback body.
 * @returns {Promise<{ data: Object, empty: boolean }>}
 */
async function parseStrapiResponse(response, entityId = null) {
  if (
    response.status === 204 ||
    response.headers.get("content-length") === "0"
  ) {
    return {
      data: entityId ? { id: entityId, deletedAt: new Date().toISOString() } : {},
      empty: true,
    };
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {
      data: entityId ? { id: entityId, deletedAt: new Date().toISOString() } : {},
      empty: true,
    };
  }

  const text = await response.text();
  if (!text.trim()) {
    return {
      data: entityId ? { id: entityId, deletedAt: new Date().toISOString() } : {},
      empty: true,
    };
  }

  return { data: JSON.parse(text), empty: false };
}

/**
 * Returns a standardised error NextResponse from a failed Strapi response.
 *
 * @param {Response} response
 * @param {string} [context] - Short description of what failed (for the error message).
 * @returns {Promise<NextResponse>}
 */
async function errorResponse(response, context = "Strapi request") {
  const details = await response.text().catch(() => "");
  console.error(`[strapiProxy] ${context} failed:`, {
    status: response.status,
    statusText: response.statusText,
    details,
  });
  return NextResponse.json(
    { error: `Error en ${context}`, details, status: response.status },
    { status: response.status }
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Proxies a GET request to Strapi, forwarding all query-string parameters.
 *
 * @param {Request} request - Incoming Next.js request.
 * @param {string} strapiPath - Strapi path (e.g. `"/api/orders"`).
 * @param {Object} [options]
 * @param {number} [options.successStatus=200] - HTTP status for success.
 * @returns {Promise<NextResponse>}
 */
export async function proxyGet(request, strapiPath, { successStatus = 200 } = {}) {
  try {
    const { token, error } = await requireToken();
    if (error) return error;

    const url = buildStrapiUrl(strapiPath, request);
    const response = await fetch(url, {
      method: "GET",
      headers: authHeaders(token),
      cache: "no-store",
    });

    if (!response.ok) return errorResponse(response, strapiPath);

    const { data } = await parseStrapiResponse(response);
    return NextResponse.json(data, {
      status: successStatus,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    console.error("[strapiProxy] GET error:", err);
    return NextResponse.json({ error: "Error interno del servidor", message: err.message }, { status: 500 });
  }
}

/**
 * Proxies a POST request to Strapi, forwarding the JSON body as-is.
 *
 * @param {Request} request - Incoming Next.js request.
 * @param {string} strapiPath - Strapi path (e.g. `"/api/orders"`).
 * @param {Object} [options]
 * @param {number} [options.successStatus=201] - HTTP status for success.
 * @param {boolean} [options.requireDataWrapper=true] - If true, validates that `body.data` exists.
 * @returns {Promise<NextResponse>}
 */
export async function proxyPost(
  request,
  strapiPath,
  { successStatus = 201, requireDataWrapper = true } = {}
) {
  try {
    const { token, error } = await requireToken();
    if (error) return error;

    const body = await request.json().catch(() => null);
    if (requireDataWrapper && (!body || !body.data)) {
      return NextResponse.json(
        { error: "Datos inválidos. Se requiere un objeto 'data'" },
        { status: 400 }
      );
    }

    const url = buildStrapiUrl(strapiPath);
    const response = await fetch(url, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(body),
    });

    if (!response.ok) return errorResponse(response, strapiPath);

    const { data } = await parseStrapiResponse(response);
    return NextResponse.json(data, { status: successStatus });
  } catch (err) {
    console.error("[strapiProxy] POST error:", err);
    return NextResponse.json({ error: "Error interno del servidor", message: err.message }, { status: 500 });
  }
}

/**
 * Proxies a PUT request to Strapi.
 *
 * @param {Request} request - Incoming Next.js request.
 * @param {string} strapiPath - Strapi path including the entity ID.
 * @param {Object} [options]
 * @param {number} [options.successStatus=200]
 * @returns {Promise<NextResponse>}
 */
export async function proxyPut(request, strapiPath, { successStatus = 200 } = {}) {
  try {
    const { token, error } = await requireToken();
    if (error) return error;

    const body = await request.json().catch(() => null);
    if (!body?.data) {
      return NextResponse.json(
        { error: "Datos inválidos. Se requiere un objeto 'data'" },
        { status: 400 }
      );
    }

    const url = buildStrapiUrl(strapiPath);
    const response = await fetch(url, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(body),
    });

    if (!response.ok) return errorResponse(response, strapiPath);

    const { data } = await parseStrapiResponse(response);
    return NextResponse.json(data, { status: successStatus });
  } catch (err) {
    console.error("[strapiProxy] PUT error:", err);
    return NextResponse.json({ error: "Error interno del servidor", message: err.message }, { status: 500 });
  }
}

/**
 * Proxies a DELETE request to Strapi.
 *
 * Gracefully handles 204 No Content and empty-body responses, which Strapi
 * returns on successful deletes, by synthesising `{ data: { id, deletedAt } }`.
 *
 * @param {Request} request - Incoming Next.js request.
 * @param {string} strapiPath - Strapi path including the entity ID.
 * @param {number|string} [entityId] - Used to build the fallback body on 204.
 * @returns {Promise<NextResponse>}
 */
export async function proxyDelete(request, strapiPath, entityId) {
  try {
    const { token, error } = await requireToken();
    if (error) return error;

    const url = buildStrapiUrl(strapiPath);
    const response = await fetch(url, {
      method: "DELETE",
      headers: authHeaders(token),
    });

    if (!response.ok) return errorResponse(response, strapiPath);

    const { data } = await parseStrapiResponse(response, entityId ? Number(entityId) : null);
    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error("[strapiProxy] DELETE error:", err);
    return NextResponse.json({ error: "Error interno del servidor", message: err.message }, { status: 500 });
  }
}
