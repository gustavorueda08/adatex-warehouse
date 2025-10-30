"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import EntityForm from "@/components/entities/EntityForm";
import toast from "react-hot-toast";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { createSupplierDetailConfig } from "@/lib/config/entityConfigs";

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.id;

  // Fetch supplier con prices populated
  const {
    data: supplier,
    isLoading,
    update: updateSupplier,
    isUpdating,
  } = useSuppliers(
    {
      id: supplierId,
      populate: ["prices", "prices.product"],
    },
    {
      enabled: !!supplierId,
      onError: (error) => {
        console.error("Error fetching supplier:", error);
        toast.error("Error al cargar el proveedor");
        router.push("/suppliers");
      },
    }
  );

  // Crear configuración del formulario
  const formConfig = useMemo(() => {
    if (!supplierId) return null;

    return createSupplierDetailConfig({
      supplierId,
      updateSupplier,
      updating: isUpdating,
    });
  }, [supplierId, updateSupplier, isUpdating]);

  if (!formConfig) return null;

  return (
    <EntityForm
      config={formConfig}
      initialData={supplier}
      backPath="/suppliers"
    />
  );
}
