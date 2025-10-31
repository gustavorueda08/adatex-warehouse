"use client";

import { use, useMemo } from "react";
import DocumentDetailBaseV2 from "@/components/documents/DocumentDetailBaseV2";
import { createSaleDocumentConfigV2 } from "@/lib/config/documentConfigs";
import { useOrders } from "@/lib/hooks/useOrders";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { useProducts } from "@/lib/hooks/useProducts";

/**
 * Sales Detail Page V2 - Versión simplificada usando DocumentDetailBaseV2
 * Reducido de 340 líneas a ~70 líneas (79% reducción)
 */
export default function SaleDetailPageV2({ params }) {
  const { id } = use(params);

  // Solo fetch del documento con todas sus relaciones
  const { orders, updateOrder, deleteOrder, addItem, removeItem } = useOrders({
    filters: { id: [id] },
    populate: [
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
      "customer",
      "customer.parties",
      "customer.prices",
      "customer.prices.product",
      "customer.taxes",
      "customerForInvoice",
      "customerForInvoice.prices",
      "customerForInvoice.prices.product",
      "customerForInvoice.taxes",
      "sourceWarehouse",
    ],
  });

  const order = orders[0] || null;

  // Crear config con las operaciones CRUD
  const config = useMemo(() => {
    if (!order) return null;

    return createSaleDocumentConfigV2({
      useCustomers,
      useWarehouses,
      useProducts,
      updateOrder,
      deleteOrder,
      addItem,
      removeItem,
    });
  }, [order, updateOrder, deleteOrder, addItem, removeItem]);

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
