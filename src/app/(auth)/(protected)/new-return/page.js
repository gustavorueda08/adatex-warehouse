"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { useOrders } from "@/lib/hooks/useOrders";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { createReturnFormConfig } from "@/lib/config/documentConfigs";
import ReturnItemSelector from "@/components/documents/ReturnItemSelector";
import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import Select from "@/components/ui/Select";
import moment from "moment-timezone";

export default function NewReturnPage() {
  const router = useRouter();

  // Estado del formulario
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [dateCreated, setDateCreated] = useState(
    moment().tz("America/Bogota").toDate()
  );
  const [returnReason, setReturnReason] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);

  // Hooks para obtener datos
  const { warehouses = [] } = useWarehouses({});

  // Hook para órdenes de venta con sus productos e items
  const { orders = [], createOrder, creating } = useOrders(
    {
      filters: {
        type: "sale",
        state: ["completed"], // Solo órdenes completadas pueden tener devoluciones
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
        console.log("Devolución creada exitosamente:", createdOrder);
        router.push(`/returns/${createdOrder.id}`);
      },
    }
  );

  // Callback cuando se selecciona una orden
  const handleOrderSelect = useCallback((order) => {
    setSelectedOrder(order);
    // Auto-seleccionar bodega de origen
    if (order.sourceWarehouse) {
      setSelectedWarehouse(order.sourceWarehouse);
    }
    // Limpiar items seleccionados
    setSelectedItems([]);
  }, []);

  // Callback cuando se togglea un item
  const handleItemToggle = useCallback((item, checked) => {
    setSelectedItems((current) => {
      if (checked) {
        // Agregar item con cantidad inicial
        const originalQuantity = item.quantity || item.currentQuantity || 0;
        return [
          ...current,
          {
            itemId: item.id,
            productId: item.productId,
            productName: item.productName,
            originalQuantity,
            returnQuantity: originalQuantity, // Por defecto, devolver todo
            lotNumber: item.lotNumber || item.lot,
            itemNumber: item.itemNumber || item.barcode,
            warehouse: item.warehouse,
          },
        ];
      } else {
        // Remover item
        return current.filter((si) => si.itemId !== item.id);
      }
    });
  }, []);

  // Callback cuando se cambia la cantidad de un item
  const handleQuantityChange = useCallback((itemId, newQuantity) => {
    setSelectedItems((current) =>
      current.map((item) =>
        item.itemId === itemId
          ? { ...item, returnQuantity: newQuantity }
          : item
      )
    );
  }, []);

  // Crear la configuración
  const config = createReturnFormConfig({
    orders,
    warehouses,
    onSubmit: async (data) => {
      await createOrder(data);
    },
    loading: creating,
    onOrderSelect: handleOrderSelect,
  });

  // Validar formulario
  const isFormValid =
    selectedOrder &&
    selectedWarehouse &&
    selectedItems.length > 0 &&
    selectedItems.every((item) => item.returnQuantity > 0) &&
    returnReason;

  // Preparar datos para submit
  const handleSubmit = async () => {
    const formState = {
      selectedOrder,
      selectedWarehouse,
      selectedItems,
      dateCreated,
      returnReason,
    };

    const data = config.prepareSubmitData(formState, { id: "current-user" });
    await config.onSubmit(data);
  };

  return (
    <div>
      <h1 className="font-bold text-3xl py-4">{config.title}</h1>

      {/* Header Fields */}
      <div className="space-y-3">
        {/* Primera fila: Orden y Bodega */}
        <div className="w-full md:flex md:flex-row md:gap-3">
          <div className="flex flex-col gap-1 md:flex-1">
            <h2 className="font-medium">Orden de venta</h2>
            <Select
              value={selectedOrder}
              options={orders.map((o) => ({
                label: `${o.code} - ${o.customer?.name || "Sin cliente"}`,
                value: o,
              }))}
              searchable
              onChange={(order) => {
                setSelectedOrder(order);
                handleOrderSelect(order);
              }}
              size="md"
              placeholder="Selecciona una orden..."
            />
          </div>

          <div className="flex flex-col gap-1 mt-3 md:mt-0 md:flex-1">
            <h2 className="font-medium">Bodega destino (devolución)</h2>
            <Select
              value={selectedWarehouse}
              options={warehouses
                .filter((w) => w.type === "stock" || w.type === "printlab")
                .map((w) => ({ label: w.name, value: w }))}
              searchable
              onChange={setSelectedWarehouse}
              size="md"
              placeholder="Selecciona bodega..."
            />
          </div>
        </div>

        {/* Segunda fila: Fecha y Motivo */}
        <div className="w-full md:flex md:flex-row md:gap-3">
          <div className="flex flex-col gap-1 md:flex-1">
            <h2 className="font-medium">Fecha de devolución</h2>
            <DatePicker
              mode="single"
              value={dateCreated}
              onChange={setDateCreated}
            />
          </div>

          <div className="flex flex-col gap-1 mt-3 md:mt-0 md:flex-1">
            <h2 className="font-medium">Motivo de devolución</h2>
            <Select
              value={returnReason}
              options={[
                { label: "Producto defectuoso", value: "defective" },
                { label: "Producto equivocado", value: "wrong_product" },
                { label: "Cliente insatisfecho", value: "unsatisfied" },
                { label: "Otro", value: "other" },
              ]}
              onChange={setReturnReason}
              size="md"
              placeholder="Selecciona motivo..."
            />
          </div>
        </div>
      </div>

      {/* Botón crear (móvil - arriba) */}
      <div className="block w-full pt-4 md:hidden">
        <Button
          className="w-full"
          variant="emerald"
          onClick={handleSubmit}
          disabled={!isFormValid}
          loading={creating}
        >
          Crear devolución
        </Button>
      </div>

      {/* Selector de items */}
      <div className="py-4">
        <h3 className="text-xl pb-2">Items a devolver</h3>
        <ReturnItemSelector
          orderProducts={selectedOrder?.orderProducts || []}
          selectedItems={selectedItems}
          onItemToggle={handleItemToggle}
          onQuantityChange={handleQuantityChange}
          disabled={creating}
        />
      </div>

      {/* Resumen */}
      {selectedItems.length > 0 && (
        <div className="py-4">
          <h3 className="text-xl pb-2">Resumen</h3>
          <div className="bg-zinc-700 rounded-md p-4">
            <p className="text-lg">
              <span className="font-semibold">{selectedItems.length}</span> item
              {selectedItems.length !== 1 ? "s" : ""} seleccionado
              {selectedItems.length !== 1 ? "s" : ""} para devolver
            </p>
            <p className="text-sm text-zinc-400 mt-2">
              Total de unidades a devolver:{" "}
              <span className="font-semibold text-white">
                {selectedItems
                  .reduce((acc, item) => acc + item.returnQuantity, 0)
                  .toLocaleString()}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Botón crear (desktop - abajo) */}
      <div className="hidden w-full pt-4 md:block">
        <Button
          variant="emerald"
          onClick={handleSubmit}
          disabled={!isFormValid}
          loading={creating}
        >
          Crear devolución
        </Button>
      </div>
    </div>
  );
}
