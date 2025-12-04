"use client";

import { useRouter } from "next/navigation";
import { useOrders } from "@/lib/hooks/useOrders";
import { useOrderSelector } from "@/lib/hooks/useOrderSelector";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { createReturnFormConfig } from "@/lib/config/returnDocumentConfigs";
import ReturnForm from "@/components/documents/ReturnForm";

export default function NewReturnPage() {
  const router = useRouter();
  const { warehouses = [] } = useWarehouses({});

  const orderSelector = useOrderSelector({
    baseFilters: {
      type: ["sale"],
      state: ["completed"],
    },
    populate: [
      "orderProducts",
      "orderProducts.items",
      "orderProducts.items.warehouse",
      "orderProducts.product",
      "customer",
      "sourceWarehouse",
    ],
  });

  const { createOrder, creating } = useOrders(
    {},
    {
      enabled: false, // Only for creating
      onCreate: (createdOrder) => {
        router.push(`/returns/${createdOrder.id}`);
      },
    }
  );

  const orderSelectProps = {
    onSearch: orderSelector.setSearch,
    onLoadMore: orderSelector.loadMore,
    hasMore: orderSelector.hasMore,
    loading: orderSelector.loading,
    loadingMore: orderSelector.loadingMore,
  };

  const config = createReturnFormConfig({
    orders: orderSelector.orders,
    warehouses,
    onSubmit: createOrder,
    loading: creating,
    orderSelectProps,
  });

  return <ReturnForm config={config} />;
}
