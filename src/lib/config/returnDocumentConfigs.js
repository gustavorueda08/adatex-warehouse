import moment from "moment-timezone";
import format from "@/lib/utils/format";
import { ORDER_TYPES } from "@/lib/utils/orderTypes";
import { exportDocumentToExcel } from "@/lib/utils/exportToExcel";
import { exportDocumentToPDF } from "@/lib/utils/exportToPDF";
import Swal from "sweetalert2";
import { buildInvoiceLabel } from "../utils/invoiceLabel";

const RETURN_REASON_OPTIONS = [
  { label: "Producto defectuoso", value: "defective" },
  { label: "Producto equivocado", value: "wrong_product" },
  { label: "Cliente insatisfecho", value: "unsatisfied" },
  { label: "Otro", value: "other" },
];

async function askExportFormat() {
  const result = await Swal.fire({
    title: "Descargar Documento",
    text: "¿En qué formato deseas descargar?",
    icon: "question",
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: "Excel",
    denyButtonText: "PDF",
    cancelButtonText: "Cancelar",
    background: "#27272a",
    color: "#fff",
    confirmButtonColor: "#10b981",
    denyButtonColor: "#06b6d4",
    cancelButtonColor: "#71717a",
  });

  if (result.isConfirmed) return "excel";
  if (result.isDenied) return "pdf";
  return null;
}

/**
 * Configuración para crear Devoluciones desde el nuevo ReturnForm
 */
export function createReturnFormConfig({
  orders = [],
  warehouses = [],
  onSubmit,
  loading,
  onOrderSelect,
  orderSelectProps = {},
}) {
  return {
    title: "Nueva devolución",
    type: ORDER_TYPES.RETURN,
    loading,
    onSubmit,

    headerFields: [
      [
        {
          key: "selectedOrder",
          label: "Orden de venta",
          type: "select",
          searchable: true,
          options: orders.map((order) => ({
            label: `${buildInvoiceLabel(order)} - ${
              order.customer?.name || "Sin cliente"
            }`,
            value: order,
          })),
          onSearch: orderSelectProps.onSearch,
          onLoadMore: orderSelectProps.onLoadMore,
          hasMore: orderSelectProps.hasMore,
          loading: orderSelectProps.loading,
          loadingMore: orderSelectProps.loadingMore,
          onChange: (order, formState, updateField) => {
            if (!order) {
              updateField("selectedItems", []);
              return;
            }

            if (onOrderSelect) {
              onOrderSelect(order);
            }

            // Limpiar items seleccionados al cambiar de orden
            updateField("selectedItems", []);

            // Auto seleccionar la bodega de origen si existe
            if (order.sourceWarehouse) {
              updateField("selectedWarehouse", order.sourceWarehouse);
            }
          },
        },
        {
          key: "selectedWarehouse",
          label: "Bodega destino (devolución)",
          type: "select",
          searchable: true,
          options: warehouses
            .filter((warehouse) =>
              ["stock", "printlab"].includes(warehouse.type)
            )
            .map((warehouse) => ({ label: warehouse.name, value: warehouse })),
        },
      ],
      [
        {
          key: "dateCreated",
          label: "Fecha de devolución",
          type: "date",
        },
        {
          key: "returnReason",
          label: "Motivo de devolución",
          type: "select",
          options: RETURN_REASON_OPTIONS,
        },
      ],
    ],

    validateForm: (formState) => {
      const hasOrder = Boolean(formState.selectedOrder);
      const hasDestination = Boolean(formState.selectedWarehouse);
      const hasItems = (formState.selectedItems || []).length > 0;
      const allItemsValid = (formState.selectedItems || []).every(
        (item) => Number(item.returnQuantity) > 0
      );

      return hasOrder && hasDestination && hasItems && allItemsValid;
    },

    prepareSubmitData: (formState, user) => {
      const productsMap = new Map();

      (formState.selectedItems || []).forEach((selectedItem) => {
        if (!selectedItem.productId) return;

        if (!productsMap.has(selectedItem.productId)) {
          productsMap.set(selectedItem.productId, {
            product: selectedItem.productId,
            items: [],
            price: 0,
            requestedQuantity: 0,
          });
        }

        productsMap.get(selectedItem.productId).items.push({
          parentItem: selectedItem.itemId,
          quantity: Number(selectedItem.returnQuantity) || 0,
          lotNumber: selectedItem.lotNumber || selectedItem.lot || undefined,
          itemNumber:
            selectedItem.itemNumber || selectedItem.barcode || undefined,
          warehouse: formState.selectedWarehouse?.id,
        });
      });

      return {
        type: ORDER_TYPES.RETURN,
        products: Array.from(productsMap.values()),
        destinationWarehouse: formState.selectedWarehouse?.id,
        parentOrder: formState.selectedOrder?.id,
        returnReason: formState.returnReason,
        createdDate:
          formState.dateCreated || moment().tz("America/Bogota").toDate(),
        generatedBy: user?.id,
      };
    },

    initialState: {
      selectedOrder: null,
      selectedWarehouse: null,
      selectedItems: [],
      returnReason: null,
    },
  };
}

export function createReturnDetailConfig({
  warehouses = [],
  products = [],
  updateOrder,
  deleteOrder,
  addItem,
  removeItem,
  orderSelectProps = {},
  orders = [],
}) {
  return {
    type: ORDER_TYPES.RETURN,
    redirectPath: "/returns",
    allowAddItems: false,
    showItemInput: false,
    data: {
      warehouses,
      products,
    },
    updateDocument: updateOrder,
    deleteDocument: deleteOrder,
    addItem,
    removeItem,
    title: (document) => `Devolución ${document.code || ""}`,
    getInitialState: (document) => ({
      selectedWarehouse: document.destinationWarehouse,
      returnReason: document.returnReason || null,
      createdDate:
        document.createdDate || moment().tz("America/Bogota").toDate(),
      parentOrder: document.parentOrder,
    }),
    stateHandlers: {
      onWarehouseChange: (warehouseId, state, updateState) => {
        const warehouse = warehouses.find((w) => w.id == warehouseId);
        updateState({ selectedWarehouse: warehouse || null });
      },
      onParentOrderChange: (orderId, state, updateState) => {
        const order = orders.find((o) => o.id == orderId);
        updateState({ parentOrder: order || null });
      },
    },
    headerFields: [
      {
        key: "parentOrder",
        label: "Orden de venta original",
        type: "select",
        searchable: true,
        options: orders.map((order) => ({
          label: `${buildInvoiceLabel(order)} - ${
            order.customer?.name || "Sin cliente"
          }`,
          value: order.id,
        })),
        onSearch: orderSelectProps.onSearch,
        onLoadMore: orderSelectProps.onLoadMore,
        hasMore: orderSelectProps.hasMore,
        loading: orderSelectProps.loading,
        loadingMore: orderSelectProps.loadingMore,
        onChange: "onParentOrderChange",
      },
      {
        key: "sourceCustomer",
        label: "Cliente",
        type: "input",
        render: (_, state) => (
          <div className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md">
            <p className="text-white">
              {state.parentOrder?.customer?.name || "-"}
            </p>
          </div>
        ),
      },
      {
        key: "selectedWarehouse",
        label: "Bodega destino",
        type: "select",
        searchable: true,
        options: (state, data) =>
          (data.warehouses || [])
            .filter((w) => ["stock", "printlab"].includes(w.type))
            .map((w) => ({ label: w.name, value: w.id })),
        onChange: "onWarehouseChange",
      },
      {
        key: "createdDate",
        label: "Fecha de devolución",
        type: "date",
        disabled: true,
      },
      {
        key: "returnReason",
        label: "Motivo de devolución",
        type: "select",
        options: RETURN_REASON_OPTIONS,
      },
    ],
    productColumns: [
      {
        key: "product",
        label: "Producto",
        type: "computed",
        compute: (row) => row.product?.name || row.name || "-",
      },
      {
        key: "originalQuantity",
        label: "Cantidad original",
        type: "computed",
        compute: (row) => {
          console.log(row, "EL ROW");

          if (row.parentOriginalQuantity !== undefined) {
            return row.parentOriginalQuantity;
          }

          return (
            row.items
              ?.filter((item) => item.parentItem)
              ?.reduce(
                (acc, item) =>
                  acc +
                  (item.parentItem?.quantity ||
                    item.parentItem?.currentQuantity ||
                    0),
                0
              ) || 0
          );
        },
        format: (value) => format(value) || "-",
        footer: (data) =>
          format(
            data.reduce((acc, row) => {
              const rowTotal =
                row.items
                  ?.filter((item) => item.parentItem)
                  ?.reduce(
                    (subtotal, item) =>
                      subtotal +
                      (item.parentItem?.quantity ||
                        item.parentItem?.currentQuantity ||
                        0),
                    0
                  ) || 0;
              return acc + rowTotal;
            }, 0)
          ) || "-",
      },
      {
        key: "returnQuantity",
        label: "Cantidad devuelta",
        type: "computed",
        compute: (row) =>
          row.items?.reduce(
            (acc, item) => acc + Number(item?.quantity || 0),
            0
          ) || 0,
        format: (value) => format(value) || "-",
        footer: (data) =>
          format(
            data.reduce(
              (acc, row) =>
                acc +
                (row.items?.reduce(
                  (subtotal, item) => subtotal + Number(item?.quantity || 0),
                  0
                ) || 0),
              0
            )
          ) || "-",
      },
      {
        key: "itemsCount",
        label: "Items devueltos",
        type: "computed",
        compute: (row) =>
          row.items?.filter((item) => Number(item?.quantity || 0) > 0).length ||
          0,
        format: (value) => format(value) || "-",
        footer: (data) =>
          format(
            data.reduce(
              (acc, row) =>
                acc +
                (row.items?.filter((item) => Number(item?.quantity || 0) > 0)
                  .length || 0),
              0
            )
          ) || "-",
      },
      {
        key: "unit",
        label: "Unidad",
        type: "computed",
        compute: (row) => row.product?.unit || "-",
      },
    ],
    actions: [
      {
        label: "Procesar devolución",
        variant: "emerald",
        visible: (document) => document.state !== "completed",
        onClick: async (document, state, { updateDocument, showToast }) => {
          try {
            const newState = {
              ...state,
              state: "completed",
              completedDate: moment().tz("America/Bogota").toDate(),
            };
            await updateDocument(document.id, {}, true, newState);
            showToast.success("Devolución procesada exitosamente");
          } catch (error) {
            showToast.error("Error al procesar la devolución");
            throw error;
          }
        },
      },
      {
        label: "Descargar lista de empaque",
        variant: "cyan",
        onClick: async (document, state, { showToast }) => {
          const formatChoice = await askExportFormat();
          if (!formatChoice) return;

          try {
            if (formatChoice === "excel") {
              await exportDocumentToExcel(document, { includeLot: true });
            } else {
              await exportDocumentToPDF(document, { includeLot: true });
            }
            showToast.success("Documento exportado exitosamente");
          } catch (error) {
            console.error("Error al exportar devolución:", error);
            showToast.error("No se pudo exportar la devolución");
            throw error;
          }
        },
      },
    ],
    prepareUpdateData: (document, products, state) => ({
      destinationWarehouse: state.selectedWarehouse?.id,
      returnReason: state.returnReason,
      createdDate: state.dateCreated,
      parentOrder: document.parentOrder?.id,
    }),
    customSections: [
      {
        render: (document) => (
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-zinc-400">Orden de venta</p>
                <p className="font-semibold">
                  {document.parentOrder?.code || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Cliente</p>
                <p className="font-semibold">
                  {document.parentOrder?.customer?.name || "-"}
                </p>
              </div>
            </div>
          </div>
        ),
      },
    ],
  };
}
