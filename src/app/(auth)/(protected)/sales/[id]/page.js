"use client";

import { use, useMemo } from "react";
import DocumentDetail from "@/components/documents/DocumentDetail";
import { useOrders } from "@/lib/hooks/useOrders";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { useProductSelector } from "@/lib/hooks/useProductSelector";
import { createSaleDetailConfig } from "@/lib/config/saleDocumentConfigs";

/**
 * Sales Detail Page V2 - Versión simplificada usando DocumentDetailBaseV2
 * Reducido de 340 líneas a ~70 líneas (79% reducción)
 */
export default function SaleDetailPageV2({ params }) {
  const { id } = use(params);

  // Solo fetch del documento con todas sus relaciones
  const { orders, updateOrder, deleteOrder, addItem, removeItem, refetch } =
    useOrders({
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

  // Fetch data needed by the document (hooks must be called at top level)
  const { customers } = useCustomers({
    populate: ["prices", "prices.product", "parties", "taxes"],
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
    return createSaleDetailConfig({
      customers,
      warehouses,
      products,
      updateOrder,
      deleteOrder,
      addItem,
      removeItem,
      refetch,
      productSelectProps,
    });
  }, [
    order,
    customers,
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
