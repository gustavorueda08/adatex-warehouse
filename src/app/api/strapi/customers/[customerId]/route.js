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
    const { customerId } = await context.params;

    if (!customerId) {
      return NextResponse.json(
        { error: "ID del customer requerido" },
        { status: 400 }
      );
    }

    // Obtener el body de la petición
    const body = await request.json();

    if (!body || !body.data) {
      return NextResponse.json(
        {
          error: "Datos del customer requeridos. Se requiere un objeto 'data'",
        },
        { status: 400 }
      );
    }

    // Construir la URL de Strapi
    const strapiUrl = new URL(
      `/api/customers/${customerId}`,
      STRAPI_URL.toString()
    );

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
      console.error("Strapi Error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: strapiUrl.toString(),
      });

      return NextResponse.json(
        {
          error: "Error al actualizar el customer en Strapi",
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

    return NextResponse.json(data, { status: 200 });
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
    const { customerId } = await context.params;

    if (!customerId) {
      return NextResponse.json(
        { error: "ID de cliente requerido" },
        { status: 400 }
      );
    }

    // Construir la URL de Strapi
    const strapiUrl = new URL(
      `/api/customers/${customerId}`,
      STRAPI_URL.toString()
    );

    console.log(
      `🗑️ Attempting to DELETE customer ${customerId} from:`,
      strapiUrl.toString()
    );

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

    console.log(`📬 DELETE Response:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
    });

    // Verificar si el customer realmente se eliminó
    if (response.ok) {
      // Intentar hacer un GET para verificar si el customer aún existe
      setTimeout(async () => {
        try {
          const verifyResponse = await fetch(strapiUrl.toString(), {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (verifyResponse.ok) {
            console.log(
              `⚠️ WARNING: Customer ${customerId} STILL EXISTS after DELETE!`
            );
          } else if (verifyResponse.status === 404) {
            console.log(
              `✅ VERIFIED: Customer ${customerId} was successfully deleted`
            );
          } else {
            console.log(
              `❓ Unable to verify deletion, status: ${verifyResponse.status}`
            );
          }
        } catch (err) {
          console.log(`❌ Error verifying deletion:`, err.message);
        }
      }, 500);
    }

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
          error: "Error al eliminar el customer en Strapi",
          details: errorText,
          status: response.status,
        },
        { status: response.status }
      );
    }
    // Manejar respuesta vacía (HTTP 204 o sin contenido)
    if (
      response.status === 204 ||
      response.headers.get("content-length") === "0"
    ) {
      console.log(
        `✅ Customer ${customerId} deleted successfully (204 No Content)`
      );
      return NextResponse.json(
        {
          data: {
            id: parseInt(customerId),
            deletedAt: new Date().toISOString(),
          },
        },
        { status: 200 }
      );
    }

    // Intentar parsear JSON solo si hay contenido
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const text = await response.text();
      if (text.trim().length === 0) {
        console.log(
          `✅ Customer ${customerId} deleted successfully (empty JSON)`
        );
        return NextResponse.json(
          {
            data: {
              id: parseInt(customerId),
              deletedAt: new Date().toISOString(),
            },
          },
          { status: 200 }
        );
      }

      const data = JSON.parse(text);
      console.log(`✅ Customer ${customerId} deleted, Strapi response:`, data);

      // Validar estructura de respuesta
      if (!data || typeof data !== "object") {
        return NextResponse.json(
          { error: "Respuesta inválida de Strapi" },
          { status: 500 }
        );
      }

      return NextResponse.json(data, { status: 200 });
    }

    // Si no es JSON, asumir éxito
    console.log(
      `✅ Customer ${customerId} deleted successfully (non-JSON response)`
    );
    return NextResponse.json(
      {
        data: {
          id: parseInt(customerId),
          deletedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
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
