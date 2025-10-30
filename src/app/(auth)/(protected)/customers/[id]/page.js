"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import EntityForm from "@/components/entities/EntityForm";
import ConsignmentBalance from "@/components/customers/ConsignmentBalance";
import toast from "react-hot-toast";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useTaxes } from "@/lib/hooks/useTaxes";
import { createCustomerDetailConfig } from "@/lib/config/entityConfigs";
import { useTerritories } from "@/lib/hooks/useTerritories";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id;

  const { customers, loading, updateCustomer, updating, refetch } =
    useCustomers(
      {
        filters: { id: { $eq: customerId } },
        pagination: { page: 1, pageSize: 1 },
        populate: ["taxes", "parties", "prices", "prices.product", "territory"],
      },
      {
        onError: (err) => {
          console.error("Error loading customer:", err);
          toast.error("Error al cargar el cliente");
        },
        onUpdate: () => {
          refetch();
        },
      }
    );

  const { taxes } = useTaxes({});

  const customer = customers?.[0] || null;

  // Obtener taxes disponibles y mapearlos al formato esperado
  const availableTaxes = useMemo(() => {
    if (!taxes || taxes.length === 0) return [];
    return taxes.map((tax) => ({
      value: tax.id,
      label: `${tax.name}`,
    }));
  }, [taxes]);

  // Obtener parties disponibles (otros clientes)

  const { customers: allCustomers } = useCustomers({});
  const { territories = [] } = useTerritories({});

  const availableParties = useMemo(() => {
    if (!allCustomers) return [];
    // Filtrar el cliente actual de la lista de parties posibles
    return allCustomers
      .filter((c) => c.id != customerId)
      .map((c) => ({
        value: c.id,
        label: c.name,
      }));
  }, [allCustomers, customerId]);

  // Obtener configuración del formulario
  const formConfig = useMemo(
    () =>
      createCustomerDetailConfig({
        customerId,
        availableTaxes,
        availableParties,
        updateCustomer,
        router,
        updating,
        territories,
      }),
    [
      customerId,
      availableTaxes,
      availableParties,
      updateCustomer,
      router,
      updating,
    ]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Cargando cliente...</div>
      </div>
    );
  }

  console.log(customer, "FDFDFDFDF");

  return (
    <div className="space-y-6">
      {/* Formulario de Cliente */}
      <EntityForm
        config={formConfig}
        initialData={customer}
        backPath="/customers"
      />

      {/* Sección de Balance de Remisión */}
      <ConsignmentBalance customerId={parseInt(customerId)} />
    </div>
  );
}
