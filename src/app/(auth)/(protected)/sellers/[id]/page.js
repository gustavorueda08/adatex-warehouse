"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import EntityForm from "@/components/entities/EntityForm";
import toast from "react-hot-toast";

export default function SellerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sellerId = params.id;

  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSeller = async () => {
      try {
        const response = await fetch(`/api/strapi/sellers/${sellerId}`);
        if (!response.ok) {
          throw new Error("Error al cargar el vendedor");
        }
        const result = await response.json();
        setSeller(result.data);
      } catch (error) {
        console.error("Error fetching seller:", error);
        toast.error("Error al cargar el vendedor");
        router.push("/sellers");
      } finally {
        setLoading(false);
      }
    };

    if (sellerId) {
      fetchSeller();
    }
  }, [sellerId, router]);

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
      const response = await fetch(`/api/strapi/sellers/${sellerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: formData }),
      });

      if (!response.ok) {
        throw new Error("Error al actualizar el vendedor");
      }

      toast.success("Vendedor actualizado exitosamente");
      router.push("/sellers");
    } catch (error) {
      console.error("Error updating seller:", error);
      throw error;
    }
  };

  return (
    <EntityForm
      title="Editar Vendedor"
      initialData={seller}
      fields={fields}
      onSubmit={handleSubmit}
      backPath="/sellers"
      loading={loading}
    />
  );
}
