// src/app/api/auth/token/route.js
import { getTokenFromCookies } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const token = await getTokenFromCookies();
    if (!token) {
      return NextResponse.json({ error: "No authenticated" }, { status: 401 });
    }
    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json({ error: "Error getting token" }, { status: 500 });
  }
}
