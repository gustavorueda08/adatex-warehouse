"use client";

import { useRouter } from "next/navigation";
import EntityForm from "@/components/entities/EntityForm";
import { createProductFormConfig } from "@/lib/config/entityConfigs";
import { useProducts } from "@/lib/hooks/useProducts";

/**
 * Página para crear nuevos productos
 *
 * Utiliza EntityForm con la configuración definida en entityConfigs.js
 * para mantener consistencia con el resto del sistema.
 */
export default function NewProductPage() {
  const router = useRouter();
  const { createProduct, creating } = useProducts(
    {},
    {
      enabled: false,
      onCreate: (createdProduct) => {
        console.log("Producto creado exitosamente:", createdProduct);
        router.push(`/products/${createdProduct.documentId}`);
      },
    }
  );

  // Crear la configuración para el formulario de producto
  const config = createProductFormConfig({
    onSubmit: createProduct,
    loading: creating,
  });

  return <EntityForm config={config} backPath="/products" />;
}
