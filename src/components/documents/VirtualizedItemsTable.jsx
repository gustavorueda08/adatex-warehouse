"use client";
import { memo, useRef } from "react";
import { List } from "react-window";
import Input from "@/components/ui/Input";
import IconButton from "@/components/ui/IconButton";
import { TrashIcon } from "@heroicons/react/24/solid";
import { InboxIcon } from "@heroicons/react/24/outline";

/**
 * Input con debounce para items
 */
const DebouncedInput = memo(
  ({ value: initialValue, onChange, disabled, placeholder }) => {
    return (
      <Input
        disabled={disabled}
        placeholder={placeholder}
        input={initialValue}
        setInput={onChange}
      />
    );
  }
);
DebouncedInput.displayName = "DebouncedInput";

/**
 * Componente de fila para la lista virtualizada
 */
const VirtualizedRow = memo(({ index, style, ...data }) => {
  const {
    items,
    productId,
    updateItemField,
    disabled,
    handleDeleteItemRow,
    allowManualEntry,
  } = data;

  const item = items?.[index];

  if (!item) return null;

  return (
    <div
      style={style}
      className="flex items-center gap-2 px-4 border-b border-neutral-700 hover:bg-neutral-800"
    >
      <div className="flex-1 min-w-0">
        <DebouncedInput
          value={item.quantity}
          onChange={(value) =>
            updateItemField(productId, item.id, "quantity", value)
          }
          disabled={disabled ? disabled : !allowManualEntry}
          placeholder="Cantidad"
        />
      </div>
      <div className="flex-1 min-w-0">
        <DebouncedInput
          value={item.lotNumber}
          onChange={(value) =>
            updateItemField(productId, item.id, "lotNumber", value)
          }
          disabled={disabled ? disabled : !allowManualEntry}
          placeholder="Lote"
        />
      </div>
      <div className="flex-1 min-w-0">
        <DebouncedInput
          value={item.itemNumber}
          onChange={(value) =>
            updateItemField(productId, item.id, "itemNumber", value)
          }
          disabled={disabled ? disabled : !allowManualEntry}
          placeholder="Número"
        />
      </div>
      {!disabled && (
        <div className="w-10">
          {item.quantity !== "" && (
            <IconButton
              onClick={() => handleDeleteItemRow(productId, item.id)}
              variant="red"
              size="sm"
            >
              <TrashIcon className="w-4 h-4" />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
});
VirtualizedRow.displayName = "VirtualizedRow";

/**
 * Tabla virtualizada para items
 */
export const VirtualizedItemsTable = memo(
  ({
    items,
    productId,
    updateItemField,
    handleDeleteItemRow,
    productIndex,
    disabled,
    allowManualEntry,
  }) => {
    const listRef = useRef(null);
    const ROW_HEIGHT = 60;
    const HEADER_HEIGHT = 50;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return (
        <div className="bg-neutral-900 p-12 text-center">
          <InboxIcon className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 font-medium">No hay items para mostrar</p>
          <p className="text-gray-500 text-sm mt-2">
            Agrega items usando el campo de entrada o carga masiva
          </p>
        </div>
      );
    }

    const tableHeight = Math.min(
      items.length * ROW_HEIGHT + HEADER_HEIGHT,
      500
    );

    // Datos que se pasan a cada fila
    const itemData = {
      items,
      productId,
      updateItemField,
      disabled,
      handleDeleteItemRow,
      productIndex,
      allowManualEntry,
    };

    return (
      <div className="bg-neutral-900 rounded-md overflow-hidden">
        {/* Header de la tabla */}
        <div className="flex items-center gap-2 px-4 py-3 bg-neutral-800 font-semibold text-sm border-b border-neutral-700">
          <div className="flex-1">Cantidad</div>
          <div className="flex-1">Lote</div>
          <div className="flex-1">Número de Item</div>
          {!disabled && <div className="w-10">Acción</div>}
        </div>

        {/* Lista virtualizada */}
        <List
          ref={listRef}
          height={tableHeight - HEADER_HEIGHT}
          rowComponent={VirtualizedRow}
          rowCount={items.length}
          rowHeight={ROW_HEIGHT}
          width="100%"
          rowProps={itemData}
        />

        {/* Footer con estadísticas mejorado */}
        <div className="px-4 py-3 bg-neutral-800 border-t border-neutral-700">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="text-gray-400">
                Total de items:{" "}
                <span className="font-semibold text-white">{items.length}</span>
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-400">
                Items con cantidad:{" "}
                <span className="font-semibold text-emerald-400">
                  {items.filter((i) => i.quantity > 0).length}
                </span>
              </span>
            </div>
            {items.filter((i) => i.quantity > 0).length < items.length && (
              <span className="text-yellow-400 text-xs">
                {items.length - items.filter((i) => i.quantity > 0).length} items
                pendientes
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);
VirtualizedItemsTable.displayName = "VirtualizedItemsTable";
