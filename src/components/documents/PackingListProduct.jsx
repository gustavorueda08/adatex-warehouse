"use client";
import { memo, useMemo, useState } from "react";
import Input from "@/components/ui/Input";
import IconButton from "@/components/ui/IconButton";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import format from "@/lib/utils/format";
import { VirtualizedItemsTable } from "./VirtualizedItemsTable";

/**
 * Componente de producto expandible para listas de empaque
 */
export const PackingListProduct = memo(
  ({
    product,
    productIndex,
    isExpanded,
    onToggle,
    updateItemField,
    handleDeleteItemRow,
    disabled,
    onEnter = () => {},
    loading = false,
    canScanItems = true,
    allowManualEntry = true,
  }) => {
    const [input, setInput] = useState("");

    // Calcular estadísticas del producto
    const stats = useMemo(() => {
      const totalQuantity =
        product?.items?.reduce(
          (acc, item) => acc + Number(item.quantity || 0),
          0
        ) || 0;
      const itemsWithQuantity =
        product.items?.filter((i) => i.quantity > 0).length || 0;
      return { totalQuantity, itemsWithQuantity };
    }, [product.items]);

    return (
      <div className="rounded-md flex flex-col justify-center align-middle gap-3">
        {/* Header del producto */}
        <div
          onClick={onToggle}
          className="flex flex-row justify-between align-middle bg-zinc-700 rounded-md px-2 py-3 hover:bg-zinc-600 transition-colors cursor-pointer"
        >
          <div className="flex flex-col flex-1">
            <h4 className="text-sm font-semibold">
              {product?.product?.name || ""}
            </h4>
            <p className="text-xs text-gray-400 mt-1">
              {stats.itemsWithQuantity} items | Total:{" "}
              {format(stats.totalQuantity)} {product?.product?.unit || ""}
            </p>
          </div>

          {/* Input de escaneo */}
          <div onClick={(e) => e.stopPropagation()} className="w-3/5 px-3">
            <Input
              input={input}
              setInput={setInput}
              placeholder="Escanea o introduce un código o cantidad"
              onEnter={(data) => onEnter(data, setInput)}
              loading={loading}
              disabled={disabled ? disabled : !canScanItems}
            />
          </div>

          {/* Botón de expandir/contraer */}
          <IconButton onClick={onToggle}>
            <ChevronDownIcon
              className={`w-5 h-5 ${
                isExpanded ? "rotate-180" : ""
              } transition-all ease-in delay-75`}
            />
          </IconButton>
        </div>

        {/* Tabla de items (solo si está expandido) */}
        {isExpanded && (
          <VirtualizedItemsTable
            items={product.items}
            productId={product.id}
            updateItemField={updateItemField}
            handleDeleteItemRow={handleDeleteItemRow}
            productIndex={productIndex}
            disabled={disabled}
            allowManualEntry={allowManualEntry}
          />
        )}
      </div>
    );
  }
);
PackingListProduct.displayName = "PackingListProduct";
