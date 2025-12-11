import { useMemo } from "react";
import Select from "@/components/ui/Select";
import format from "@/lib/utils/format";
import { useItemSelector } from "@/lib/hooks/useItemSelector";

export default function TransformItemSelect({
  value,
  onChange,
  warehouseId,
  productId,
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
  } = useItemSelector({ warehouseId, productId });

  const itemOptions = useMemo(() => {
    return availableItems.map((item) => ({
      label: `${
        item.product?.barcode || "S/B"
      } - ${format(item.currentQuantity ?? item.quantity)} ${
        item.product?.unit || ""
      }`,
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
        !warehouseId 
          ? "Selecciona una bodega primero" 
          : !productId 
            ? "Selecciona un producto primero" 
            : "No se encontraron items"
      }
      disabled={disabled || !warehouseId || !productId}
      hasMenu={false}
    />
  );
}
