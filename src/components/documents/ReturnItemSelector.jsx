"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import format from "@/lib/utils/format";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";

/**
 * Componente para seleccionar items de una orden de venta para devolución
 * Muestra productos colapsables con sus items, permitiendo seleccionar cuáles devolver
 * y ajustar las cantidades de devolución (parciales o totales)
 */
export default function ReturnItemSelector({
  orderProducts = [],
  selectedItems = [],
  onItemToggle,
  onQuantityChange,
  disabled = false,
}) {
  const [expandedProducts, setExpandedProducts] = useState(new Set());

  const toggleProduct = (productId) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Calcular si un producto tiene todos sus items seleccionados
  const isProductFullySelected = (product) => {
    const productItems = product.items || [];
    if (productItems.length === 0) return false;

    return productItems.every((item) =>
      selectedItems.some((si) => si.itemId === item.id)
    );
  };

  // Calcular si un producto tiene algunos items seleccionados
  const isProductPartiallySelected = (product) => {
    const productItems = product.items || [];
    if (productItems.length === 0) return false;

    const someSelected = productItems.some((item) =>
      selectedItems.some((si) => si.itemId === item.id)
    );
    const allSelected = isProductFullySelected(product);

    return someSelected && !allSelected;
  };

  // Toggle todos los items de un producto
  const toggleAllProductItems = (product) => {
    const productItems = product.items || [];
    const isFullySelected = isProductFullySelected(product);

    productItems.forEach((item) => {
      if (isFullySelected) {
        // Deseleccionar todos
        onItemToggle(item, false);
      } else {
        // Seleccionar todos
        onItemToggle(item, true);
      }
    });
  };

  // Obtener cantidad actual de devolución de un item
  const getReturnQuantity = (itemId) => {
    const selectedItem = selectedItems.find((si) => si.itemId === itemId);
    return selectedItem?.returnQuantity || 0;
  };

  // Verificar si un item está seleccionado
  const isItemSelected = (itemId) => {
    return selectedItems.some((si) => si.itemId === itemId);
  };

  // Calcular totales por producto
  const getProductTotals = (product) => {
    const items = product.items || [];
    const totalOriginal = items.reduce(
      (acc, item) => acc + (item.quantity || item.currentQuantity || 0),
      0
    );
    const totalReturn = items.reduce((acc, item) => {
      const returnQty = getReturnQuantity(item.id);
      return acc + returnQty;
    }, 0);

    return { totalOriginal, totalReturn };
  };

  return (
    <div className="space-y-3">
      {orderProducts.length === 0 ? (
        <div className="p-8 text-center text-zinc-500">
          Selecciona una orden de venta para ver sus productos
        </div>
      ) : (
        orderProducts.map((product) => {
          const isExpanded = expandedProducts.has(product.id);
          const items = product.items || [];
          const { totalOriginal, totalReturn } = getProductTotals(product);
          const isFullySelected = isProductFullySelected(product);
          const isPartiallySelected = isProductPartiallySelected(product);

          return (
            <div
              key={product.id}
              className="bg-zinc-700 rounded-md overflow-hidden"
            >
              {/* Header del producto */}
              <div className="p-4 flex items-center gap-3">
                {/* Checkbox para seleccionar todos los items del producto */}
                <Checkbox
                  variant="cyan"
                  checked={isFullySelected}
                  indeterminate={isPartiallySelected}
                  onCheck={() => toggleAllProductItems(product)}
                  disabled={disabled || items.length === 0}
                />

                {/* Info del producto */}
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => toggleProduct(product.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {product.product?.name || product.name}
                      </h3>
                      <p className="text-sm text-zinc-400">
                        {items.length} item{items.length !== 1 ? "s" : ""}{" "}
                        disponibles
                      </p>
                    </div>
                    <div className="text-right mr-2">
                      <p className="text-sm text-zinc-400">
                        Devolver: {format(totalReturn)} / {format(totalOriginal)}{" "}
                        {product.product?.unit || ""}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Toggle button */}
                <button
                  onClick={() => toggleProduct(product.id)}
                  className="p-2 hover:bg-zinc-600 rounded transition-colors"
                  disabled={disabled}
                >
                  {isExpanded ? (
                    <ChevronUpIcon className="w-5 h-5" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Items del producto */}
              {isExpanded && (
                <div className="border-t border-zinc-600 bg-zinc-800">
                  {items.length === 0 ? (
                    <div className="p-4 text-center text-zinc-500">
                      Este producto no tiene items
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-600">
                      {items.map((item) => {
                        const originalQuantity =
                          item.quantity || item.currentQuantity || 0;
                        const returnQuantity = getReturnQuantity(item.id);
                        const selected = isItemSelected(item.id);

                        return (
                          <div
                            key={item.id}
                            className="p-4 flex items-center gap-4"
                          >
                            {/* Checkbox del item */}
                            <Checkbox
                              variant="cyan"
                              checked={selected}
                              onCheck={(checked) =>
                                onItemToggle(
                                  {
                                    ...item,
                                    productId: product.product?.id,
                                    productName: product.product?.name,
                                  },
                                  checked
                                )
                              }
                              disabled={disabled}
                            />

                            {/* Info del item */}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                              {/* Lote y código */}
                              <div>
                                <p className="text-xs text-zinc-400">
                                  Lote / Código
                                </p>
                                <p className="font-mono text-sm">
                                  {item.lotNumber || item.lot || "-"} /{" "}
                                  {item.itemNumber || item.barcode || "-"}
                                </p>
                              </div>

                              {/* Bodega */}
                              <div>
                                <p className="text-xs text-zinc-400">Bodega</p>
                                <p className="text-sm">
                                  {item.warehouse?.name || "-"}
                                </p>
                              </div>

                              {/* Cantidad original */}
                              <div>
                                <p className="text-xs text-zinc-400">
                                  Cantidad original
                                </p>
                                <p className="text-sm font-semibold">
                                  {format(originalQuantity)}{" "}
                                  {product.product?.unit || ""}
                                </p>
                              </div>

                              {/* Cantidad a devolver */}
                              <div>
                                <p className="text-xs text-zinc-400 mb-1">
                                  Cantidad a devolver
                                </p>
                                <Input
                                  type="number"
                                  input={returnQuantity}
                                  setInput={(value) => {
                                    const numValue = Number(value) || 0;
                                    // Validar que no exceda la cantidad original
                                    const validValue = Math.min(
                                      Math.max(0, numValue),
                                      originalQuantity
                                    );
                                    onQuantityChange(item.id, validValue);
                                  }}
                                  placeholder="0"
                                  disabled={disabled || !selected}
                                  className="max-w-28"
                                  min={0}
                                  max={originalQuantity}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
