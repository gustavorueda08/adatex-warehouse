import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth/session";
const STRAPI_URL = process.env.STRAPI_URL;

export async function POST(request) {
  try {
    // Obtener el body de la petición
    const body = await request.json();

    // Validar que se envió data
    if (!body || !body.identifier || !body.password) {
      return NextResponse.json(
        { error: "Datos inválidos. Se requiere un objeto 'data'" },
        { status: 400 }
      );
    }

    // Construir la URL de Strapi
    const strapiUrl = new URL("/api/auth/local", STRAPI_URL.toString());
    console.log("PASO");
    // Configurar headers para la petición a Strapi
    const headers = {
      "Content-Type": "application/json",
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
          error: "Error autenticar el usuario",
          details: errorText,
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(data);

    // Validar estructura de respuesta
    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "Respuesta inválida de Strapi" },
        { status: 500 }
      );
    }
    await setSessionCookie(data.jwt);

    // Fetch user with seller populate
    const userRes = await fetch(
      `${STRAPI_URL}/api/users/me?populate=seller`,
      {
        headers: {
          Authorization: `Bearer ${data.jwt}`,
        },
      }
    );

    if (userRes.ok) {
      const userData = await userRes.json();
      return NextResponse.json({ ...data, user: userData }, { status: 200 });
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
