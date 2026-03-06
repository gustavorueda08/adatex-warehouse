import { getTokenFromCookies } from "@/lib/auth/session";
import { NextResponse } from "next/server";
const STRAPI_URL = process.env.STRAPI_URL;

export async function DELETE(request) {
  try {
    const token = await getTokenFromCookies();
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Construir la URL de Strapi
    const strapiUrl = new URL(
      "/api/products/cut-items",
      STRAPI_URL.toString(),
    );

    // Configurar headers para la petición a Strapi
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    // Realizar la petición DELETE a Strapi
    const response = await fetch(strapiUrl.toString(), {
      method: "DELETE",
      headers,
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
          error: "Error al eliminar productos masivos en Strapi",
          details: errorText,
          status: response.status,
        },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Validar estructura de respuesta
    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "Respuesta inválida de Strapi" },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error.message,
      },
      { status: 500 },
    );
  }
}
