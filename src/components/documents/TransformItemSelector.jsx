"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import format from "@/lib/utils/format";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";

/**
 * Componente para seleccionar items de inventario para transformación
 * Permite especificar el producto destino, cantidad a consumir y cantidad resultante
 */
export default function TransformItemSelector({
  availableItems = [], // Items disponibles en inventario
  productsData = [], // Lista de productos para seleccionar destino
  selectedTransforms = [], // Array de transformaciones seleccionadas
  onTransformAdd, // Función para agregar una transformación
  onTransformUpdate, // Función para actualizar una transformación
  onTransformRemove, // Función para remover una transformación
  transformationType = "transformation", // "transformation" o "partition"
  disabled = false,
}) {
  const [expandedItems, setExpandedItems] = useState(new Set());

  const toggleItem = (itemId) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Verificar si un item está seleccionado para transformación
  const isItemSelected = (itemId) => {
    return selectedTransforms.some((t) => t.sourceItemId === itemId);
  };

  // Obtener transformación de un item
  const getTransform = (itemId) => {
    return selectedTransforms.find((t) => t.sourceItemId === itemId);
  };

  // Agrupar items por producto
  const itemsByProduct = availableItems.reduce((acc, item) => {
    const productId = item.product?.id;
    if (!productId) return acc;

    if (!acc[productId]) {
      acc[productId] = {
        product: item.product,
        items: [],
      };
    }
    acc[productId].items.push(item);
    return acc;
  }, {});

  const productGroups = Object.values(itemsByProduct);

  return (
    <div className="space-y-3">
      {productGroups.length === 0 ? (
        <div className="p-8 text-center text-zinc-500">
          No hay items disponibles en inventario
        </div>
      ) : (
        productGroups.map((group) => {
          const productId = group.product.id;
          const items = group.items;

          return (
            <div
              key={productId}
              className="bg-zinc-700 rounded-md overflow-hidden"
            >
              {/* Header del producto origen */}
              <div className="p-4 bg-zinc-600">
                <h3 className="font-semibold text-lg">{group.product.name}</h3>
                <p className="text-sm text-zinc-300">
                  {items.length} item{items.length !== 1 ? "s" : ""} disponibles
                </p>
              </div>

              {/* Items */}
              <div className="divide-y divide-zinc-600">
                {items.map((item) => {
                  const isExpanded = expandedItems.has(item.id);
                  const selected = isItemSelected(item.id);
                  const transform = getTransform(item.id);
                  const currentQuantity = item.currentQuantity || 0;

                  return (
                    <div key={item.id} className="bg-zinc-700">
                      {/* Item header */}
                      <div className="p-4 flex items-center gap-3">
                        {/* Checkbox */}
                        <Checkbox
                          variant="cyan"
                          checked={selected}
                          onCheck={(checked) => {
                            if (checked) {
                              onTransformAdd({
                                sourceItemId: item.id,
                                sourceItem: item,
                                sourceProductId: group.product.id,
                                sourceProductName: group.product.name,
                                sourceQuantityConsumed: 0,
                                targetProductId:
                                  transformationType === "partition"
                                    ? group.product.id
                                    : null,
                                targetProduct:
                                  transformationType === "partition"
                                    ? group.product
                                    : null,
                                targetQuantity: 0,
                                warehouse: item.warehouse?.id,
                              });
                              setExpandedItems((prev) =>
                                new Set(prev).add(item.id)
                              );
                            } else {
                              onTransformRemove(item.id);
                              setExpandedItems((prev) => {
                                const next = new Set(prev);
                                next.delete(item.id);
                                return next;
                              });
                            }
                          }}
                          disabled={disabled}
                        />

                        {/* Info del item */}
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => toggleItem(item.id)}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div>
                              <p className="text-xs text-zinc-400">
                                Lote / Código
                              </p>
                              <p className="font-mono text-sm">
                                {item.lotNumber || "-"} /{" "}
                                {item.itemNumber || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-400">Bodega</p>
                              <p className="text-sm">
                                {item.warehouse?.name || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-400">
                                Cantidad disponible
                              </p>
                              <p className="text-sm font-semibold">
                                {format(currentQuantity)} {group.product.unit}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Toggle button */}
                        {selected && (
                          <button
                            onClick={() => toggleItem(item.id)}
                            className="p-2 hover:bg-zinc-600 rounded transition-colors"
                            disabled={disabled}
                          >
                            {isExpanded ? (
                              <ChevronUpIcon className="w-5 h-5" />
                            ) : (
                              <ChevronDownIcon className="w-5 h-5" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Detalles de transformación */}
                      {selected && isExpanded && (
                        <div className="border-t border-zinc-600 bg-zinc-800 p-4 space-y-4">
                          {/* Producto destino */}
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Producto destino
                            </label>
                            <Select
                              value={transform?.targetProduct || null}
                              options={
                                transformationType === "partition"
                                  ? [
                                      {
                                        label: group.product.name,
                                        value: group.product,
                                      },
                                    ]
                                  : productsData.map((p) => ({
                                      label: p.name,
                                      value: p,
                                    }))
                              }
                              onChange={(product) => {
                                onTransformUpdate(item.id, {
                                  targetProductId: product.id,
                                  targetProduct: product,
                                });
                              }}
                              searchable={transformationType !== "partition"}
                              disabled={
                                disabled || transformationType === "partition"
                              }
                              placeholder="Selecciona producto destino"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Cantidad a consumir */}
                            <div>
                              <label className="block text-sm font-medium mb-2">
                                Cantidad a consumir ({group.product.unit})
                              </label>
                              <Input
                                type="number"
                                input={transform?.sourceQuantityConsumed || ""}
                                setInput={(value) => {
                                  const numValue = Number(value) || 0;
                                  const validValue = Math.min(
                                    Math.max(0, numValue),
                                    currentQuantity
                                  );
                                  onTransformUpdate(item.id, {
                                    sourceQuantityConsumed: validValue,
                                  });
                                }}
                                placeholder="0"
                                disabled={disabled}
                                min={0}
                                max={currentQuantity}
                              />
                              <p className="text-xs text-zinc-400 mt-1">
                                Máximo: {format(currentQuantity)}{" "}
                                {group.product.unit}
                              </p>
                            </div>

                            {/* Cantidad resultante */}
                            <div>
                              <label className="block text-sm font-medium mb-2">
                                Cantidad resultante (
                                {transform?.targetProduct?.unit ||
                                  group.product.unit}
                                )
                              </label>
                              <Input
                                type="number"
                                input={transform?.targetQuantity || ""}
                                setInput={(value) => {
                                  const numValue = Number(value) || 0;
                                  onTransformUpdate(item.id, {
                                    targetQuantity: Math.max(0, numValue),
                                  });
                                }}
                                placeholder="0"
                                disabled={disabled}
                                min={0}
                              />
                              {transformationType === "partition" && (
                                <p className="text-xs text-zinc-400 mt-1">
                                  Para partición, generalmente igual a la
                                  cantidad consumida
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Información adicional */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Lote destino */}
                            <div>
                              <label className="block text-sm font-medium mb-2">
                                Número de lote (opcional)
                              </label>
                              <Input
                                type="text"
                                input={transform?.lotNumber || ""}
                                setInput={(value) => {
                                  onTransformUpdate(item.id, {
                                    lotNumber: value,
                                  });
                                }}
                                placeholder="LOT-2025-01"
                                disabled={disabled}
                              />
                            </div>

                            {/* Código de item destino */}
                            <div>
                              <label className="block text-sm font-medium mb-2">
                                Código de item (opcional)
                              </label>
                              <Input
                                type="text"
                                input={transform?.itemNumber || ""}
                                setInput={(value) => {
                                  onTransformUpdate(item.id, {
                                    itemNumber: value,
                                  });
                                }}
                                placeholder="001"
                                disabled={disabled}
                              />
                            </div>
                          </div>

                          {/* Resumen */}
                          <div className="p-3 bg-cyan-900/20 border border-cyan-600 rounded">
                            <p className="text-sm font-medium mb-1">
                              Resumen de transformación:
                            </p>
                            <p className="text-sm text-cyan-300">
                              {format(transform?.sourceQuantityConsumed || 0)}{" "}
                              {group.product.unit} de{" "}
                              <span className="font-semibold">
                                {group.product.name}
                              </span>{" "}
                              →{" "}
                              {format(transform?.targetQuantity || 0)}{" "}
                              {transform?.targetProduct?.unit ||
                                group.product.unit}{" "}
                              de{" "}
                              <span className="font-semibold">
                                {transform?.targetProduct?.name ||
                                  "(selecciona producto)"}
                              </span>
                            </p>
                            {transformationType === "partition" && (
                              <p className="text-xs text-yellow-400 mt-2">
                                ⚠️ Partición: El item resultante tendrá
                                referencia al item padre
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
