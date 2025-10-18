"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DocumentDetailBase from "@/components/documents/DocumentDetailBase";
import { useOrders } from "@/lib/hooks/useOrders";
import { useProducts } from "@/lib/hooks/useProducts";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { useSocketContext } from "@/lib/contexts/SocketContext";
import { saleDocumentConfig } from "@/lib/config/documentConfigs";
import moment from "moment-timezone";
import toast from "react-hot-toast";
import { v4 } from "uuid";
import { useUser } from "@/lib/hooks/useUser";
import { useSocket } from "@/lib/hooks/useSocket";

export default function SaleDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { orders, updateOrder, deleteOrder, addItem, removeItem } = useOrders({
    filters: { id: [id] },
    populate: [
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
      "customer",
      "customerForInvoice",
      "customerForInvoice.prices",
      "customerForInvoice.taxes",
      "customer.prices",
      "customer.parties",
      "customer.taxes",
      "sourceWarehouse",
    ],
  });
  const { products: productsData = [] } = useProducts({});
  const { customers } = useCustomers({
    populate: ["prices", "prices.product", "parties", "taxes"],
  });
  const { warehouses } = useWarehouses({});
  const { user } = useUser({});
  const order = orders[0] || null;
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCustomerForInvoice, setSelectedCustomerForInvoice] =
    useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [parties, setParties] = useState([]);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  useEffect(() => {
    if (order) {
      setSelectedCustomer(order.customer);
      setSelectedCustomerForInvoice(order.customerForInvoice);
      setSelectedWarehouse(order.sourceWarehouse);
      // Configurar parties
      if (Array.isArray(order.customer?.parties)) {
        setParties([...order.customer.parties, order.customer]);
      }
    }
  }, [order]);
  useEffect(() => {
    if (
      selectedCustomer &&
      order &&
      selectedCustomer.id !== order.customer?.id
    ) {
      const customerParties = selectedCustomer.parties || [];
      setParties([...customerParties, selectedCustomer]);

      // Auto-seleccionar party por defecto
      if (customerParties.length === 0) {
        setSelectedCustomerForInvoice(selectedCustomer);
      } else {
        const defaultParty = customerParties.find((party) => party.isDefault);
        setSelectedCustomerForInvoice(defaultParty || customerParties[0]);
      }
    }
  }, [selectedCustomer, order]);
  const { isConnected, joinOrder, on, leaveOrder } = useSocket();
  useEffect(() => {
    if (!isConnected || !order?.id) return;

    console.log(`Uniéndose a orden: ${order.id}`);
    joinOrder(order.id);

    // Escuchar cuando se agrega un item
    const unsubscribeItemAdded = on("order:item-added", (item) => {
      console.log("Item agregado vía socket:", item);
      toast.success(
        `${item.product?.name || "Item"}: ${item.currentQuantity} ${
          item.product?.unit || ""
        } agregado`,
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
      console.log("Orden actualizada vía socket:", updatedOrder);
    });

    // Cleanup
    return () => {
      console.log(`Saliendo de orden: ${order.id}`);
      leaveOrder(order.id);
      unsubscribeItemAdded?.();
      unsubscribeItemRemoved?.();
      unsubscribeOrderUpdated?.();
    };
  }, [isConnected, order?.id, joinOrder, leaveOrder, on]);
  // Función para completar/despachar orden
  const handleComplete = useCallback(async () => {
    setLoadingComplete(true);
    try {
      let destinationWarehouse = selectedWarehouse;
      // Verificar que la bodega sea de tipo stock
      if (destinationWarehouse?.type !== "stock") {
        destinationWarehouse = warehouses.find(
          (warehouse) => warehouse.type === "stock" && warehouse.isDefault
        );
        if (!destinationWarehouse) {
          toast.error("No se ha encontrado ninguna bodega stock");
          setLoadingComplete(false);
          return;
        }
      }
      // Actualizar orden a completada
      const result = await updateOrder(order.id, {
        state: "completed",
        completedDate: new Date(),
        destinationWarehouse: destinationWarehouse.id,
        customer: selectedCustomer.id,
        customerForInvoice: selectedCustomerForInvoice.id,
      });
      if (result.success) {
        toast.success("Orden despachada exitosamente");
      } else {
        toast.error("Error al despachar la orden");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al despachar la orden");
    } finally {
      setLoadingComplete(false);
    }
  }, [
    order,
    selectedWarehouse,
    warehouses,
    selectedCustomer,
    selectedCustomerForInvoice,
    updateOrder,
  ]);
  // Callback cuando se actualiza exitosamente
  const handleUpdateSuccess = useCallback((result) => {
    console.log("Orden actualizada exitosamente:", result);
    // Puedes agregar lógica adicional aquí si es necesario
  }, []);
  const config = saleDocumentConfig;
  const isReadOnly =
    order?.state === "completed" || order?.state === "canceled";

  // Determinar si la orden es una remisión (completada sin facturar)
  const isConsignment = order?.state === "completed" && !order?.siigoId;

  if (!order) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Cargando orden...</div>
      </div>
    );
  }

  // Agregar acción de crear factura parcial si es remisión
  const enhancedActions = [
    ...config.getActions({
      handleComplete,
      loadingConfirm,
      loadingComplete,
      setLoadingConfirm,
      setLoadingComplete,
      document: order,
    }),
    ...(isConsignment
      ? [
          {
            label: "Crear factura parcial",
            variant: "yellow",
            onClick: () => router.push(`/sales/${order.id}/partial-invoice`),
            disabled: false,
          },
        ]
      : []),
  ];

  return (
    <DocumentDetailBase
      document={order}
      user={user}
      showInvoice
      invoiceTitle={
        order?.state === "draft" || order?.state === "confirmed"
          ? "Factura Proforma"
          : "Factura"
      }
      taxes={selectedCustomerForInvoice?.taxes || []}
      updateDocument={updateOrder}
      deleteDocument={deleteOrder}
      allowManualEntry={false}
      addItem={addItem}
      removeItem={removeItem}
      availableProducts={productsData}
      documentType={config.documentType}
      title={`${order.code || ""} ${
        order.containerCode ? ` | ${order.containerCode}` : ""
      }${isConsignment ? " (Remisión)" : ""}`}
      redirectPath={config.redirectPath}
      headerFields={config.getHeaderFields({
        customers,
        parties,
        warehouses,
        selectedCustomer,
        setSelectedCustomer,
        selectedCustomerForInvoice,
        setSelectedCustomerForInvoice,
        selectedWarehouse,
        setSelectedWarehouse,
        createdDate: order.createdDate,
        confirmedDate: order.confirmedDate,
        actualDispatchDate: order.actualDispatchDate,
      })}
      productColumns={config.getProductColumns}
      actions={enhancedActions}
      customSections={[
        ...(isConsignment
          ? [
              {
                title: "Estado de Remisión",
                render: () => (
                  <div className="p-4 bg-yellow-900/20 border border-yellow-500 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">⚠️</span>
                      <h4 className="font-bold text-yellow-400">
                        Esta orden está en remisión
                      </h4>
                    </div>
                    <p className="text-sm text-yellow-300 mb-3">
                      Los productos han sido despachados pero aún no se han
                      facturado. Puedes crear facturas parciales según el
                      cliente te reporte las ventas.
                    </p>
                    <button
                      onClick={() =>
                        router.push(`/sales/${order.id}/partial-invoice`)
                      }
                      className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-md transition-colors"
                    >
                      Crear Factura Parcial
                    </button>
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
