/**
 * Catch-all proxy for the Python demand-forecast API (adatex-forecast-api).
 *
 * Pattern mirrors the Strapi proxy: the user must be authenticated (session
 * cookie checked), and the request is forwarded to the Python service with
 * the X-API-Key header.
 *
 * Frontend calls:  GET  /api/forecast/purchase-suggestions
 *                  GET  /api/forecast/products/:id
 *                  GET  /api/forecast/customers/:id
 *                  GET  /api/forecast/abc-xyz
 *                  POST /api/forecast/refresh-cache
 *
 * All query-string params are forwarded as-is.
 */

import { getTokenFromCookies } from "@/lib/auth/session";
import { NextResponse } from "next/server";

const FORECAST_API_URL = (process.env.FORECAST_API_URL || "http://localhost:8000").replace(/\/$/, "");
const FORECAST_API_KEY = process.env.FORECAST_API_KEY || "";

function forecastHeaders() {
  return {
    "Content-Type": "application/json",
    "X-API-Key": FORECAST_API_KEY,
  };
}

async function requireSession() {
  const token = await getTokenFromCookies();
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true };
}

function buildForecastUrl(pathSegments, request) {
  const path = pathSegments.join("/");
  const url = new URL(`${FORECAST_API_URL}/forecasts/${path}`);
  const { searchParams } = new URL(request.url);
  searchParams.forEach((value, key) => url.searchParams.append(key, value));
  return url;
}

async function handleError(response, path) {
  const details = await response.text().catch(() => "");
  console.error(`[forecastProxy] ${path} failed:`, {
    status: response.status,
    details,
  });
  return NextResponse.json(
    { error: "Error en forecast API", details, status: response.status },
    { status: response.status }
  );
}

export async function GET(request, { params }) {
  const { error } = await requireSession();
  if (error) return error;

  const pathSegments = (await params).path;
  const url = buildForecastUrl(pathSegments, request);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: forecastHeaders(),
      cache: "no-store",
    });

    if (!response.ok) return handleError(response, pathSegments.join("/"));

    const data = await response.json();
    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    console.error("[forecastProxy] GET error:", err);
    if (err.cause?.code === "ECONNREFUSED") {
      return NextResponse.json(
        { error: "El servicio de predicción no está disponible", code: "FORECAST_UNAVAILABLE" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Error interno", message: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { error } = await requireSession();
  if (error) return error;

  const pathSegments = (await params).path;
  const url = buildForecastUrl(pathSegments, request);
  const body = await request.json().catch(() => null);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: forecastHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) return handleError(response, pathSegments.join("/"));

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("[forecastProxy] POST error:", err);
    if (err.cause?.code === "ECONNREFUSED") {
      return NextResponse.json(
        { error: "El servicio de predicción no está disponible", code: "FORECAST_UNAVAILABLE" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Error interno", message: err.message }, { status: 500 });
  }
}
