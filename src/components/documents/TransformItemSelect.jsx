import { useMemo } from "react";
import Select from "@/components/ui/Select";
import format from "@/lib/utils/format";
import { useItemSelector } from "@/lib/hooks/useItemSelector";

export default function TransformItemSelect({
  value,
  onChange,
  warehouseId,
  disabled,
  placeholder = "Buscar item...",
}) {
  const {
    items: availableItems,
    loading,
    loadingMore,
    hasMore,
    onLoadMore,
    onSearch,
    searchValue,
  } = useItemSelector({ warehouseId });

  const itemOptions = useMemo(() => {
    // If current value is not in availableItems (e.g. initial load), we might want to fetch it or handle it.
    // However, for now, we rely on search finding it.
    // Ideally, we should add the current 'value' (if it's an object) to options if not present.
    // But value here is likely just ID?
    // If value is ID, Select component usually needs the option to be present to show the label.
    // If 'value' is passed as the Item object, it's easier.
    
    return availableItems.map((item) => ({
      label: `${item.product?.name || "Item"} - ${
        item.product?.barcode || "S/B"
      } - ${format(item.currentQuantity ?? item.quantity)} ${
        item.product?.unit || ""
      } - Lote: ${item.lot || "N/A"}`,
      value: item.id,
      item: item,
    }));
  }, [availableItems]);

  const handleChange = (val) => {
    // val is the selected ID
    const selectedItem = availableItems.find(i => i.id === val);
    // Return the full object so parent can access properties like currentQuantity
    onChange(selectedItem);
  };

  return (
    <Select
      value={value?.id || value} // Handle both object and ID
      options={itemOptions}
      onChange={handleChange}
      placeholder={placeholder}
      className="w-full min-w-[300px]"
      searchable
      onSearch={onSearch}
      searchValue={searchValue}
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      onLoadMore={onLoadMore}
      emptyMessage={
        warehouseId ? "No se encontraron items" : "Selecciona una bodega primero"
      }
      disabled={disabled || !warehouseId}
    />
  );
}
