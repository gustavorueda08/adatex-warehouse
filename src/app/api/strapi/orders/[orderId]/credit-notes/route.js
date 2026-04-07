import { getTokenFromCookies } from "@/lib/auth/session";
import { NextResponse } from "next/server";
const STRAPI_URL = process.env.STRAPI_URL;

export async function GET(request, context) {
  try {
    const token = await getTokenFromCookies();
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const { orderId } = await context.params;

    if (!orderId) {
      return NextResponse.json(
        { error: "ID de orden requerido" },
        { status: 400 }
      );
    }

    const strapiUrl = new URL(
      `/api/orders/${orderId}/credit-notes`,
      STRAPI_URL.toString()
    );
    searchParams.forEach((value, key) => {
      strapiUrl.searchParams.append(key, value);
    });

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const response = await fetch(strapiUrl.toString(), {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Strapi Error (credit-notes):", {
        status: response.status,
        error: errorText,
      });
      return NextResponse.json(
        { error: "Error al obtener datos de Strapi", details: errorText },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    if (isJson) {
      const data = await response.json();
      return NextResponse.json(data, { status: 200 });
    } else {
      // Archivo PDF o ZIP
      const resHeaders = new Headers();
      resHeaders.set("Content-Type", contentType);
      resHeaders.set("Cache-Control", "no-store, max-age=0");
      const contentDisposition = response.headers.get("content-disposition");
      if (contentDisposition) {
        resHeaders.set("Content-Disposition", contentDisposition);
      }
      return new NextResponse(response.body, {
        status: 200,
        headers: resHeaders,
      });
    }
  } catch (error) {
    console.error("API Route Error (credit-notes):", error);
    return NextResponse.json(
      { error: "Error interno del servidor", message: error.message },
      { status: 500 }
    );
  }
}
