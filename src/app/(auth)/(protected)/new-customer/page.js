"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EntityForm from "@/components/entities/EntityForm";
import { createCustomerFormConfig } from "@/lib/config/entityConfigs";
import toast from "react-hot-toast";

/**
 * EJEMPLO DE USO DEL NUEVO SISTEMA
 *
 * Este archivo muestra cómo usar EntityForm con las configuraciones
 * del archivo entityConfigs.js
 *
 * Ventajas:
 * - Configuración centralizada y reutilizable
 * - Separación de lógica de UI y configuración
 * - Más fácil de mantener y escalar
 */
export default function NewCustomerPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (formData) => {
    try {
      setCreating(true);

      const response = await fetch("/api/strapi/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: formData }),
      });

      if (!response.ok) {
        throw new Error("Error al crear el cliente");
      }

      toast.success("Cliente creado exitosamente");
      router.push("/customers");
    } catch (error) {
      console.error("Error creating customer:", error);
      throw error;
    } finally {
      setCreating(false);
    }
  };

  // Crear la configuración para el formulario de cliente
  const config = createCustomerFormConfig({
    onSubmit: handleSubmit,
    loading: creating,
  });

  return <EntityForm config={config} backPath="/customers" />;
}
