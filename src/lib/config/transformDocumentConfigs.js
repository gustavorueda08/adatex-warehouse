import moment from "moment-timezone";
import { v4 } from "uuid";
import TransformItemSelect from "@/components/documents/TransformItemSelect";
import TransformProductSelect from "@/components/documents/TransformProductSelect";
import Input from "@/components/ui/Input";
import format from "@/lib/utils/format";

export function createTransformFormConfig({
  warehouses = [],
  onSubmit, // productsData removed
  loading,
}) {
  return {
    type: "transform",
    title: "Nueva Transformación",
    initialState: {
      sourceWarehouse: null,
      destinationWarehouse: null,
      transformationType: "transformation", // Default to 'transformation'
    },
    headerFields: [
      [
        {
          key: "sourceWarehouse",
          label: "Bodega Origen",
          type: "select",
          options: warehouses
            .filter((w) => w.type === "stock" || w.type === "printlab")
            .map((w) => ({ label: w.name, value: w })),
          required: true,
          searchable: true,
          placeholder: "Selecciona bodega origen",
        },
        {
          key: "destinationWarehouse",
          label: "Bodega Destino",
          type: "select",
          options: warehouses
            .filter((w) => w.type === "stock" || w.type === "printlab")
            .map((w) => ({ label: w.name, value: w })),
          required: true,
          searchable: true,
          placeholder: "Selecciona bodega destino",
        },
      ],
      [
        {
          key: "createdDate",
          label: "Fecha de Creación",
          type: "date",
          required: true,
        },
        {
          key: "transformationType",
          label: "Tipo",
          type: "select",
          options: [
            { label: "Transformación", value: "transformation" },
            { label: "Partición/Corte", value: "partition" },
          ],
          required: true,
        },
      ],
    ],
    validateForm: (formState) => {
      const { sourceWarehouse, destinationWarehouse, products } = formState;
      if (!sourceWarehouse || !destinationWarehouse) return false;

      const validProducts = products.filter(
        (p) =>
          p.sourceItem &&
          p.product &&
          Number(p.sourceQuantity) > 0 &&
          Number(p.targetQuantity) > 0
      );

      return validProducts.length > 0;
    },
    calculateStats: (products) => {
      const productsWithData = products.filter(
        (p) => p.sourceItem && p.product
      );
      const validProducts = productsWithData.filter(
        (p) => Number(p.sourceQuantity) > 0 && Number(p.targetQuantity) > 0
      );

      return {
        totalProducts: productsWithData.length,
        validProducts: validProducts.length,
        allValid:
          productsWithData.length > 0 &&
          productsWithData.length === validProducts.length,
      };
    },
    productColumns: ({ formState, updateProductField }) => [
      {
        key: "sourceProduct",
        label: "Producto Origen",
        type: "custom",
        render: (value, row, index, { updateField }) => (
          <TransformProductSelect
            value={value}
            onChange={(newVal) => {
              updateField("sourceProduct", newVal);
              updateField("sourceItem", null); // Reset item when product changes
              updateField("sourceQuantity", 0);
            }}
            placeholder="Selecciona producto origen"
          />
        ),
        className: "min-w-[200px]",
        required: true,
      },
      {
        key: "sourceItem",
        label: "Item Origen (Lote)",
        type: "custom",
        render: (value, row, index, { updateField, formState }) => (
          <TransformItemSelect
            value={value}
            productId={row.sourceProduct?.id}
            onChange={(item) => {
              updateField("sourceItem", item?.id);
              updateField("sourceQuantity", item?.currentQuantity ?? item?.quantity ?? 0);
            }}
            warehouseId={formState?.sourceWarehouse?.id}
          />
        ),
        className: "min-w-[300px]",
        required: true,
      },
      {
        key: "product",
        label: "Producto Destino",
        type: "custom",
        render: (value, row, index, { updateField }) => (
          <TransformProductSelect
            value={value}
            onChange={(newVal) => updateField("product", newVal)}
          />
        ),
        className: "min-w-[200px]",
        required: true,
      },
      {
        key: "sourceQuantity",
        label: "Cant. Consumir",
        render: (value, row, index, { updateField }) => (
          <Input
            input={value}
            setInput={(val) => updateField("sourceQuantity", val)}
            placeholder="0"
            type="number"
            className="w-32"
          />
        ),
        className: "w-32",
        required: true,
      },
      {
        key: "targetQuantity",
        label: "Cant. Generar",
        render: (value, row, index, { updateField }) => (
          <Input
            input={value}
            setInput={(val) => updateField("targetQuantity", val)}
            placeholder="0"
            type="number"
            className="w-32"
          />
        ),
        className: "w-32",
        required: true,
      },
    ],
    prepareSubmitData: (formState, user) => {
      // Group flat rows by target product
      const groupedProducts = {};

      formState.products.forEach((row) => {
        if (!row.product || !row.sourceItem) return;

        const productId = row.product.id;
        if (!groupedProducts[productId]) {
          groupedProducts[productId] = {
            product: productId,
            requestedQuantity: 0,
            items: [],
          };
        }

        groupedProducts[productId].requestedQuantity += Number(
          row.targetQuantity || 0
        );
        groupedProducts[productId].items.push({
          sourceItemId: Number(row.sourceItem), // sourceItem is ID from Select
          sourceQuantityConsumed: Number(row.sourceQuantity),
          targetQuantity: Number(row.targetQuantity),
          quantity: Number(row.targetQuantity),
          // warehouse: formState.destinationWarehouse?.id, // Optional, defaults to order destination
        });
      });

      return {
        type: "transform",
        state: "completed",
        sourceWarehouse: formState.sourceWarehouse?.id,
        destinationWarehouse: formState.destinationWarehouse?.id,
        products: Object.values(groupedProducts),
        dateCreated: formState.dateCreated,
      };
    },
    onSubmit,
    loading,
  };
}

export function createTransformDetailConfig({
  productsData = [],
  warehouses = [],
  updateOrder,
  deleteOrder,
}) {
  return {
    type: "transform",
    title: (data) => `Transformación ${data?.code || ""}`,
    allowAddItems: false,
    showItemInput: false,
    showPackingList: false,
    data: { products: productsData },
    updateDocument: updateOrder,
    deleteDocument: deleteOrder,
    redirectPath: "/transformations",
    getInitialState: (document) => {
      // Flatten nested structure for Detail View
      console.log(document);
      
      const flatProducts = [];

      // In Transform orders, document.sourceItems contains the NEWLY CREATED items.
      // The ORIGIN item is linked via 'transformedFromItem'.
      if (document.sourceItems) {
        document.sourceItems.forEach((item) => {
          const sourceItemObj = item.transformedFromItem; // The raw material
          const targetProductObj = item.product; // The product of this new item

          flatProducts.push({
            id: item.id, // ID of the generated item
            sourceItem: sourceItemObj?.id,
            sourceItemObj: sourceItemObj,
            product: targetProductObj?.id,
            productObj: targetProductObj,
            sourceQuantity:
              item.sourceQuantityConsumed || // If stored directly
              sourceItemObj?.quantityConsumed, // Fallback (unlikely)
            targetQuantity: item.originalQuantity || item.currentQuantity,
          });
        });
      }

      console.log('Flat Products generated:', flatProducts);

      return {
        sourceWarehouse: document.sourceWarehouse?.id,
        destinationWarehouse: document.destinationWarehouse?.id,
        createdDate: document.createdDate,
        products: flatProducts,
      };
    },
    disableDedupe: true, // Prevent merging products by ID, keep flat list
    headerFields: [
      {
        key: "sourceWarehouse",
        label: "Bodega Origen",
        type: "select",
        options: warehouses.map((w) => ({ label: w.name, value: w.id })),
        disabled: true,
      },
      {
        key: "destinationWarehouse",
        label: "Bodega Destino",
        type: "select",
        options: warehouses.map((w) => ({ label: w.name, value: w.id })),
        disabled: true,
      },
      {
        key: "createdDate",
        label: "Fecha",
        type: "date",
        disabled: true,
      },
    ],
    productColumns: [
      {
        key: "sourceItem",
        label: "Item Origen",
        type: "custom", // Read-only custom render
        render: (value, row) => {
            // value is ID. row.sourceItemObj is object.
            const item = row.sourceItemObj;
             return item ? `${item.product?.name || "Item"} - Lote: ${item.lot || "N/A"}` : "-";
        }
      },
      {
        key: "product",
        label: "Producto Destino",
        type: "custom",
        render: (value, row) => row.productObj?.name || "-"
      },
      {
        key: "sourceQuantity",
        label: "Cant. Consumida",
        render: (_, row) => format(row.sourceQuantity),
      },
      {
        key: "targetQuantity",
        label: "Cant. Generada",
        render: (_, row) => format(row.targetQuantity),
      },
    ],
    actions: [
      {
        label: "Eliminar Transformación",
        variant: "red",
        onClick: async (document, state, { deleteDocument, showToast }) => {
          try {
            await deleteDocument(document.id);
            showToast.success("Transformación eliminada exitosamente");
          } catch (error) {
            console.error(error);
            showToast.error("Error al eliminar transformación");
          }
        },
      },
    ],
    // Update logic is complex (replace items). For now, we might restrict updates or implement specific logic if needed.
    // The user said: "Para modificar una transformación, debes eliminar el item anterior y agregar uno nuevo."
    // This implies we can edit the 'items' array in the payload.
    // But since we disabled editing in UI for now (readOnly=true in detail), we focus on Delete.
  };
}

export const transformListConfig = {
  title: "Transformaciones",
  documentType: "transform",
  createPath: "/new-transform",
  filterOptions: {
    relationField: "sourceWarehouse", // Filter by warehouse?
    relationLabel: "Bodega Origen",
  },
  columns: [
    {
      key: "sourceWarehouse",
      label: "Origen",
      render: (w) => w?.name || "-",
    },
    {
      key: "destinationWarehouse",
      label: "Destino",
      render: (w) => w?.name || "-",
    },
  ],
};
