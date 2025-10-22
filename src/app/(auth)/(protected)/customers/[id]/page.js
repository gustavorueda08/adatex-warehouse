"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import EntityForm from "@/components/entities/EntityForm";
import ConsignmentBalance from "@/components/customers/ConsignmentBalance";
import toast from "react-hot-toast";
import { useCustomers } from "@/lib/hooks/useCustomers";
import {
  UserIcon,
  ReceiptPercentIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id;

  const [showBalance, setShowBalance] = useState(false);

  // Usar useCustomers con filtro por ID y populate para relaciones
  const { customers, loading, updateCustomer, updating } = useCustomers(
    {
      filters: { id: { $eq: customerId } },
      pagination: { page: 1, pageSize: 1 },
      populate: ["taxes", "parties", "prices"],
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

  // TODO: Obtener taxes disponibles desde un hook/API cuando exista
  // Por ahora usamos un array de ejemplo
  const availableTaxes = useMemo(
    () => [
      { value: 1, label: "IVA - 19%" },
      { value: 2, label: "Retefuente - 2.5%" },
      { value: 3, label: "ICA - 0.77%" },
      { value: 4, label: "IVA - 5%" },
    ],
    []
  );

  // TODO: Obtener parties disponibles desde un hook/API cuando exista
  // Por ahora usamos los clientes existentes como ejemplo
  const { customers: allCustomers } = useCustomers({
    pagination: { page: 1, pageSize: 100 },
  });

  const availableParties = useMemo(() => {
    if (!allCustomers) return [];
    // Filtrar el cliente actual de la lista de parties posibles
    return allCustomers
      .filter((c) => c.id !== parseInt(customerId))
      .map((c) => ({
        value: c.id,
        label: c.name,
      }));
  }, [allCustomers, customerId]);

  // Configuración de campos organizados en secciones
  const fieldSections = [
    {
      title: "Información Básica",
      description: "Datos generales del cliente",
      icon: UserIcon,
      fields: [
        {
          name: "name",
          label: "Nombre",
          type: "text",
          required: true,
          placeholder: "Nombre del cliente",
        },
        {
          name: "nit",
          label: "NIT",
          type: "text",
          required: false,
          placeholder: "123456789-0",
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
          name: "address",
          label: "Dirección",
          type: "textarea",
          required: false,
          placeholder: "Dirección completa del cliente",
          rows: 3,
          fullWidth: true,
        },
      ],
    },
    {
      title: "Impuestos",
      description: "Configuración de impuestos aplicables al cliente",
      icon: ReceiptPercentIcon,
      fields: [
        {
          name: "taxes",
          label: "Impuestos Asociados",
          type: "multi-select",
          required: false,
          searchable: true,
          clearable: true,
          options: availableTaxes,
          placeholder: "Seleccionar impuestos...",
          emptyMessage: "No hay impuestos disponibles",
          fullWidth: true,
          // hasMenu: true,
          // menuTitle: "Nuevo impuesto",
          // onClickMenu: () => {
          //   // TODO: Abrir modal para crear nuevo impuesto
          //   toast.error("Función de crear impuesto no implementada aún");
          // },
        },
      ],
    },
    {
      title: "Partes Asociadas",
      description:
        "Entidades relacionadas que pueden recibir facturas para este cliente",
      icon: UserGroupIcon,
      fields: [
        {
          name: "parties",
          label: "Partes para Facturación",
          type: "multi-select",
          required: false,
          searchable: true,
          clearable: true,
          options: availableParties,
          placeholder: "Seleccionar partes...",
          emptyMessage: "No hay partes disponibles",
          fullWidth: true,
          // hasMenu: true,
          // menuTitle: "Nueva parte",
          // onClickMenu: () => {
          //   // TODO: Abrir modal para crear nueva parte
          //   toast.error("Función de crear parte no implementada aún");
          // },
        },
      ],
    },
  ];

  const handleSubmit = async (formData) => {
    // Preparar datos para enviar al backend
    const dataToSubmit = {
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      nit: formData.nit || null,
      address: formData.address || null,
      // Enviar solo los IDs para las relaciones
      taxes: formData.taxes || [],
      parties: formData.parties || [],
    };

    const result = await updateCustomer(customerId, dataToSubmit);

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
        description="Actualiza la información del cliente, sus impuestos y partes asociadas"
        entityType="customer"
        initialData={customer}
        fields={fieldSections}
        sectioned={true}
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
