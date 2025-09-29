import { NextResponse } from "next/server";
import { httpFetch, ApiError } from "@/lib/api/http";
import { strapiUrl } from "@/lib/api/strapiClient";
import { getTokenFromCookies } from "@/lib/auth/session";

export async function GET() {
  const token = await getTokenFromCookies();
  if (!token)
    return NextResponse.json({ authenticated: false }, { status: 401 });
  try {
    const me = await httpFetch(strapiUrl("/api/users/me"), {
      headers: { Authorization: `Bearer ${token}` },
      nextOpts: { cache: "no-store" },
    });
    return NextResponse.json({ authenticated: true, user: me });
  } catch (e) {
    const status = e instanceof ApiError && e.status ? e.status : 500;
    return NextResponse.json(
      { authenticated: false, error: e.message },
      { status }
    );
  }
}
