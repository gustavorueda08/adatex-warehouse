import { getTokenFromCookies } from "@/lib/auth/session";
import { NextResponse } from "next/server";

const STRAPI_URL = process.env.STRAPI_URL;

/**
 * GET /api/strapi/inventory-movement/kardex?year=YYYY[&productId=ID]
 *
 * Proxies the Kardex JSON preview from Strapi, enforcing the session cookie.
 */
export async function GET(request) {
  try {
    const token = await getTokenFromCookies();
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const url = new URL("/api/inventory-movements/kardex", STRAPI_URL);
    searchParams.forEach((value, key) => url.searchParams.append(key, value));

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[kardex preview] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
