"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/lib/hooks/useUser";
import Card, {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import icon from "../../../../public/icon-white.png";
import Image from "next/image";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  const { setUser } = useUser();

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
        router.replace(next);
      } else {
        setErr("Credenciales inválidas");
        setLoading(false);
      }
    } catch (error) {
      setErr("Error al iniciar sesión");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
      {/* Efectos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="border-zinc-700/50 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2">
            {/* Logo o Icono */}
            <div className="mx-auto w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-2 p-2">
              <Image src={icon} alt="Icon" objectFit="contain" priority />
            </div>
            <CardTitle className="text-2xl">Bienvenido</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para continuar
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              {/* Email/Usuario */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Email o Usuario
                </label>
                <input
                  type="text"
                  className="bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm rounded-md block w-full p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
                  placeholder="usuario@ejemplo.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Contraseña */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Contraseña
                </label>
                <input
                  type="password"
                  className="bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm rounded-md block w-full p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Error */}
              {err && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
                  <p className="text-sm text-red-400 text-center">{err}</p>
                </div>
              )}

              {/* Botón */}
              <Button
                type="submit"
                variant="cyan"
                fullWidth
                loading={loading}
                className="mt-6 text-white font-medium"
              >
                {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Gestión de Inventario y Almacén
        </p>
      </div>
    </div>
  );
}
