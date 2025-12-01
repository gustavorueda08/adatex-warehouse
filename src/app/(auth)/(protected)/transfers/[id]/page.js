"use client";

import { use, useMemo } from "react";
import DocumentDetail from "@/components/documents/DocumentDetail";
import { useOrders } from "@/lib/hooks/useOrders";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { useProductSelector } from "@/lib/hooks/useProductSelector";
import { createTransferDetailConfig } from "@/lib/config/transferDocumentConfigs";

export default function TransferDetailPage({ params }) {
  const { id } = use(params);

  // Solo fetch del documento con todas sus relaciones
  const { orders, updateOrder, deleteOrder, refetch, addItem, removeItem } =
    useOrders({
      filters: { id: [id] },
      populate: [
        "orderProducts",
        "orderProducts.product",
        "orderProducts.items",
        "sourceWarehouse",
        "destinationWarehouse",
      ],
    });

  const order = orders[0] || null;
  const { warehouses } = useWarehouses({});
  const {
    products,
    search: productsSearchTerm,
    setSearch: onSearchProducts,
    hasMore: productsHasMore,
    loadMore: onLoadMoreProducts,
    loading: productsLoading,
    loadingMore: productsLoadingMore,
  } = useProductSelector({});
  const productSelectProps = useMemo(
    () => ({
      onSearchProducts,
      productsSearchTerm,
      onLoadMoreProducts,
      productsHasMore,
      productsLoading,
      productsLoadingMore,
    }),
    [
      onSearchProducts,
      productsSearchTerm,
      onLoadMoreProducts,
      productsHasMore,
      productsLoading,
      productsLoadingMore,
    ]
  );

  // Crear config con las operaciones CRUD y data fetched
  const config = useMemo(() => {
    if (!order) return null;
    return createTransferDetailConfig({
      warehouses,
      products,
      updateOrder,
      deleteOrder,
      refetch,
      addItem,
      removeItem,
      productSelectProps,
    });
  }, [
    order,
    warehouses,
    updateOrder,
    deleteOrder,
    addItem,
    removeItem,
    products,
    productSelectProps,
  ]);

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
