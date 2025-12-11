import Select from "@/components/ui/Select";
import { useProductSelector } from "@/lib/hooks/useProductSelector";

export default function TransformProductSelect({
  value,
  onChange,
  disabled,
  placeholder = "Buscar producto...",
}) {
  const {
    products,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    setSearch,
    search,
  } = useProductSelector({ pageSize: 20 });

  const options = products.map((p) => ({
    label: `${p.name} - ${p.code || "S/C"}`,
    value: p.id,
    product: p,
  }));

  // Handle change: Select returns the value (ID). We might need the full product object depending on parent's need.
  // In transformDocumentConfigs, "product" column expects value to be what?
  // Previous config: `value: p` (object).
  // DocumentForm updates field with `newVal`.
  // If we change to ID here, we must ensure prepareSubmitData handles it.
  // TransformItemSelect returns ID? Let's check.
  // TransformItemSelect options: `value: item.id`.
  // createTransformFormConfig sourceItem: `row.sourceItem` (ID).
  // prepareSubmitData: `sourceItemId: row.sourceItem`. Correct.
  
  // For product:
  // Previous config: `options: value: p`. (Object).
  // prepareSubmitData: `productId = row.product.id`.
  
  // If I change TransformProductSelect to return ID:
  // `onChange` logic in component should probably return the OBJECT if the parent expects object, or ID.
  // Select component returns `value`.
  // If options values are IDs, it returns ID.
  
  // If I return ID, `updateField("product", id)`. `row.product` becomes ID.
  // `prepareSubmitData`: `const productId = row.product`. (If it's ID).
  // But `prepareSubmitData` code: `const productId = row.product.id;`. It expects object.
  // I should update `prepareSubmitData` to expect ID or change Select to return Object.
  // Returning Object in Select `value` property breaks reference check if list changes.
  
  // Best practice: Use ID as value. But find the object to pass back to parent?
  // Select `onChange` might return just the value.
  // I can find the product in `options` and return it.
  
  const handleChange = (val) => {
    // val is the selected ID
    const selectedProduct = products.find(p => p.id === val);
    // Return the full object to keep compatibility with prepareSubmitData which expects row.product to be object
    // OR update prepareSubmitData.
    // Let's return Object to minimize config changes for now, or just return ID and update config.
    // If I return object, 'value' prop passed to Select must be ID for it to show label correctly.
    // But 'value' passed IN to this component is the Object (from form state).
    
    onChange(selectedProduct); 
  };

  // derived value for Select component (ID)
  const selectValue = value?.id || value;

  return (
    <Select
      value={selectValue}
      options={options}
      onChange={handleChange}
      placeholder={placeholder}
      className="w-full min-w-[200px]"
      searchable
      onSearch={setSearch}
      searchValue={search}
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      onLoadMore={loadMore}
      disabled={disabled}
    />
  );
}
