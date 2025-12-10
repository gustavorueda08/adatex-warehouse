import moment from "moment-timezone";
import { v4 } from "uuid";
import TransformSourceItemsInput from "@/components/documents/TransformSourceItemsInput";
import format from "@/lib/utils/format";

export function createTransformFormConfig({
  warehouses = [],
  productsData = [],
  availableItems = [], // Items available in the selected source warehouse
  onSubmit,
  loading,
}) {
  return {
    type: "transform",
    title: "Nueva Transformación",
    initialState: {
      sourceWarehouse: null,
      destinationWarehouse: null,
      transformationType: "transformation", // 'transformation' or 'partition'
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
          key: "dateCreated",
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
    productColumns: ({ formState, updateProductField }) => [
      {
        key: "product",
        label: "Producto Resultante",
        type: "select",
        options: productsData.map((p) => ({ label: p.name, value: p })),
        searchable: true,
        required: true,
        className: "min-w-[200px]",
      },
      {
        key: "items",
        label: "Items Origen (Consumir)",
        type: "custom",
        render: ({ value, formState: localFormState, updateField }) => (
          <TransformSourceItemsInput
            value={value || []}
            onChange={(newVal) =>
              updateProductField(localFormState.id, "items", newVal)
            }
            availableItems={availableItems}
          />
        ),
        className: "min-w-[400px]",
      },
      {
        key: "requestedQuantity",
        label: "Cantidad Total Resultante",
        type: "input",
        placeholder: "0",
        className: "w-32",
        // Auto-calculate from items targetQuantity sum?
        // Or let user input it manually?
        // User requirement: "targetQuantity" in items.
        // Usually sum of targetQuantity = requestedQuantity.
      },
    ],
    prepareSubmitData: (formState, user) => {
      return {
        type: "transform",
        sourceWarehouse: formState.sourceWarehouse?.id,
        destinationWarehouse: formState.destinationWarehouse?.id,
        products: formState.products
          .filter((p) => p.product && p.items && p.items.length > 0)
          .map((p) => ({
            product: p.product.id,
            requestedQuantity: Number(p.requestedQuantity || 0),
            items: p.items.map((item) => ({
              sourceItemId: item.sourceItemId,
              sourceQuantityConsumed: Number(item.sourceQuantityConsumed),
              targetQuantity: Number(item.targetQuantity),
              quantity: Number(item.targetQuantity), // Fallback
              warehouse: formState.sourceWarehouse?.id,
            })),
          })),
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
    allowAddItems: false, // Cannot add new lines in detail view easily with this structure
    showItemInput: false,
    headerFields: [
      {
        key: "sourceWarehouse",
        label: "Bodega Origen",
        type: "select",
        options: warehouses.map((w) => ({ label: w.name, value: w })),
        disabled: true,
      },
      {
        key: "destinationWarehouse",
        label: "Bodega Destino",
        type: "select",
        options: warehouses.map((w) => ({ label: w.name, value: w })),
        disabled: true,
      },
      {
        key: "dateCreated",
        label: "Fecha",
        type: "date",
        disabled: true,
      },
    ],
    productColumns: [
      {
        key: "product",
        label: "Producto Resultante",
        type: "select",
        options: productsData.map((p) => ({ label: p.name, value: p })),
        disabled: true,
      },
      {
        key: "items",
        label: "Detalle Transformación",
        type: "custom",
        render: ({ value }) => (
          <TransformSourceItemsInput value={value || []} readOnly={true} />
        ),
      },
      {
        key: "requestedQuantity",
        label: "Cantidad Resultante",
        render: (_, row) => format(row.requestedQuantity),
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
