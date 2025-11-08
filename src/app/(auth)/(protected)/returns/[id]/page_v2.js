"use client";

import { use, useMemo } from "react";
import DocumentDetailBaseV2 from "@/components/documents/DocumentDetail";
import { createReturnDocumentConfigV2 } from "@/lib/config/documentConfigs";
import { useOrders } from "@/lib/hooks/useOrders";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { useProducts } from "@/lib/hooks/useProducts";

/**
 * Return Detail Page V2 - Versión simplificada usando DocumentDetailBaseV2
 * Reducido significativamente usando el patrón config-based
 */
export default function ReturnDetailPageV2({ params }) {
  const { id } = use(params);

  // Solo fetch del documento con todas sus relaciones
  const { orders, updateOrder, deleteOrder, addItem, removeItem } = useOrders({
    filters: { id: [id] },
    populate: [
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
      "orderProducts.items.warehouse",
      "orderProducts.items.parentItem",
      "destinationWarehouse",
      "sourceOrder",
      "sourceOrder.customer",
    ],
  });

  const order = orders[0] || null;

  // Fetch data needed by the document (hooks must be called at top level)
  const { warehouses } = useWarehouses({});
  const { products } = useProducts({});

  // Crear config con las operaciones CRUD y data fetched
  const config = useMemo(() => {
    if (!order) return null;

    return createReturnDocumentConfigV2({
      warehouses,
      products,
      updateOrder,
      deleteOrder,
      addItem,
      removeItem,
    });
  }, [
    order,
    warehouses,
    products,
    updateOrder,
    deleteOrder,
    addItem,
    removeItem,
  ]);

  // Loading state
  if (!order || !config) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Cargando devolución...</div>
      </div>
    );
  }

  // ¡Eso es todo! Solo config e initialData
  return <DocumentDetailBaseV2 config={config} initialData={order} />;
}
