import { getTokenFromCookies } from "@/lib/auth/session";
import { NextResponse } from "next/server";
const STRAPI_URL = process.env.STRAPI_URL;

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
    const strapiUrl = new URL(
      "/api/products/bulk-upsert",
      STRAPI_URL.toString()
    );

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
          error: "Error al enviar productos masivos en Strapi",
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
