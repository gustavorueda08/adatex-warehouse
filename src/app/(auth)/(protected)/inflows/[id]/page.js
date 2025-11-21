"use client";

import { use, useMemo } from "react";
import DocumentDetail from "@/components/documents/DocumentDetail";
import { useOrders } from "@/lib/hooks/useOrders";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { useProducts } from "@/lib/hooks/useProducts";
import { createInflowDetailConfig } from "@/lib/config/inflowDocumentConfigs";

export default function InflowDetailPage({ params }) {
  const { id } = use(params);

  // Solo fetch del documento con todas sus relaciones
  const { orders, updateOrder, deleteOrder, refetch } = useOrders({
    filters: { id: [id] },
    populate: [
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
      "destinationWarehouse",
    ],
  });

  const order = orders[0] || null;
  const { warehouses } = useWarehouses({});
  const { products } = useProducts({});

  // Crear config con las operaciones CRUD y data fetched
  const config = useMemo(() => {
    if (!order) return null;
    return createInflowDetailConfig({
      warehouses,
      products,
      updateOrder,
      deleteOrder,
      refetch,
    });
  }, [orders, order, warehouses, products, updateOrder, deleteOrder]);

  // Loading state
  if (!order || !config) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Cargando orden...</div>
      </div>
    );
  }

  return <DocumentDetail config={config} initialData={order} />;
}
