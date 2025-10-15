"use client";

import DocumentForm from "@/components/documents/DocumentForm";
import { createSaleFormConfig } from "@/lib/config/documentConfigs";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useOrders } from "@/lib/hooks/useOrders";
import { useProducts } from "@/lib/hooks/useProducts";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { useRouter } from "next/navigation";

/**
 * EJEMPLO DE USO DEL NUEVO SISTEMA
 *
 * Este archivo muestra cómo usar DocumentForm con las configuraciones
 * del archivo documentConfigs.js
 *
 * Para usarlo:
 * 1. Renombra este archivo de page-new.js.example a page.js
 * 2. Guarda el page.js actual como backup si lo necesitas
 */
export default function NewSalePage() {
  const router = useRouter();

  // Hooks para obtener datos
  const { products: productsData = [] } = useProducts({});
  const { warehouses = [] } = useWarehouses({});
  const { customers = [] } = useCustomers({
    populate: ["prices", "prices.product", "parties"],
  });

  // Hook para crear la orden
  const { createOrder, creating } = useOrders(
    {},
    {
      enabled: false,
      onCreate: (createdOrder) => {
        console.log("Orden creada exitosamente:", createdOrder);
        router.push(`/sales/${createdOrder.id}`);
      },
    }
  );

  // Crear la configuración para el formulario de venta
  const config = createSaleFormConfig({
    customers,
    warehouses,
    productsData,
    onSubmit: createOrder,
    loading: creating,
  });

  return <DocumentForm config={config} />;
}
