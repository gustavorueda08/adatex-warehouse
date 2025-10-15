"use client";

import { useRouter } from "next/navigation";
import EntityForm from "@/components/entities/EntityForm";
import toast from "react-hot-toast";

export default function NewSellerPage() {
  const router = useRouter();

  const fields = [
    {
      name: "name",
      label: "Nombre",
      type: "text",
      required: true,
      placeholder: "Nombre del vendedor",
    },
    {
      name: "email",
      label: "Email",
      type: "email",
      required: false,
      placeholder: "correo@ejemplo.com",
    },
    {
      name: "phone",
      label: "Teléfono",
      type: "text",
      required: false,
      placeholder: "+57 300 123 4567",
    },
    {
      name: "nit",
      label: "NIT",
      type: "text",
      required: false,
      placeholder: "123456789-0",
    },
    {
      name: "address",
      label: "Dirección",
      type: "textarea",
      required: false,
      placeholder: "Dirección completa del vendedor",
      rows: 3,
    },
  ];

  const handleSubmit = async (formData) => {
    try {
      const response = await fetch("/api/strapi/sellers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: formData }),
      });

      if (!response.ok) {
        throw new Error("Error al crear el vendedor");
      }

      toast.success("Vendedor creado exitosamente");
      router.push("/sellers");
    } catch (error) {
      console.error("Error creating seller:", error);
      throw error;
    }
  };

  return (
    <EntityForm
      title="Crear Nuevo Vendedor"
      fields={fields}
      onSubmit={handleSubmit}
      backPath="/sellers"
    />
  );
}
