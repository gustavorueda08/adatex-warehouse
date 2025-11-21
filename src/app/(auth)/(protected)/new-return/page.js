"use client";

import { useRouter } from "next/navigation";
import { useOrders } from "@/lib/hooks/useOrders";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { createReturnFormConfig } from "@/lib/config/returnDocumentConfigs";
import ReturnForm from "@/components/documents/ReturnForm";

export default function NewReturnPage() {
  const router = useRouter();
  const { warehouses = [] } = useWarehouses({});

  const {
    orders = [],
    createOrder,
    creating,
  } = useOrders(
    {
      filters: {
        type: "sale",
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
    },
    {
      enabled: true,
      onCreate: (createdOrder) => {
        router.push(`/returns/${createdOrder.id}`);
      },
    }
  );

  const config = createReturnFormConfig({
    orders,
    warehouses,
    onSubmit: async (data) => {
      await createOrder(data);
    },
    loading: creating,
  });

  return <ReturnForm config={config} />;
}
