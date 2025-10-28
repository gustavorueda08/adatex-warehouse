"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EntityForm from "@/components/entities/EntityForm";
import { createCustomerFormConfig } from "@/lib/config/entityConfigs";
import toast from "react-hot-toast";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useTerritories } from "@/lib/hooks/useTerritories";

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
  const { createCustomer, creating } = useCustomers(
    {},
    {
      enabled: false,
      onCreate: (createdCustomer) => {
        console.log("Cliente creado exitosamente:", createdCustomer);
        router.push(`/customers/${createdCustomer.id}`);
      },
    }
  );
  const [selectedTerritory, setSelectedTerritory] = useState(null);

  const { territories } = useTerritories();

  console.log(territories);

  // Crear la configuración para el formulario de cliente
  const config = createCustomerFormConfig({
    onSubmit: createCustomer,
    loading: creating,
    territories: territories || [],
    selectedTerritory,
    setSelectedTerritory,
  });

  return <EntityForm config={config} backPath="/customers" />;
}
