import { getTokenFromCookies } from "@/lib/auth/session";
import { NextResponse } from "next/server";
const STRAPI_URL = process.env.STRAPI_URL;

export async function GET(request, context) {
  try {
    const token = await getTokenFromCookies();
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Obtener los parámetros de búsqueda de la URL
    const { searchParams } = new URL(request.url);

    // Obtener el ID de la orden
    const { productId } = await context.params;

    if (!productId) {
      return NextResponse.json(
        { error: "ID de producto requerido" },
        { status: 400 }
      );
    }

    // Construir la URL de Strapi
    const strapiUrl = new URL(
      `/api/products/${productId}/items`,
      STRAPI_URL.toString()
    );

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

    // Verificar tipo de contenido
    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    if (isJson) {
      const data = await response.json();
      // Validar estructura de respuesta
      if (!data || typeof data !== "object") {
        return NextResponse.json(
          { error: "Respuesta inválida de Strapi" },
          { status: 500 }
        );
      }
      return NextResponse.json(data, { status: 200 });
    } else {
      // Es un archivo (PDF o ZIP)
      // Headers para pasar al cliente
      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Cache-Control", "no-store, max-age=0");

      const contentDisposition = response.headers.get("content-disposition");
      if (contentDisposition) {
        headers.set("Content-Disposition", contentDisposition);
      }

      return new NextResponse(response.body, {
        status: 200,
        statusText: "OK",
        headers,
      });
    }
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
