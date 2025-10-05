import { getTokenFromCookies } from "@/lib/auth/session";
import { NextResponse } from "next/server";
const STRAPI_URL = process.env.STRAPI_URL;

export async function GET(request) {
  try {
    const token = await getTokenFromCookies();
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Obtener los parámetros de búsqueda de la URL
    const { searchParams } = new URL(request.url);

    // Construir la URL de Strapi
    const strapiUrl = new URL("/api/orders", STRAPI_URL.toString());

    // Pasar todos los parámetros de búsqueda a Strapi
    searchParams.forEach((value, key) => {
      strapiUrl.searchParams.append(key, value);
    });

    console.log(strapiUrl.toString());

    // Configurar headers para la petición a Strapi
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    // Realizar la petición a Strapi
    const response = await fetch(strapiUrl.toString(), {
      method: "GET",
      headers,
      cache: "no-store", // Evitar cache para datos en tiempo real
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
          error: "Error al obtener datos de Strapi",
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
    // Añadir headers de cache si es necesario
    const responseHeaders = {
      "Cache-Control": "no-store, max-age=0",
    };
    return NextResponse.json(data, {
      status: 200,
      headers: responseHeaders,
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

export async function POST(request) {
  try {
    const token = await getTokenFromCookies();
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Obtener el body de la petición
    const body = await request.json();

    // Validar que se envió data
    if (!body || !body.data) {
      return NextResponse.json(
        { error: "Datos inválidos. Se requiere un objeto 'data'" },
        { status: 400 }
      );
    }

    // Construir la URL de Strapi
    const strapiUrl = new URL("/api/orders", STRAPI_URL.toString());

    // Configurar headers para la petición a Strapi
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    // Realizar la petición POST a Strapi
    const response = await fetch(strapiUrl.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
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
          error: "Error al crear la orden en Strapi",
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

    return NextResponse.json(data, { status: 201 });
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
