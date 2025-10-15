"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DocumentDetailBase from "@/components/documents/DocumentDetailBase";
import { useOrders } from "@/lib/hooks/useOrders";
import { useProducts } from "@/lib/hooks/useProducts";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { useSocket } from "@/lib/hooks/useSocket";
import { transformDocumentConfig } from "@/lib/config/documentConfigs";
import moment from "moment-timezone";
import toast from "react-hot-toast";
import { useUser } from "@/lib/hooks/useUser";
import format from "@/lib/utils/format";

export default function TransformationDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const { orders, updateOrder, deleteOrder, addItem, removeItem } = useOrders({
    filters: { id: [id] },
    populate: [
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
      "orderProducts.items.transformedFromItem",
      "orderProducts.items.parentItem",
      "destinationWarehouse",
    ],
  });

  const { products: productsData = [] } = useProducts({});
  const { warehouses = [] } = useWarehouses({});
  const { user } = useUser({});

  const order = orders[0] || null;

  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [transformationType, setTransformationType] = useState("transformation");
  const [dateCreated, setDateCreated] = useState(
    moment().tz("America/Bogota").toDate()
  );
  const [loadingProcess, setLoadingProcess] = useState(false);

  useEffect(() => {
    if (order) {
      setSelectedWarehouse(order.destinationWarehouse);
      setDateCreated(order.createdDate || null);
      // Determinar tipo de transformación basado en los items
      // Si hay items con parentItem, es una partición
      const hasPartitions = order.orderProducts?.some(
        (op) => op.items?.some((item) => item.parentItem)
      );
      setTransformationType(hasPartitions ? "partition" : "transformation");
    }
  }, [order]);

  const { isConnected, joinOrder, on, leaveOrder } = useSocket();

  useEffect(() => {
    if (!isConnected || !order?.id) return;

    console.log(`Uniéndose a orden de transformación: ${order.id}`);
    joinOrder(order.id);

    // Escuchar cuando se agrega un item
    const unsubscribeItemAdded = on("order:item-added", (item) => {
      console.log("Item transformado agregado vía socket:", item);
      toast.success(
        `${item.product?.name || "Item"}: ${item.currentQuantity} ${
          item.product?.unit || ""
        } transformado`,
        { id: `item-${item.id}` }
      );
    });

    // Escuchar cuando se elimina un item
    const unsubscribeItemRemoved = on("order:item-removed", (removedItem) => {
      console.log("Item eliminado vía socket:", removedItem);
      toast.success(`${removedItem.product?.name || "Item"} eliminado`, {
        id: `item-removed-${removedItem.id}`,
      });
    });

    // Escuchar actualizaciones de la orden
    const unsubscribeOrderUpdated = on("order:updated", (updatedOrder) => {
      console.log("Orden de transformación actualizada vía socket:", updatedOrder);
    });

    // Cleanup
    return () => {
      console.log(`Saliendo de orden de transformación: ${order.id}`);
      leaveOrder(order.id);
      unsubscribeItemAdded?.();
      unsubscribeItemRemoved?.();
      unsubscribeOrderUpdated?.();
    };
  }, [isConnected, order?.id, joinOrder, leaveOrder, on]);

  // Función para procesar transformación
  const handleProcess = useCallback(async () => {
    setLoadingProcess(true);
    try {
      // Actualizar orden a completada
      const result = await updateOrder(order.id, {
        state: "completed",
        completedDate: new Date(),
      });

      if (result.success) {
        toast.success("Transformación procesada exitosamente");
      } else {
        toast.error("Error al procesar la transformación");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al procesar la transformación");
    } finally {
      setLoadingProcess(false);
    }
  }, [order, updateOrder]);

  // Callback cuando se actualiza exitosamente
  const handleUpdateSuccess = useCallback((result) => {
    console.log("Orden de transformación actualizada exitosamente:", result);
  }, []);

  const config = transformDocumentConfig;
  const isReadOnly =
    order?.state === "completed" || order?.state === "canceled";

  if (!order) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Cargando orden de transformación...</div>
      </div>
    );
  }

  return (
    <DocumentDetailBase
      document={order}
      user={user}
      showInvoice={false}
      updateDocument={updateOrder}
      deleteDocument={deleteOrder}
      allowManualEntry={true}
      addItem={addItem}
      removeItem={removeItem}
      availableProducts={productsData}
      documentType={config.documentType}
      title={`${order.code || ""} - Transformación`}
      redirectPath={config.redirectPath}
      headerFields={config.getHeaderFields({
        warehouses,
        selectedWarehouse,
        setSelectedWarehouse,
        dateCreated,
        transformationType,
        setTransformationType,
      })}
      productColumns={config.getProductColumns}
      actions={config.getActions({
        handleProcess,
        loadingProcess,
        document: order,
      })}
      customSections={[
        {
          title: "Información de Transformación",
          render: () => (
            <div className="p-4 bg-cyan-900/20 border border-cyan-500 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🔄</span>
                <h4 className="font-bold text-cyan-400">
                  {transformationType === "partition"
                    ? "Partición/Corte"
                    : "Transformación"}
                </h4>
              </div>
              <p className="text-sm text-cyan-300">
                {transformationType === "partition"
                  ? "Esta orden divide items del mismo producto en items más pequeños. Los items hijos mantienen referencia al item padre."
                  : "Esta orden convierte items de un producto en otro producto diferente. Se mantiene trazabilidad completa de la transformación."}
              </p>
              {order.state === "draft" && (
                <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-600 rounded">
                  <p className="text-sm text-yellow-300">
                    ⚠️ Esta transformación está en borrador. Los items se
                    crearán automáticamente al procesar la orden.
                  </p>
                </div>
              )}
            </div>
          ),
        },
        {
          title: "Detalles de Items Transformados",
          render: () => {
            const allItems = order.orderProducts?.flatMap((op) =>
              (op.items || []).map((item) => ({
                ...item,
                product: op.product,
                sourceItem: item.transformedFromItem || item.parentItem,
              }))
            ) || [];

            if (allItems.length === 0) {
              return (
                <div className="p-4 text-center text-zinc-500 bg-zinc-700 rounded-md">
                  No hay items transformados aún
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {allItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-zinc-700 rounded-md"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Item origen */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-zinc-300">
                          Item origen
                        </h4>
                        {item.sourceItem ? (
                          <>
                            <p className="text-sm">
                              <span className="text-zinc-400">Producto:</span>{" "}
                              {item.sourceItem.product?.name || "-"}
                            </p>
                            <p className="text-sm">
                              <span className="text-zinc-400">Lote / Código:</span>{" "}
                              {item.sourceItem.lotNumber || "-"} /{" "}
                              {item.sourceItem.itemNumber || "-"}
                            </p>
                            <p className="text-sm">
                              <span className="text-zinc-400">
                                Cantidad consumida:
                              </span>{" "}
                              <span className="font-semibold text-red-400">
                                -{format(item.sourceQuantityConsumed || 0)}{" "}
                                {item.sourceItem.product?.unit || ""}
                              </span>
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-zinc-500">
                            Información no disponible
                          </p>
                        )}
                      </div>

                      {/* Item destino */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-zinc-300">
                          Item resultante
                        </h4>
                        <p className="text-sm">
                          <span className="text-zinc-400">Producto:</span>{" "}
                          {item.product?.name || "-"}
                        </p>
                        <p className="text-sm">
                          <span className="text-zinc-400">Lote / Código:</span>{" "}
                          {item.lotNumber || "-"} / {item.itemNumber || "-"}
                        </p>
                        <p className="text-sm">
                          <span className="text-zinc-400">
                            Cantidad creada:
                          </span>{" "}
                          <span className="font-semibold text-emerald-400">
                            +{format(item.currentQuantity || 0)}{" "}
                            {item.product?.unit || ""}
                          </span>
                        </p>
                        <p className="text-sm">
                          <span className="text-zinc-400">Bodega:</span>{" "}
                          {item.warehouse?.name || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          },
        },
      ]}
      onUpdate={handleUpdateSuccess}
      isReadOnly={isReadOnly}
    />
  );
}
