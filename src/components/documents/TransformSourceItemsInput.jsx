import { useState, useMemo } from "react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import format from "@/lib/utils/format";

export default function TransformSourceItemsInput({
  value = [],
  onChange,
  availableItems = [],
  readOnly = false,
}) {
  const handleAddItem = () => {
    const newItem = {
      sourceItemId: null,
      sourceQuantityConsumed: "",
      targetQuantity: "",
      quantity: "", // Fallback
    };
    onChange([...value, newItem]);
  };

  const handleRemoveItem = (index) => {
    const newItems = [...value];
    newItems.splice(index, 1);
    onChange(newItems);
  };

  const handleItemChange = (index, field, val) => {
    const newItems = [...value];
    newItems[index] = { ...newItems[index], [field]: val };
    onChange(newItems);
  };

  // Filter available items to show only those with quantity > 0
  const validItems = useMemo(() => {
    return availableItems.filter((item) => item.quantity > 0);
  }, [availableItems]);

  const itemOptions = useMemo(() => {
    return validItems.map((item) => ({
      label: `${item.product?.name || "Item"} - Lote: ${
        item.lot || "N/A"
      } (${format(item.quantity)} disp)`,
      value: item.id,
      item: item,
    }));
  }, [validItems]);

  if (readOnly) {
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div
            key={index}
            className="text-sm bg-zinc-800 p-2 rounded border border-zinc-700"
          >
            <p className="font-medium text-zinc-300">
              {item.sourceItem?.product?.name || "Item Original"} (Lote:{" "}
              {item.sourceItem?.lot})
            </p>
            <div className="flex gap-4 mt-1 text-xs text-zinc-400">
              <span>Consumido: {format(item.sourceQuantityConsumed)}</span>
              <span>Generado: {format(item.targetQuantity)}</span>
            </div>
          </div>
        ))}
        {value.length === 0 && <span className="text-zinc-500">-</span>}
      </div>
    );
  }

  return (
    <div className="space-y-2 min-w-[400px]">
      {value.map((item, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 p-3 bg-zinc-800/50 rounded border border-zinc-700"
        >
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">
                Item Origen
              </label>
              <Select
                value={item.sourceItemId}
                options={itemOptions}
                onChange={(val) => handleItemChange(index, "sourceItemId", val)}
                placeholder="Seleccionar item..."
                className="w-full"
                size="sm"
                searchable
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-6 text-red-400 hover:text-red-300"
              onClick={() => handleRemoveItem(index)}
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">
                Cant. Consumir
              </label>
              <Input
                input={item.sourceQuantityConsumed}
                setInput={(val) =>
                  handleItemChange(index, "sourceQuantityConsumed", val)
                }
                placeholder="0"
                type="number"
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">
                Cant. Generar
              </label>
              <Input
                input={item.targetQuantity}
                setInput={(val) =>
                  handleItemChange(index, "targetQuantity", val)
                }
                placeholder="0"
                type="number"
                className="w-full"
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        variant="zinc"
        size="sm"
        className="w-full border-dashed border-zinc-600 text-zinc-400 hover:text-white"
        onClick={handleAddItem}
      >
        <PlusIcon className="w-4 h-4 mr-2" />
        Agregar Item Origen
      </Button>
    </div>
  );
}
