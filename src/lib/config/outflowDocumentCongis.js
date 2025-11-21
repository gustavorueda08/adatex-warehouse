import moment from "moment-timezone";
import format from "../utils/format";
import { ORDER_TYPES } from "../utils/orderTypes";
import { createProductColumns } from "./documentConfigs";
import Swal from "sweetalert2";
import { exportDocumentToPDF } from "../utils/exportToPDF";
import { exportDocumentToExcel } from "../utils/exportToExcel";

export function createOutflowFormConfig({
  warehouses,
  productsData,
  onSubmit,
  loading,
}) {
  return {
    title: "Nueva salida de inventario",
    type: ORDER_TYPES.OUT,
    loading,
    onSubmit,
    headerFields: [
      [
        {
          key: "dateCreated",
          label: "Fecha de Creación",
          type: "date",
        },
        {
          key: "selectedWarehouse",
          label: "Bodega de Origen",
          type: "select",
          searchable: true,
          options: warehouses
            .filter((w) => w.type === "stock" || w.type === "printlab")
            .map((w) => ({ label: w.name, value: w })),
        },
      ],
    ],

    productColumns: (context) =>
      createProductColumns({
        ...context,
        productsData,
        includePrice: false,
        includeIVA: false,
        includeInvoicePercentage: false,
      }),

    validateForm: (formState) => {
      const hasWarehouse = formState.selectedWarehouse;
      const hasProducts = formState.products.some((p) => p.product);
      const allProductsValid = formState.products
        .filter((p) => p.product)
        .every((p) => p.quantity && Number(p.quantity) > 0);

      return hasWarehouse && hasProducts && allProductsValid;
    },

    prepareSubmitData: (formState, user) => ({
      type: ORDER_TYPES.OUT,
      products: formState.products
        .filter((p) => p.product)
        .map((p) => ({
          requestedQuantity: Number(p.quantity),
          product: p.product.id,
          price: 0,
        })),
      sourceWarehouse: formState.selectedWarehouse.id,
      createdDate: formState.dateCreated,
      generatedBy: user.id,
    }),

    initialState: {
      selectedWarehouse: null,
    },
  };
}

export function createOutflowDetailConfig({
  updateOrder,
  deleteOrder,
  warehouses,
  products,
  refetch,
}) {
  return {
    // Tipo de la orden
    type: "outflow",
    // Titulo
    title: (document) => {
      const baseTitle = document.code || "";
      const container = document.containerCode
        ? ` | ${document.containerCode}`
        : "";
      return `${baseTitle}${container}`;
    },
    redirectPath: "/outflows",
    data: {
      warehouses: warehouses || [],
      products: products || [],
      createdDate: null,
      actualDispatchDate: null,
      confirmedDate: null,
      completedDate: null,
    },
    updateDocument: updateOrder,
    deleteDocument: deleteOrder,
    getInitialState: (document) => {
      return {
        selectedWarehouse: document.sourceWarehouse,
        createdDate: document.createdDate,
        actualDispatchDate: document.actualDispatchDate,
        confirmedDate: document.confirmedDate,
        completedDate: document.completedDate,
      };
    },
    stateHandlers: {},
    headerFields: [
      {
        label: "Bodega de Origen",
        type: "select",
        key: "selectedWarehouse",
        options: (_, data) => {
          if (!data.warehouses) return [];
          return data.warehouses.map((w) => ({ label: w.name, value: w.id }));
        },
        searchable: true,
      },
      {},
      {
        label: "Fecha de Creación",
        type: "date",
        key: "createdDate",
        disabled: true,
      },
      {
        label: "Fecha de Salida",
        type: "date",
        key: "completedDate",
        disabled: true,
      },
    ],
    // Product columns con acceso al estado
    productColumns: [
      {
        key: "product",
        label: "Producto",
        type: "select",
        options: (state, data, row, index, availableProducts) => {
          return availableProducts.map((p) => ({ label: p.name, value: p.id }));
        },
        searchable: true,
        onChange: (product, row, state) => {
          return { ...row, product };
        },
      },

      {
        key: "requestedQuantity",
        label: "Cantidad requerida",
        type: "input",
        editable: true,
        placeholder: "Cantidad",
        className: "md:max-w-28",
      },
      {
        key: "items",
        label: "Cantidad confirmada",
        type: "computed",
        compute: (row) =>
          row.items?.reduce(
            (acc, item) => acc + Number(item?.quantity || 0),
            0
          ) || 0,
        format: (value) => format(value) || "-",
      },
      {
        key: "itemsConfirmed",
        label: "Items Confirmados",
        type: "computed",
        compute: (row) => row.items?.filter((i) => i.quantity > 0).length || 0,
        format: (value) => format(value) || "-",
      },
      {
        key: "unit",
        label: "Unidad",
        type: "computed",
        compute: (row) => row?.product?.unit || "-",
      },
    ],
    actions: [
      {
        label: "Confirmar salida",
        variant: "emerald",
        visible: (document) => document.state !== "completed",
        onClick: async (document, state, { updateDocument, showToast }) => {
          try {
            const newState = {
              ...state,
              state: "completed",
              confirmedDate: moment.tz("America/Bogota").toDate(),
              completedDate: moment.tz("America/Bogota").toDate(),
              actualDispatchDate: moment.tz("America/Bogota").toDate(),
            };
            await updateDocument(document.id, {}, true, newState);

            showToast.success("Orden despachada exitosamente");
          } catch (error) {
            showToast.error("Error al despachar la orden");
            throw error;
          }
        },
      },
      {
        label: "Descargar lista de empaque",
        variant: "zinc",
        onClick: async (document, state, { showToast }) => {
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
            confirmButtonColor: "#10b981", // emerald
            denyButtonColor: "#06b6d4", // cyan
            cancelButtonColor: "#71717a", // zinc
          });

          if (result.isConfirmed) {
            // Usuario seleccionó Excel
            try {
              await exportDocumentToExcel(document, { includeLot: false });
              showToast.success("Documento exportado a Excel exitosamente");
            } catch (error) {
              console.error("Error exportando a Excel:", error);
              showToast.error("Error al exportar el documento a Excel");
            }
          } else if (result.isDenied) {
            // Usuario seleccionó PDF
            try {
              await exportDocumentToPDF(document, { includeLot: false });
              showToast.success("Documento exportado a PDF exitosamente");
            } catch (error) {
              console.error("Error exportando a PDF:", error);
              showToast.error("Error al exportar el documento a PDF");
            }
          }
          // Si result.isDismissed, el usuario canceló, no hacemos nada
        },
      },
    ],
    // Preparar datos para actualización
    prepareUpdateData: (_, products, state) => {
      const confirmed = products
        .filter((p) => p.product)
        .map((p) => ({
          ...p,
          items: p.items.filter((i) => i.quantity !== 0 && i.quantity !== ""),
        }))
        .every(
          (product) =>
            Array.isArray(product.items) &&
            product.items.every((item) => {
              const q = item.quantity;
              return (
                q !== null && q !== undefined && q !== "" && !isNaN(Number(q))
              );
            })
        );
      return {
        sourceWarehouse: state.selectedWarehouse?.id,
        createdDate: state.createdDate,
        confirmedDate: state.confirmedDate,
        completedDate: state.completedDate,
        actualDispatchDate: state.actualDispatchDate,
        state: confirmed && state.state === "draft" ? "confirmed" : state.state,
      };
    },
    customSections: [],
  };
}
