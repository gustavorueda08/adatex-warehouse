import { getTokenFromCookies } from "@/lib/auth/session";
import { NextResponse } from "next/server";

const STRAPI_URL = process.env.STRAPI_URL;

/**
 * GET - Obtener items facturables de una orden específica
 */
export async function GET(request, context) {
  try {
    const token = await getTokenFromCookies();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Obtener el ID de la orden
    const { orderId } = await context.params;

    if (!orderId) {
      return NextResponse.json(
        { error: "ID de orden requerido" },
        { status: 400 }
      );
    }

    // Construir la URL de Strapi
    const strapiUrl = new URL(
      `/api/orders/${orderId}/invoiceable-items`,
      STRAPI_URL.toString()
    );

    console.log("Fetching invoiceable items:", strapiUrl.toString());

    // Configurar headers
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    // Realizar la petición GET a Strapi
    const response = await fetch(strapiUrl.toString(), {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Strapi Error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: strapiUrl.toString(),
      });

      return NextResponse.json(
        {
          error: "Error al obtener items facturables de Strapi",
          details: errorText,
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Validar estructura de respuesta
    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "Respuesta inválida de Strapi" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
