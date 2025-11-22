"use client";

import DocumentForm from "@/components/documents/DocumentForm";
import { createTransferFormConfig } from "@/lib/config/transferDocumentConfigs";
import { useOrders } from "@/lib/hooks/useOrders";
import { useProducts } from "@/lib/hooks/useProducts";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function NewTransferPage() {
  const router = useRouter();
  const { products: productsData = [] } = useProducts({});
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
  const config = createTransferFormConfig({
    warehouses,
    productsData,
    onSubmit: createOrder,
    loading: creating,
  });

  return <DocumentForm config={config} />;
}
