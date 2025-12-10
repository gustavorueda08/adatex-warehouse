"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import EntityForm from "@/components/entities/EntityForm";
import ConsignmentBalance from "@/components/customers/ConsignmentBalance";
import toast from "react-hot-toast";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useTaxes } from "@/lib/hooks/useTaxes";
import { createCustomerDetailConfig } from "@/lib/config/customerConfigs";
import { useTerritories } from "@/lib/hooks/useTerritories";
import { useProductSelector } from "@/lib/hooks/useProductSelector";
import { useCustomerSelector } from "@/lib/hooks/useCustomerSelector";
import { useSellerSelector } from "@/lib/hooks/useSellerSelector";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id;

  const { customers, loading, updateCustomer, updating, refetch } =
    useCustomers(
      {
        filters: { id: { $eq: customerId } },
        pagination: { page: 1, pageSize: 1 },
        populate: [
          "taxes",
          "parties",
          "prices",
          "prices.product",
          "territory",
          "seller",
        ],
      },
      {
        onError: (err) => {
          console.error("Error loading customer:", err);
          toast.error("Error al cargar el cliente");
        },
        onUpdate: () => {
          refetch();
        },
      }
    );

  const { taxes } = useTaxes({});

  const customer = customers?.[0] || null;

  // Obtener taxes disponibles y mapearlos al formato esperado
  const availableTaxes = useMemo(() => {
    if (!taxes || taxes.length === 0) return [];
    return taxes.map((tax) => ({
      value: tax.id,
      label: `${tax.name}`,
    }));
  }, [taxes]);

  // Selectors for async search
  const productSelector = useProductSelector({ pageSize: 20 });
  const customerSelector = useCustomerSelector({ pageSize: 20 });
  const sellerSelector = useSellerSelector({ pageSize: 20 });

  // Obtener parties disponibles (otros clientes)
  const availableParties = useMemo(() => {
    return customerSelector.customers
      .filter((c) => c.id != customerId)
      .map((c) => ({
        value: c.id,
        label: `${c.name} ${c.lastName || ""}`,
      }));
  }, [customerSelector.customers, customerId]);

  const { territories = [] } = useTerritories({});

  // Obtener configuración del formulario
  const formConfig = useMemo(
    () =>
      createCustomerDetailConfig({
        customerId,
        availableTaxes,
        availableParties,
        availableSellers: sellerSelector.sellers,
        updateCustomer,
        router,
        updating,
        territories,
        productSelectProps: {
          onSearchProducts: productSelector.setSearch,
          productsSearchTerm: productSelector.search,
          onLoadMoreProducts: productSelector.loadMore,
          productsHasMore: productSelector.hasMore,
          productsLoading: productSelector.loading,
          productsLoadingMore: productSelector.loadingMore,
          products: productSelector.products,
        },
        partySelectProps: {
          onSearch: customerSelector.setSearch,
          onLoadMore: customerSelector.loadMore,
          hasMore: customerSelector.hasMore,
          loading: customerSelector.loading,
          loadingMore: customerSelector.loadingMore,
        },
        sellerSelectProps: {
          onSearch: sellerSelector.setSearch,
          onLoadMore: sellerSelector.loadMore,
          hasMore: sellerSelector.hasMore,
          loading: sellerSelector.loading,
          loadingMore: sellerSelector.loadingMore,
        },
      }),
    [
      customerId,
      availableTaxes,
      availableParties,
      updateCustomer,
      router,
      updating,
      territories,
      productSelector,
      customerSelector,
      sellerSelector,
    ]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Cargando cliente...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formulario de Cliente */}
      <EntityForm
        config={formConfig}
        initialData={customer}
        backPath="/customers"
      />

      {/* Sección de Balance de Remisión */}
      <ConsignmentBalance customerId={parseInt(customerId)} />
    </div>
  );
}
