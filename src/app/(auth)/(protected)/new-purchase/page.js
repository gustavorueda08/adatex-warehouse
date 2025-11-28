"use client";
import DocumentForm from "@/components/documents/DocumentForm";
import { createPurchaseFormConfig } from "@/lib/config/purchaseDocumentConfigs";
import { useOrders } from "@/lib/hooks/useOrders";
import { useProductSelector } from "@/lib/hooks/useProductSelector";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

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
export default function NewPurchasePage() {
  const router = useRouter();

  // Hooks para obtener datos
  const productSelector = useProductSelector({ pageSize: 25 });
  const { warehouses = [] } = useWarehouses({});
  const { suppliers = [] } = useSuppliers({});

  // Hook para crear la orden
  const { createOrder, creating } = useOrders(
    {},
    {
      enabled: false,
      onCreate: (createdOrder) => {
        console.log("Orden creada exitosamente:", createdOrder);
        router.push(`/purchases/${createdOrder.id}`);
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
  const config = createPurchaseFormConfig({
    suppliers,
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
