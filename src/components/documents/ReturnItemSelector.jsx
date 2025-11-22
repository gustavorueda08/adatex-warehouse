"use client";

import { useState } from "react";
import classNames from "classnames";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import format from "@/lib/utils/format";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";

/**
 * Componente para seleccionar items de una orden de venta para devolución
 * con una experiencia visual optimizada (resúmenes, barras de progreso y chips informativos)
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

  const isProductFullySelected = (product) => {
    const productItems = product.items || [];
    if (productItems.length === 0) return false;

    return productItems.every((item) =>
      selectedItems.some((si) => si.itemId === item.id)
    );
  };

  const isProductPartiallySelected = (product) => {
    const productItems = product.items || [];
    if (productItems.length === 0) return false;

    const someSelected = productItems.some((item) =>
      selectedItems.some((si) => si.itemId === item.id)
    );
    const allSelected = isProductFullySelected(product);

    return someSelected && !allSelected;
  };

  const toggleAllProductItems = (product) => {
    const productItems = product.items || [];
    const isFullySelected = isProductFullySelected(product);

    productItems.forEach((item) => {
      if (isFullySelected) {
        onItemToggle(item, false);
      } else {
        onItemToggle(item, true);
      }
    });
  };

  const getReturnQuantity = (itemId) => {
    const selectedItem = selectedItems.find((si) => si.itemId === itemId);
    return selectedItem?.returnQuantity || 0;
  };

  const isItemSelected = (itemId) => {
    return selectedItems.some((si) => si.itemId === itemId);
  };

  const getProductStats = (product) => {
    const items = product.items || [];
    let totalOriginal = 0;
    let totalReturn = 0;
    let selectedCount = 0;

    items.forEach((item) => {
      const original = item.quantity || item.currentQuantity || 0;
      totalOriginal += original;
      totalReturn += getReturnQuantity(item.id);
      if (isItemSelected(item.id)) {
        selectedCount += 1;
      }
    });

    const percentage =
      totalOriginal > 0
        ? Math.min(100, (totalReturn / totalOriginal) * 100)
        : 0;

    return { totalOriginal, totalReturn, selectedCount, percentage };
  };

  return (
    <div className="space-y-4">
      {orderProducts.length === 0 ? (
        <div className="p-10 text-center text-zinc-500 border border-dashed border-zinc-600 rounded-2xl bg-zinc-900/30">
          Selecciona una orden de venta para ver sus productos
        </div>
      ) : (
        orderProducts.map((product) => {
          const isExpanded = expandedProducts.has(product.id);
          const items = product.items || [];
          const { totalOriginal, totalReturn, selectedCount, percentage } =
            getProductStats(product);
          const isFullySelected = isProductFullySelected(product);
          const isPartiallySelected = isProductPartiallySelected(product);
          const hasSelections = selectedCount > 0;
          const unitLabel = product.product?.unit || "";

          return (
            <div
              key={product.id}
              className={classNames(
                "rounded-2xl border transition-all duration-300 overflow-hidden",
                hasSelections
                  ? "border-emerald-500/60 bg-emerald-500/5 shadow-lg shadow-emerald-500/10"
                  : "border-zinc-700 bg-zinc-800/60",
                disabled && "opacity-60"
              )}
            >
              <div className="p-5 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-5">
                  <Checkbox
                    variant="cyan"
                    checked={isFullySelected}
                    indeterminate={isPartiallySelected}
                    onCheck={() => toggleAllProductItems(product)}
                    disabled={disabled || items.length === 0}
                    className="mt-0.5"
                  />

                  <div className="flex-1 space-y-3">
                    <div
                      className="flex items-start justify-between gap-4 cursor-pointer"
                      onClick={() => toggleProduct(product.id)}
                    >
                      <div>
                        <h3 className="text-lg font-semibold">
                          {product.product?.name || product.name}
                        </h3>
                        <p className="text-sm text-zinc-400">
                          {items.filter((i) => i.state === "sold").length} item
                          {items.filter((i) => i.state === "sold").length !== 1
                            ? "s"
                            : ""}{" "}
                          disponibles
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs uppercase text-zinc-400 tracking-wide">
                            Unidades seleccionadas
                          </p>
                          <p className="text-sm font-semibold">
                            {format(totalReturn)} / {format(totalOriginal)}{" "}
                            {unitLabel}
                          </p>
                        </div>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleProduct(product.id);
                          }}
                          className="p-2 hover:bg-zinc-700 rounded transition-colors"
                          disabled={disabled}
                          aria-label={isExpanded ? "Colapsar" : "Expandir"}
                        >
                          {isExpanded ? (
                            <ChevronUpIcon className="w-5 h-5" />
                          ) : (
                            <ChevronDownIcon className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {items.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <InfoChip
                          label="Items"
                          value={`${selectedCount}/${
                            items.filter((i) => i.state === "sold").length
                          }`}
                        />
                        <InfoChip
                          label="Unidades"
                          value={`${format(totalReturn)} / ${format(
                            totalOriginal
                          )} ${unitLabel}`}
                        />
                        {hasSelections && (
                          <InfoChip
                            label="Restantes"
                            value={`${format(
                              totalOriginal - totalReturn
                            )} ${unitLabel}`}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Progreso de devolución</span>
                      <span>{Math.round(percentage)}%</span>
                    </div>
                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-zinc-700 bg-zinc-900/40">
                  {items.length === 0 ? (
                    <div className="p-4 text-center text-zinc-500">
                      Este producto no tiene items
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 p-4">
                      {items.map((item) => {
                        const originalQuantity =
                          item.quantity || item.currentQuantity || 0;
                        const returnQuantity = getReturnQuantity(item.id);
                        const selected = isItemSelected(item.id);

                        return (
                          <div
                            key={item.id}
                            className={classNames(
                              "p-4 md:p-5 rounded-2xl border transition-all duration-200",
                              selected
                                ? "border-emerald-500/60 bg-emerald-500/10 shadow-inner shadow-emerald-500/20"
                                : "border-zinc-700 bg-zinc-900/30 hover:border-cyan-500/40"
                            )}
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                              <Checkbox
                                variant={selected ? "emerald" : "cyan"}
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
                                disabled={disabled || item.state !== "sold"}
                                className="md:self-start"
                              />

                              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <p className="text-xs text-zinc-400 uppercase tracking-wide">
                                    Lote
                                  </p>
                                  <p className="font-mono text-sm">
                                    {item.lotNumber || item.lot || "-"}
                                  </p>
                                  <p className="text-xs text-zinc-500 mt-1">
                                    Código:{" "}
                                    {item.itemNumber || item.barcode || "-"}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs text-zinc-400 uppercase tracking-wide">
                                    Bodega
                                  </p>
                                  <p className="text-sm font-semibold">
                                    {item.warehouse?.name || "-"}
                                  </p>
                                  <p className="text-xs text-zinc-500">
                                    Disponible: {format(originalQuantity)}{" "}
                                    {unitLabel}
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <p className="text-xs text-zinc-400 uppercase tracking-wide">
                                    Cantidad a devolver
                                  </p>
                                  <Input
                                    type="number"
                                    input={returnQuantity}
                                    setInput={(value) => {
                                      const numValue = Number(value) || 0;
                                      const validValue = Math.min(
                                        Math.max(0, numValue),
                                        originalQuantity
                                      );
                                      onQuantityChange(item.id, validValue);
                                    }}
                                    placeholder="0"
                                    disabled={disabled || !selected}
                                    className="max-w-36"
                                    min={0}
                                    max={originalQuantity}
                                  />
                                  <p className="text-[11px] text-zinc-500">
                                    Máx: {format(originalQuantity)} {unitLabel}
                                  </p>
                                </div>
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

function InfoChip({ label, value }) {
  return (
    <div className="px-3 py-1 rounded-full bg-zinc-900/60 border border-zinc-700 text-xs text-zinc-200 flex items-center gap-2">
      <span className="uppercase tracking-wide text-[10px] text-zinc-500">
        {label}
      </span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
