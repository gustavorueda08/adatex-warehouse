import { NextResponse } from "next/server";
import { httpFetch, ApiError } from "@/lib/api/http";
import { strapiUrl, jsonHeaders } from "@/lib/api/strapiClient";
import { setSessionCookie } from "@/lib/auth/session";

export async function POST(req) {
  const { identifier, password } = await req.json();
  try {
    const data = await httpFetch(strapiUrl("/api/auth/local"), {
      method: "POST",
      headers: jsonHeaders(),
      body: { identifier, password },
      nextOpts: { cache: "no-store" },
    });
    // Strapi responde: { jwt, user }
    setSessionCookie(data.jwt);
    return NextResponse.json({ user: data.user });
  } catch (e) {
    const status = e instanceof ApiError && e.status ? e.status : 500;
    return NextResponse.json({ error: e.message, details: e.data }, { status });
  }
}
