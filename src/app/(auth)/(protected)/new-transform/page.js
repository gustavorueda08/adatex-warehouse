"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useOrders } from "@/lib/hooks/useOrders";
import { useProducts } from "@/lib/hooks/useProducts";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { useItems } from "@/lib/hooks/useItems";
import { createTransformFormConfig } from "@/lib/config/transformDocumentConfigs";
import DocumentForm from "@/components/documents/DocumentForm";

export default function NewTransformPage() {
  const router = useRouter();

  // Hooks para obtener datos
  const { products: productsData = [] } = useProducts({
    pagination: { pageSize: 1000 },
  });
  const { warehouses = [] } = useWarehouses({
    pagination: { pageSize: 100 },
  });

  // Estado local para controlar la bodega seleccionada y filtrar items
  // DocumentForm maneja su propio estado, pero necesitamos saber la bodega para filtrar items
  // Podemos usar un callback en DocumentForm para notificar cambios, o inferirlo.
  // DocumentForm tiene onFormStateChange.
  const [formState, setFormState] = useState({});

  const selectedWarehouseId = formState.sourceWarehouse?.id;

  // Obtener items de inventario disponibles en la bodega seleccionada
  const { items: availableItems = [] } = useItems(
    {
      filters: selectedWarehouseId
        ? {
            warehouse: selectedWarehouseId,
            quantity: { $gt: 0 },
          }
        : {},
      populate: ["product", "warehouse"],
      pagination: { pageSize: 1000 },
    },
    {
      enabled: !!selectedWarehouseId,
    }
  );

  // Hook para crear la orden
  const { createOrder, creating } = useOrders(
    {},
    {
      enabled: false,
      onCreate: (createdOrder) => {
        console.log(
          "Orden de transformación creada exitosamente:",
          createdOrder
        );
        router.push(`/transformations/${createdOrder.id}`);
      },
    }
  );

  // Crear la configuración
  const config = useMemo(
    () =>
      createTransformFormConfig({
        warehouses,
        productsData,
        availableItems,
        onSubmit: async (data) => {
          await createOrder(data);
        },
        loading: creating,
      }),
    [warehouses, productsData, availableItems, createOrder, creating]
  );

  return <DocumentForm config={config} onFormStateChange={setFormState} />;
}
