"use client";

import { useRouter } from "next/navigation";
import EntityForm from "@/components/entities/EntityForm";
import toast from "react-hot-toast";

export default function NewSupplierPage() {
  const router = useRouter();

  const fields = [
    {
      name: "name",
      label: "Nombre",
      type: "text",
      required: true,
      placeholder: "Nombre del proveedor",
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
      placeholder: "Dirección completa del proveedor",
      rows: 3,
    },
  ];

  const handleSubmit = async (formData) => {
    try {
      const response = await fetch("/api/strapi/suppliers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: formData }),
      });

      if (!response.ok) {
        throw new Error("Error al crear el proveedor");
      }

      toast.success("Proveedor creado exitosamente");
      router.push("/suppliers");
    } catch (error) {
      console.error("Error creating supplier:", error);
      throw error;
    }
  };

  return (
    <EntityForm
      title="Crear Nuevo Proveedor"
      fields={fields}
      onSubmit={handleSubmit}
      backPath="/suppliers"
    />
  );
}
