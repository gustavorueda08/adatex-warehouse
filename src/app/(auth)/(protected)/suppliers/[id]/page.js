"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import EntityForm from "@/components/entities/EntityForm";
import toast from "react-hot-toast";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { createSupplierDetailConfig } from "@/lib/config/supplierConfigs";

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.id;

  // Fetch supplier con prices populated
  const { suppliers, loading, updateSupplier, updating, refetch } =
    useSuppliers(
      {
        filters: { id: { $eq: supplierId } },
        populate: ["prices", "prices.product"],
      },
      {
        enabled: !!supplierId,
        onError: (error) => {
          console.error("Error fetching supplier:", error);
          toast.error("Error al cargar el proveedor");
          router.push("/suppliers");
        },
        onUpdate: () => {
          refetch();
        },
      }
    );

  const supplier = suppliers?.[0] || null;

  // Crear configuración del formulario
  const formConfig = useMemo(() => {
    if (!supplier) return null;

    return createSupplierDetailConfig({
      supplierId,
      updateSupplier,
      updating,
    });
  }, [supplierId, updateSupplier, updating]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Cargando proveedor...</div>
      </div>
    );
  }

  return (
    <EntityForm
      config={formConfig}
      initialData={supplier}
      backPath="/suppliers"
    />
  );
}
