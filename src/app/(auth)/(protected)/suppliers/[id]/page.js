"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import EntityForm from "@/components/entities/EntityForm";
import toast from "react-hot-toast";

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.id;

  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const response = await fetch(`/api/strapi/suppliers/${supplierId}`);
        if (!response.ok) {
          throw new Error("Error al cargar el proveedor");
        }
        const result = await response.json();
        setSupplier(result.data);
      } catch (error) {
        console.error("Error fetching supplier:", error);
        toast.error("Error al cargar el proveedor");
        router.push("/suppliers");
      } finally {
        setLoading(false);
      }
    };

    if (supplierId) {
      fetchSupplier();
    }
  }, [supplierId, router]);

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
      const response = await fetch(`/api/strapi/suppliers/${supplierId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: formData }),
      });

      if (!response.ok) {
        throw new Error("Error al actualizar el proveedor");
      }

      toast.success("Proveedor actualizado exitosamente");
      router.push("/suppliers");
    } catch (error) {
      console.error("Error updating supplier:", error);
      throw error;
    }
  };

  return (
    <EntityForm
      title="Editar Proveedor"
      initialData={supplier}
      fields={fields}
      onSubmit={handleSubmit}
      backPath="/suppliers"
      loading={loading}
    />
  );
}
