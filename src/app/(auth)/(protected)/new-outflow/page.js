"use client";

import DocumentForm from "@/components/documents/DocumentForm";
import { createOutflowFormConfig } from "@/lib/config/documentConfigs";
import { useOrders } from "@/lib/hooks/useOrders";
import { useProductSelector } from "@/lib/hooks/useProductSelector";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function NewOutflowPage() {
  const router = useRouter();
  const productSelector = useProductSelector({ pageSize: 25 });
  const { warehouses = [] } = useWarehouses({});
  const { createOrder, creating } = useOrders(
    {},
    {
      enabled: false,
      onCreate: (createdOrder) => {
        console.log("Orden creada exitosamente:", createdOrder);
        router.push(`/outflows/${createdOrder.id}`);
      },
      onError: (error) => {
        console.log(error);
        toast.error(
          "Error: La orden no pudo ser creada, verifique que el código de la órden sea unico"
        );
      },
    }
  );

  // Crear la configuración para el formulario de venta
  const config = createOutflowFormConfig({
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
    onSubmit: createOrder,
    loading: creating,
  });

  return <DocumentForm config={config} />;
}
