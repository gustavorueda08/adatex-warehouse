"use client";

import { use, useMemo } from "react";
import DocumentDetailBaseV2 from "@/components/documents/DocumentDetailBaseV2";
import { createPurchaseDocumentConfigV2 } from "@/lib/config/documentConfigs";
import { useOrders } from "@/lib/hooks/useOrders";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { useProducts } from "@/lib/hooks/useProducts";

/**
 * Purchase Detail Page V2 - Versión simplificada usando DocumentDetailBaseV2
 * Reducido significativamente usando el patrón config-based
 */
export default function PurchaseDetailPageV2({ params }) {
  const { id } = use(params);

  // Solo fetch del documento con todas sus relaciones
  const { orders, updateOrder, deleteOrder, addItem, removeItem } = useOrders({
    filters: { id: [id] },
    populate: [
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
      "supplier",
      "supplier.prices",
      "destinationWarehouse",
    ],
  });

  const order = orders[0] || null;

  // Fetch data needed by the document (hooks must be called at top level)
  const { suppliers } = useSuppliers({
    populate: ["prices", "prices.product"],
  });
  const { warehouses } = useWarehouses({});
  const { products } = useProducts({});

  // Crear config con las operaciones CRUD y data fetched
  const config = useMemo(() => {
    if (!order) return null;

    return createPurchaseDocumentConfigV2({
      suppliers,
      warehouses,
      products,
      updateOrder,
      deleteOrder,
      addItem,
      removeItem,
    });
  }, [order, suppliers, warehouses, products, updateOrder, deleteOrder, addItem, removeItem]);

  // Loading state
  if (!order || !config) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Cargando orden...</div>
      </div>
    );
  }

  // ¡Eso es todo! Solo config e initialData
  return (
    <DocumentDetailBaseV2
      config={config}
      initialData={order}
    />
  );
}
