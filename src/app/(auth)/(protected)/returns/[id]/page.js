"use client";

import { use, useMemo } from "react";
import ReturnDetailView from "@/components/documents/ReturnDetailView";
import { useOrders } from "@/lib/hooks/useOrders";
import { useProducts } from "@/lib/hooks/useProducts";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { createReturnDetailConfig } from "@/lib/config/returnDocumentConfigs";

export default function ReturnDetailPage({ params }) {
  const { id } = use(params);

  const { orders, updateOrder, deleteOrder, addItem, removeItem } = useOrders({
    filters: { id: [id] },
    populate: [
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
      "orderProducts.items.warehouse",
      "orderProducts.items.parentItem",
      "destinationWarehouse",
      "parentOrder",
      "parentOrder.customer",
      "parentOrder.orderProducts",
      "parentOrder.orderProducts.product",
      "parentOrder.orderProducts.items",
    ],
  });

  const order = orders?.[0] || null;
  const { products: productsData = [] } = useProducts({});
  const { warehouses = [] } = useWarehouses({});
  const parentOrderProducts =
    order?.parentOrder?.orderProducts
      ?.map((op) => op.product)
      .filter(Boolean) || [];

  const config = useMemo(() => {
    if (!order) return null;
    return createReturnDetailConfig({
      warehouses,
      products:
        parentOrderProducts.length > 0 ? parentOrderProducts : productsData,
      updateOrder,
      deleteOrder,
      addItem,
      removeItem,
    });
  }, [
    order,
    warehouses,
    parentOrderProducts,
    updateOrder,
    deleteOrder,
    addItem,
    removeItem,
  ]);

  if (!order || !config) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Cargando devolución...</div>
      </div>
    );
  }

  return <ReturnDetailView config={config} initialData={order} />;
}
