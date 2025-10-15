"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import EntityForm from "@/components/entities/EntityForm";
import ConsignmentBalance from "@/components/customers/ConsignmentBalance";
import toast from "react-hot-toast";
import { useCustomers } from "@/lib/hooks/useCustomers";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id;

  const [showBalance, setShowBalance] = useState(false);

  // Usar useCustomers con filtro por ID
  const {
    customers,
    loading,
    updateCustomer,
    updating,
  } = useCustomers(
    {
      filters: { id: { $eq: customerId } },
      pagination: { page: 1, pageSize: 1 },
    },
    {
      onError: (err) => {
        console.error("Error loading customer:", err);
        toast.error("Error al cargar el cliente");
        router.push("/customers");
      },
    }
  );

  const customer = customers?.[0] || null;

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
    const result = await updateCustomer(customerId, formData);

    if (result.success) {
      toast.success("Cliente actualizado exitosamente");
      router.push("/customers");
    } else {
      console.error("Error updating customer:", result.error);
      throw result.error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Cargando cliente...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formulario de Cliente */}
      <EntityForm
        title="Editar Cliente"
        initialData={customer}
        fields={fields}
        onSubmit={handleSubmit}
        backPath="/customers"
        loading={updating}
      />

      {/* Sección de Balance de Remisión */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Balance de Remisión</h2>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="text-cyan-400 hover:underline text-sm"
          >
            {showBalance ? "Ocultar" : "Mostrar"} balance
          </button>
        </div>

        {showBalance && (
          <ConsignmentBalance
            customerId={parseInt(customerId)}
            customerName={customer?.name}
          />
        )}
      </div>
    </div>
  );
}
