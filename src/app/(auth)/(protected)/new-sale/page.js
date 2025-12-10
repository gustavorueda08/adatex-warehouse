"use client";

import DocumentForm from "@/components/documents/DocumentForm";
import { createSaleFormConfig } from "@/lib/config/saleDocumentConfigs";
import { createCustomerFormConfig } from "@/lib/config/customerConfigs";
import { useCustomerSelector } from "@/lib/hooks/useCustomerSelector";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useOrders } from "@/lib/hooks/useOrders";
import { useProductSelector } from "@/lib/hooks/useProductSelector";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { useTerritories } from "@/lib/hooks/useTerritories";
import { useSellerSelector } from "@/lib/hooks/useSellerSelector";
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
  const productSelector = useProductSelector({ pageSize: 25 });
  const { warehouses = [] } = useWarehouses({});
  const customerSelector = useCustomerSelector({ pageSize: 25 });
  const { territories = [] } = useTerritories();
  const sellerSelector = useSellerSelector({ pageSize: 25 });
  const { createCustomer, creating: creatingCustomer } = useCustomers(
    {},
    { enabled: false }
  );

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

  // Configuración para creación rápida de cliente
  const quickCreateCustomer = {
    config: createCustomerFormConfig({
      onSubmit: createCustomer,
      loading: creatingCustomer,
      territories,
      sellers: sellerSelector.sellers,
      sellerSelectProps: {
        onSearch: sellerSelector.setSearch,
        onLoadMore: sellerSelector.loadMore,
        hasMore: sellerSelector.hasMore,
        loading: sellerSelector.loading,
        loadingMore: sellerSelector.loadingMore,
      },
    }),
    title: "Crear Nuevo Cliente",
  };

  // Crear la configuración para el formulario de venta
  const config = createSaleFormConfig({
    customers: customerSelector.customers,
    warehouses,
    productsData: productSelector.products,
    productSelectProps: {
      onSearchProducts: productSelector.setSearch,
      productsSearchTerm: productSelector.search,
      onLoadMoreProducts: productSelector.loadMore,
      productsHasMore: productSelector.hasMore,
      productsLoading: productSelector.loading,
      productsLoadingMore: productSelector.loadingMore,
    },
    customerSelectProps: {
      onSearch: customerSelector.setSearch,
      onLoadMore: customerSelector.loadMore,
      hasMore: customerSelector.hasMore,
      loading: customerSelector.loading,
      loadingMore: customerSelector.loadingMore,
    },
    onSubmit: createOrder,
    loading: creating,
    quickCreateCustomer,
  });

  return <DocumentForm config={config} />;
}
