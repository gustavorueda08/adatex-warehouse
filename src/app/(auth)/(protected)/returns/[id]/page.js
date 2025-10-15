"use client";

import { use, useState, useEffect, useCallback } from "react";
import DocumentDetailBase from "@/components/documents/DocumentDetailBase";
import { useOrders } from "@/lib/hooks/useOrders";
import { useProducts } from "@/lib/hooks/useProducts";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { returnDocumentConfig } from "@/lib/config/documentConfigs";
import moment from "moment-timezone";
import toast from "react-hot-toast";
import { useUser } from "@/lib/hooks/useUser";

export default function ReturnDetailPage({ params }) {
  const { id } = use(params);
  const { orders, updateOrder, deleteOrder, addItem, removeItem } = useOrders({
    filters: { id: [id] },
    populate: [
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
      "orderProducts.items.warehouse",
      "orderProducts.items.parentItem",
      "destinationWarehouse",
      "sourceOrder",
      "sourceOrder.customer",
    ],
  });

  const { products: productsData = [] } = useProducts({});
  const { warehouses } = useWarehouses({});
  const { user } = useUser({});

  const order = orders[0] || null;

  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [dateCreated, setDateCreated] = useState(
    moment().tz("America/Bogota").toDate()
  );
  const [returnReason, setReturnReason] = useState(null);
  const [loadingProcess, setLoadingProcess] = useState(false);

  useEffect(() => {
    if (order) {
      setSelectedWarehouse(order.destinationWarehouse);
      setDateCreated(order.createdDate || null);
      setReturnReason(order.returnReason || null);
    }
  }, [order]);

  // Función para procesar devolución (completarla)
  const handleProcess = useCallback(async () => {
    setLoadingProcess(true);
    try {
      const result = await updateOrder(order.id, {
        state: "completed",
        completedDate: new Date(),
      });

      if (result.success) {
        toast.success("Devolución procesada exitosamente");
      } else {
        toast.error("Error al procesar la devolución");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al procesar la devolución");
    } finally {
      setLoadingProcess(false);
    }
  }, [order, updateOrder]);

  // Callback cuando se actualiza exitosamente
  const handleUpdateSuccess = useCallback((result) => {
    console.log("Devolución actualizada exitosamente:", result);
  }, []);

  const config = returnDocumentConfig;
  const isReadOnly =
    order?.state === "completed" || order?.state === "canceled";

  if (!order) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Cargando devolución...</div>
      </div>
    );
  }

  return (
    <DocumentDetailBase
      document={order}
      user={user}
      updateDocument={updateOrder}
      deleteDocument={deleteOrder}
      addItem={addItem}
      removeItem={removeItem}
      availableProducts={productsData}
      documentType={config.documentType}
      title={`Devolución ${order.code || ""}`}
      redirectPath={config.redirectPath}
      headerFields={config.getHeaderFields({
        warehouses,
        selectedWarehouse,
        setSelectedWarehouse,
        dateCreated,
        returnReason,
        setReturnReason,
        sourceOrder: order.sourceOrder,
      })}
      productColumns={config.getProductColumns}
      actions={config.getActions({
        handleProcess,
        loadingProcess,
        document: order,
      })}
      customSections={[
        // Sección para mostrar info de la orden original
        {
          title: "Información de la orden original",
          render: () => (
            <div className="bg-zinc-700 rounded-md p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-zinc-400">Orden de venta</p>
                  <p className="font-semibold">
                    {order.sourceOrder?.code || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Cliente</p>
                  <p className="font-semibold">
                    {order.sourceOrder?.customer?.name || "-"}
                  </p>
                </div>
              </div>
            </div>
          ),
        },
      ]}
      onUpdate={handleUpdateSuccess}
      isReadOnly={isReadOnly}
      allowManualEntry={false}
    />
  );
}
