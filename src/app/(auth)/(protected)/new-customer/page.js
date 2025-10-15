"use client";

import { useRouter } from "next/navigation";
import EntityForm from "@/components/entities/EntityForm";
import toast from "react-hot-toast";

export default function NewCustomerPage() {
  const router = useRouter();

  const fields = [
    {
      name: "name",
      label: "Nombre",
      type: "text",
      required: true,
      placeholder: "Nombre del cliente",
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
      placeholder: "Dirección completa del cliente",
      rows: 3,
    },
  ];

  const handleSubmit = async (formData) => {
    try {
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
    }
  };

  return (
    <EntityForm
      title="Crear Nuevo Cliente"
      fields={fields}
      onSubmit={handleSubmit}
      backPath="/customers"
    />
  );
}
