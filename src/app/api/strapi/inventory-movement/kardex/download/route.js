import { getTokenFromCookies } from "@/lib/auth/session";
import { NextResponse } from "next/server";

const STRAPI_URL = process.env.STRAPI_URL;

/**
 * GET /api/strapi/inventory-movement/kardex/download?year=YYYY[&productId=ID]
 *
 * Proxies the Kardex .xlsx binary from Strapi, enforcing the session cookie.
 */
export async function GET(request) {
  try {
    const token = await getTokenFromCookies();
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const url = new URL(
      "/api/inventory-movements/kardex/download",
      STRAPI_URL
    );
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

    const buffer = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const contentDisposition =
      response.headers.get("content-disposition") || "attachment";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[kardex download] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
