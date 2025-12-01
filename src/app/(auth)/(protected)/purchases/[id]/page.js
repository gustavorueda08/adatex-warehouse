"use client";

import { use, useMemo } from "react";
import { useOrders } from "@/lib/hooks/useOrders";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { useProductSelector } from "@/lib/hooks/useProductSelector";
import DocumentDetail from "@/components/documents/DocumentDetail";
import { createPurchaseDetailConfig } from "@/lib/config/purchaseDocumentConfigs";

/**
 * Purchase Detail Page V2 - Versión simplificada usando DocumentDetailBaseV2
 * Reducido significativamente usando el patrón config-based
 */
export default function PurchaseDetailPage({ params }) {
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
    return createPurchaseDetailConfig({
      suppliers,
      warehouses,
      products,
      updateOrder,
      deleteOrder,
      productSelectProps,
    });
  }, [
    order,
    suppliers,
    warehouses,
    products,
    updateOrder,
    deleteOrder,
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

  return (
    <>
      <DocumentDetail config={config} initialData={order} />
    </>
  );
}
