"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { useOrders } from "@/lib/hooks/useOrders";
import { useProducts } from "@/lib/hooks/useProducts";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { useItems } from "@/lib/hooks/useItems";
import { createTransformFormConfig } from "@/lib/config/documentConfigs";
import TransformItemSelector from "@/components/documents/TransformItemSelector";
import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import Select from "@/components/ui/Select";
import moment from "moment-timezone";
import format from "@/lib/utils/format";

export default function NewTransformPage() {
  const router = useRouter();

  // Estado del formulario
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [transformationType, setTransformationType] =
    useState("transformation");
  const [dateCreated, setDateCreated] = useState(
    moment().tz("America/Bogota").toDate()
  );
  const [selectedTransforms, setSelectedTransforms] = useState([]);

  // Hooks para obtener datos
  const { products: productsData = [] } = useProducts({});
  const { warehouses = [] } = useWarehouses({});

  // Obtener items de inventario disponibles en la bodega seleccionada
  const { items: availableItems = [] } = useItems(
    {
      filters: selectedWarehouse
        ? {
            warehouse: selectedWarehouse.id,
          }
        : {},
      populate: ["product", "warehouse"],
    },
    {
      enabled: !!selectedWarehouse,
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

  // Callback cuando se agrega una transformación
  const handleTransformAdd = useCallback((transform) => {
    setSelectedTransforms((current) => [...current, transform]);
  }, []);

  // Callback cuando se actualiza una transformación
  const handleTransformUpdate = useCallback((sourceItemId, updates) => {
    setSelectedTransforms((current) =>
      current.map((t) =>
        t.sourceItemId === sourceItemId ? { ...t, ...updates } : t
      )
    );
  }, []);

  // Callback cuando se remueve una transformación
  const handleTransformRemove = useCallback((sourceItemId) => {
    setSelectedTransforms((current) =>
      current.filter((t) => t.sourceItemId !== sourceItemId)
    );
  }, []);

  // Limpiar transformaciones cuando cambia la bodega o tipo
  const handleWarehouseChange = useCallback((warehouse) => {
    setSelectedWarehouse(warehouse);
    setSelectedTransforms([]); // Limpiar transformaciones al cambiar bodega
  }, []);

  const handleTransformationTypeChange = useCallback((type) => {
    setTransformationType(type);
    setSelectedTransforms([]); // Limpiar transformaciones al cambiar tipo
  }, []);

  // Crear la configuración
  const config = createTransformFormConfig({
    warehouses,
    productsData,
    onSubmit: async (data) => {
      await createOrder(data);
    },
    loading: creating,
  });

  // Validar formulario
  const isFormValid =
    selectedWarehouse &&
    selectedTransforms.length > 0 &&
    selectedTransforms.every(
      (t) =>
        t.targetProductId &&
        t.sourceQuantityConsumed > 0 &&
        t.targetQuantity > 0
    );

  // Preparar datos para submit
  const handleSubmit = async () => {
    const formState = {
      selectedWarehouse,
      transformationType,
      selectedTransforms,
      dateCreated,
    };

    const data = config.prepareSubmitData(formState, { id: "current-user" });
    await config.onSubmit(data);
  };

  // Calcular totales
  const totalSourceQuantity = selectedTransforms.reduce(
    (acc, t) => acc + Number(t.sourceQuantityConsumed || 0),
    0
  );
  const totalTargetQuantity = selectedTransforms.reduce(
    (acc, t) => acc + Number(t.targetQuantity || 0),
    0
  );

  return (
    <div>
      <h1 className="font-bold text-3xl py-4">{config.title}</h1>

      {/* Header Fields */}
      <div className="space-y-3">
        {/* Primera fila: Bodega y Tipo */}
        <div className="w-full md:flex md:flex-row md:gap-3">
          <div className="flex flex-col gap-1 md:flex-1">
            <h2 className="font-medium">Bodega</h2>
            <Select
              value={selectedWarehouse}
              options={warehouses
                .filter((w) => w.type === "stock" || w.type === "printlab")
                .map((w) => ({ label: w.name, value: w }))}
              searchable
              onChange={handleWarehouseChange}
              size="md"
              placeholder="Selecciona bodega..."
            />
          </div>

          <div className="flex flex-col gap-1 mt-3 md:mt-0 md:flex-1">
            <h2 className="font-medium">Tipo de transformación</h2>
            <Select
              value={transformationType}
              options={[
                {
                  label: "Transformación (producto diferente)",
                  value: "transformation",
                },
                {
                  label: "Partición/Corte (mismo producto)",
                  value: "partition",
                },
              ]}
              onChange={handleTransformationTypeChange}
              size="md"
            />
          </div>
        </div>

        {/* Segunda fila: Fecha */}
        <div className="w-full md:flex md:flex-row md:gap-3">
          <div className="flex flex-col gap-1 md:flex-1">
            <h2 className="font-medium">Fecha de Creación</h2>
            <DatePicker
              mode="single"
              value={dateCreated}
              onChange={setDateCreated}
            />
          </div>
          <div className="flex flex-col gap-1 mt-3 md:mt-0 md:flex-1">
            {/* Espacio vacío para mantener el diseño */}
          </div>
        </div>
      </div>

      {/* Info sobre el tipo de transformación */}
      <div className="py-4">
        <div className="p-4 bg-cyan-900/20 border border-cyan-500 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">ℹ️</span>
            <h4 className="font-bold text-cyan-400">
              {transformationType === "partition"
                ? "Partición/Corte"
                : "Transformación"}
            </h4>
          </div>
          <p className="text-sm text-cyan-300">
            {transformationType === "partition"
              ? "Divide items del mismo producto en items más pequeños. Los items resultantes mantienen referencia al item padre."
              : "Convierte items de un producto en otro producto diferente. Especifica el producto destino, cantidad a consumir y cantidad resultante."}
          </p>
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
          Crear transformación
        </Button>
      </div>

      {/* Selector de items para transformar */}
      <div className="py-4">
        <h3 className="text-xl pb-2">Items a transformar</h3>
        {!selectedWarehouse ? (
          <div className="p-8 text-center text-zinc-500 bg-zinc-700 rounded-md">
            Selecciona una bodega para ver los items disponibles
          </div>
        ) : (
          <TransformItemSelector
            availableItems={availableItems}
            productsData={productsData}
            selectedTransforms={selectedTransforms}
            onTransformAdd={handleTransformAdd}
            onTransformUpdate={handleTransformUpdate}
            onTransformRemove={handleTransformRemove}
            transformationType={transformationType}
            disabled={creating}
          />
        )}
      </div>

      {/* Resumen */}
      {selectedTransforms.length > 0 && (
        <div className="py-4">
          <h3 className="text-xl pb-2">Resumen</h3>
          <div className="bg-zinc-700 rounded-md p-4 space-y-2">
            <p className="text-lg">
              <span className="font-semibold">{selectedTransforms.length}</span>{" "}
              transformación{selectedTransforms.length !== 1 ? "es" : ""}{" "}
              configurada{selectedTransforms.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="p-3 bg-zinc-600 rounded">
                <p className="text-sm text-zinc-400">Total a consumir</p>
                <p className="text-xl font-semibold text-white">
                  {format(totalSourceQuantity)}
                </p>
              </div>
              <div className="p-3 bg-zinc-600 rounded">
                <p className="text-sm text-zinc-400">Total a crear</p>
                <p className="text-xl font-semibold text-emerald-400">
                  {format(totalTargetQuantity)}
                </p>
              </div>
            </div>
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
          Crear transformación
        </Button>
      </div>
    </div>
  );
}
