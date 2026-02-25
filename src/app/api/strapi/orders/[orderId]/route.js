import { getTokenFromCookies } from "@/lib/auth/session";
import { NextResponse } from "next/server";

const STRAPI_URL = process.env.STRAPI_URL;

/**
 * PUT - Actualizar una orden específica
 */
export async function PUT(request, context) {
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
        { status: 400 },
      );
    }

    // Obtener el body de la petición
    const body = await request.json();

    if (!body || !body.data) {
      return NextResponse.json(
        { error: "Datos de orden requeridos. Se requiere un objeto 'data'" },
        { status: 400 },
      );
    }

    console.log(body);

    // Construir la URL de Strapi
    const strapiUrl = new URL(`/api/orders/${orderId}`, STRAPI_URL.toString());

    // Configurar headers
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    // Realizar la petición PUT a Strapi
    const response = await fetch(strapiUrl.toString(), {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedError;
      try {
        parsedError = JSON.parse(errorText);
      } catch (e) {
        parsedError = { error: { message: errorText } };
      }
      console.error("Strapi Error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: strapiUrl.toString(),
      });

      return NextResponse.json(
        {
          error: parsedError.error || {
            message: "Error al actualizar la orden en Strapi",
          },
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

/**
 * DELETE - Eliminar una orden específica
 */
export async function DELETE(request, context) {
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
        { status: 400 },
      );
    }

    // Construir la URL de Strapi
    const strapiUrl = new URL(`/api/orders/${orderId}`, STRAPI_URL.toString());

    // Configurar headers
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
      let parsedError;
      try {
        parsedError = JSON.parse(errorText);
      } catch (e) {
        parsedError = { error: { message: errorText } };
      }
      console.error("Strapi Error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: strapiUrl.toString(),
      });

      return NextResponse.json(
        {
          error: parsedError.error || {
            message: "Error al eliminar la orden en Strapi",
          },
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
