"use client";

import { useParams, useRouter } from "next/navigation";
import { useOrders } from "@/lib/hooks/useOrders";
import { useProducts } from "@/lib/hooks/useProducts";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { createTransformDetailConfig } from "@/lib/config/transformDocumentConfigs";
import DocumentDetail from "@/components/documents/DocumentDetail";
import { useMemo } from "react";

export default function TransformationDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  // Fetch data
  const { orders, updateOrder, deleteOrder, loading } = useOrders({
    filters: { id },
    populate: [
      "orderProducts",
      "orderProducts.items",
      "orderProducts.items.sourceItem", // Populate source item details
      "orderProducts.items.sourceItem.product",
      "orderProducts.product",
      "sourceWarehouse",
      "destinationWarehouse",
    ],
  });

  const { products: productsData = [] } = useProducts({});
  const { warehouses = [] } = useWarehouses({});

  const order = orders[0];

  const config = useMemo(
    () =>
      createTransformDetailConfig({
        productsData,
        warehouses,
        updateOrder,
        deleteOrder,
      }),
    [productsData, warehouses, updateOrder, deleteOrder]
  );

  if (loading) return <div className="p-8 text-center">Cargando...</div>;
  if (!order)
    return <div className="p-8 text-center">Transformación no encontrada</div>;

  return (
    <DocumentDetail
      config={{
        ...config,
        data: { products: productsData },
        updateDocument: updateOrder,
        deleteDocument: async (id) => {
          const res = await deleteOrder(id);
          if (res.success) router.push("/transformations");
          return res;
        },
      }}
      initialData={order}
    />
  );
}
