import { getTokenFromCookies } from "@/lib/auth/session";
import { NextResponse } from "next/server";

const STRAPI_URL = process.env.STRAPI_URL;

export async function POST(request, { params }) {
  try {
    const token = await getTokenFromCookies();
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orderId } = await params;

    const response = await fetch(
      new URL(`/api/orders/${orderId}/purchase-invoice`, STRAPI_URL).toString(),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: "{}",
      }
    );

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.ok ? 200 : response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Error interno del servidor", message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const token = await getTokenFromCookies();
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orderId } = await params;

    const response = await fetch(
      new URL(`/api/orders/${orderId}/purchase-invoice`, STRAPI_URL).toString(),
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: "{}",
      }
    );

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.ok ? 200 : response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Error interno del servidor", message: error.message },
      { status: 500 }
    );
  }
}
