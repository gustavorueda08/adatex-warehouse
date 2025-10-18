import { getTokenFromCookies } from "@/lib/auth/session";
import { NextResponse } from "next/server";

const STRAPI_URL = process.env.STRAPI_URL;

/**
 * GET - Obtener el historial de remisión de un cliente
 */
export async function GET(request, context) {
  try {
    const token = await getTokenFromCookies();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Obtener el ID del cliente
    const { customerId } = await context.params;

    if (!customerId) {
      return NextResponse.json(
        { error: "ID de cliente requerido" },
        { status: 400 }
      );
    }

    // Obtener los parámetros de búsqueda de la URL
    const { searchParams } = new URL(request.url);

    // Construir la URL de Strapi
    const strapiUrl = new URL(
      `/api/customers/${customerId}/consignment-history`,
      STRAPI_URL.toString()
    );

    // Pasar todos los parámetros de búsqueda a Strapi
    searchParams.forEach((value, key) => {
      strapiUrl.searchParams.append(key, value);
    });

    console.log("Fetching consignment history:", strapiUrl.toString());

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
          error: "Error al obtener el historial de remisión de Strapi",
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
