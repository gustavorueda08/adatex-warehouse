"use client";

import { use, useState, useEffect, useCallback } from "react";
import DocumentDetailBase from "@/components/documents/DocumentDetailBase";
import { useOrders } from "@/lib/hooks/useOrders";
import { partialInvoiceDocumentConfig } from "@/lib/config/documentConfigs";
import moment from "moment-timezone";
import toast from "react-hot-toast";
import { useUser } from "@/lib/hooks/useUser";

export default function PartialInvoiceDetailPage({ params }) {
  const { id } = use(params);
  const { orders, updateOrder, deleteOrder } = useOrders({
    filters: { id: [id] },
    populate: [
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
      "customer",
      "customerForInvoice",
      "parentOrder",
      "parentOrder.customer",
    ],
  });
  const { user } = useUser({});

  const order = orders[0] || null;
  const [loadingComplete, setLoadingComplete] = useState(false);

  // Función para completar y facturar
  const handleComplete = useCallback(async () => {
    if (!order) return;

    setLoadingComplete(true);
    try {
      const result = await updateOrder(order.id, {
        state: "completed",
        completedDate: new Date(),
      });

      if (result.success) {
        toast.success("Factura parcial completada y facturada exitosamente");
      } else {
        toast.error("Error al completar la factura parcial");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al completar la factura parcial");
    } finally {
      setLoadingComplete(false);
    }
  }, [order, updateOrder]);

  // Callback cuando se actualiza exitosamente
  const handleUpdateSuccess = useCallback((result) => {
    console.log("Factura parcial actualizada exitosamente:", result);
  }, []);

  const config = partialInvoiceDocumentConfig;
  const isReadOnly = order?.state === "completed" || order?.state === "canceled";

  if (!order) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Cargando factura parcial...</div>
      </div>
    );
  }

  return (
    <DocumentDetailBase
      document={order}
      user={user}
      showInvoice={false} // Las facturas parciales no muestran invoice section aquí
      updateDocument={updateOrder}
      deleteDocument={deleteOrder}
      allowManualEntry={false}
      addItem={null} // No se pueden agregar items manualmente
      removeItem={null} // No se pueden remover items
      availableProducts={[]}
      documentType={config.documentType}
      title={`${order.code || "Factura Parcial"}`}
      redirectPath={config.redirectPath}
      headerFields={config.getHeaderFields({
        order,
        parentOrder: order.parentOrder,
      })}
      productColumns={config.getProductColumns}
      actions={config.getActions({
        handleComplete,
        loadingComplete,
        document: order,
      })}
      customSections={[
        {
          title: "Información de la Orden Original",
          render: () => (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-700 rounded-md">
                <p className="text-sm text-zinc-400">Código de Orden</p>
                <p className="text-lg font-bold">
                  {order.parentOrder?.code || "-"}
                </p>
              </div>
              <div className="p-4 bg-zinc-700 rounded-md">
                <p className="text-sm text-zinc-400">Cliente</p>
                <p className="text-lg font-bold">
                  {order.parentOrder?.customer?.name || order.customer?.name || "-"}
                </p>
              </div>
              <div className="p-4 bg-zinc-700 rounded-md">
                <p className="text-sm text-zinc-400">Fecha de Despacho Original</p>
                <p className="text-lg font-bold">
                  {order.parentOrder?.completedDate
                    ? moment(order.parentOrder.completedDate)
                        .tz("America/Bogota")
                        .format("DD-MM-YYYY | h:mm a")
                    : "-"}
                </p>
              </div>
              <div className="p-4 bg-zinc-700 rounded-md">
                <p className="text-sm text-zinc-400">Fecha de esta Factura</p>
                <p className="text-lg font-bold">
                  {order.createdAt
                    ? moment(order.createdAt)
                        .tz("America/Bogota")
                        .format("DD-MM-YYYY | h:mm a")
                    : "-"}
                </p>
              </div>
            </div>
          ),
        },
        ...(order.siigoId
          ? [
              {
                title: "Información de Facturación",
                render: () => (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-900/20 border border-emerald-500 rounded-md">
                      <p className="text-sm text-emerald-400">ID Siigo</p>
                      <p className="text-lg font-bold font-mono">{order.siigoId}</p>
                    </div>
                    <div className="p-4 bg-emerald-900/20 border border-emerald-500 rounded-md">
                      <p className="text-sm text-emerald-400">Número de Factura</p>
                      <p className="text-lg font-bold font-mono">
                        {order.invoiceNumber || "-"}
                      </p>
                    </div>
                  </div>
                ),
              },
            ]
          : []),
      ]}
      onUpdate={handleUpdateSuccess}
      isReadOnly={isReadOnly}
    />
  );
}
