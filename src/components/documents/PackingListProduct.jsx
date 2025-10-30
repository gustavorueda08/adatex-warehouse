"use client";
import { memo, useMemo, useState } from "react";
import Input from "@/components/ui/Input";
import IconButton from "@/components/ui/IconButton";
import Badge from "@/components/ui/Badge";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { CheckCircleIcon, ClockIcon } from "@heroicons/react/24/outline";
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
    showMainInput = true,
    state,
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
      const requestedQuantity = Number(product?.requestedQuantity || 0);

      return {
        totalQuantity,
        itemsWithQuantity,
        requestedQuantity,
      };
    }, [product.items, product.requestedQuantity]);

    // Determinar estado y estilo del producto
    const productStatus = useMemo(() => {
      const { totalQuantity, requestedQuantity } = stats;
      if (state === "draft") {
        if (totalQuantity === 0) {
          return {
            label: "Sin items",
            variant: "zinc",
            icon: null,
            percent: 0,
            borderColor: "border-neutral-700",
            bgColor: "bg-neutral-800",
          };
        }
        if (requestedQuantity > 0 && totalQuantity >= requestedQuantity) {
          return {
            label: "Completo",
            variant: "emerald",
            icon: CheckCircleIcon,
            percent: 100,
            borderColor: "border-emerald-500/50",
            bgColor: "bg-emerald-900/10",
          };
        }
        if (requestedQuantity > 0) {
          return {
            label: "En progreso",
            variant: "yellow",
            icon: ClockIcon,
            percent: Math.round((totalQuantity / requestedQuantity) * 100),
            borderColor: "border-yellow-500/50",
            bgColor: "bg-yellow-900/10",
          };
        }
      }
      if (state === "confirmed" && requestedQuantity > 0) {
        return {
          label: "Procesando",
          variant: "cyan",
          icon: ClockIcon,
          percent: Math.round((totalQuantity / requestedQuantity) * 100),
          borderColor: "border-cyan-500/50",
          bgColor: "bg-cyan-900/10",
        };
      }
      if (state === "completed" && requestedQuantity > 0) {
        return {
          label: "Completo",
          variant: "emerald",
          icon: CheckCircleIcon,
          percent: Math.round((totalQuantity / requestedQuantity) * 100),
          borderColor: "border-emerald-500/50",
          bgColor: "bg-emerald-900/10",
        };
      }
      return {
        label: "Sin items",
        variant: "zinc",
        icon: null,
        percent: 0,
        borderColor: "border-neutral-700",
        bgColor: "bg-neutral-800",
      };
    }, [stats]);

    const StatusIcon = productStatus.icon;

    return (
      <div
        className={`rounded-lg border-2 ${productStatus.borderColor} ${productStatus.bgColor} overflow-hidden transition-all duration-200`}
      >
        {/* Header del producto */}
        <div
          onClick={onToggle}
          className="flex flex-col md:flex-row md:items-center gap-3 p-4 hover:bg-neutral-700/50 transition-colors cursor-pointer"
        >
          {/* Info del producto y badge */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-sm font-semibold text-white truncate">
                {product?.product?.name || ""}
              </h4>
              <Badge variant={productStatus.variant} className="flex-shrink-0">
                {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
                {productStatus.label}
              </Badge>
            </div>

            {/* Estadísticas y progress bar */}
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span>{stats.itemsWithQuantity} items</span>
                <span>•</span>
                <span>
                  Total: {format(stats.totalQuantity)}{" "}
                  {product?.product?.unit || ""}
                </span>
                {stats.requestedQuantity > 0 && (
                  <>
                    <span>•</span>
                    <span>Solicitado: {format(stats.requestedQuantity)}</span>
                  </>
                )}
              </div>

              {/* Progress bar */}
              {stats.requestedQuantity > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-neutral-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        productStatus.variant === "emerald"
                          ? "bg-emerald-500"
                          : productStatus.variant === "yellow"
                          ? "bg-yellow-500"
                          : "bg-cyan-500"
                      }`}
                      style={{
                        width: `${Math.min(productStatus.percent, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-white min-w-[3rem] text-right">
                    {productStatus.percent}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Input de escaneo */}
          {showMainInput && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full md:w-2/5"
            >
              <Input
                input={input}
                setInput={setInput}
                placeholder="Escanea o introduce un código o cantidad"
                onEnter={(data) => onEnter(data, setInput)}
                loading={loading}
                disabled={disabled ? disabled : !canScanItems}
              />
            </div>
          )}

          {/* Botón de expandir/contraer */}
          <IconButton onClick={onToggle} className="self-start md:self-center">
            <ChevronDownIcon
              className={`w-5 h-5 ${
                isExpanded ? "rotate-180" : ""
              } transition-all ease-in-out duration-200`}
            />
          </IconButton>
        </div>

        {/* Tabla de items (solo si está expandido) */}
        {isExpanded && (
          <div className="border-t border-neutral-700">
            <VirtualizedItemsTable
              items={product.items}
              productId={product.id}
              updateItemField={updateItemField}
              handleDeleteItemRow={handleDeleteItemRow}
              productIndex={productIndex}
              disabled={disabled}
              allowManualEntry={allowManualEntry}
            />
          </div>
        )}
      </div>
    );
  }
);
PackingListProduct.displayName = "PackingListProduct";
