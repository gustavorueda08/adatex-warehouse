"use client";

import { useRouter } from "next/navigation";
import EntityForm from "@/components/entities/EntityForm";
import toast from "react-hot-toast";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { createSupplierFormConfig } from "@/lib/config/entityConfigs";

export default function NewSupplierPage() {
  const router = useRouter();
  const { createSupplier, creating } = useSuppliers(
    {},
    {
      enabled: false,
      onCreate: (createdSupplier) => {
        console.log("Proveedor creado exitosamente:", createdSupplier);
        router.push(`/suppliers/${createdSupplier.id}`);
      },
    }
  );
  const config = createSupplierFormConfig({
    onSubmit: createSupplier,
    loading: creating,
  });

  return <EntityForm config={config} backPath="/suppliers" />;
}
