import moment from "moment-timezone";
import {
  createProductColumnsDetailForm,
  createProductColumnsForm,
} from "../utils/createProductColumnsForDocuments";
import format from "../utils/format";
import { ORDER_TYPES } from "../utils/orderTypes";

export function createTransferFormConfig({
  warehouses,
  productsData,
  onSubmit,
  loading,
}) {
  return {
    title: "Nueva orden de transferencia",
    type: ORDER_TYPES.TRANSFER,
    loading,
    onSubmit,
    headerFields: [
      [
        {
          key: "dateCreated",
          label: "Fecha de Creación",
          type: "date",
        },
      ],
      [
        {
          key: "selectedSourceWarehouse",
          label: "Bodega de origen",
          type: "select",
          searchable: true,
          options: warehouses.map((w) => ({ label: w.name, value: w.id })),
        },
        {
          key: "selectedDestinationWarehouse",
          label: "Bodega destino",
          type: "select",
          searchable: true,
          options: warehouses.map((w) => ({ label: w.name, value: w.id })),
        },
      ],
    ],
    productColumns: (context) =>
      createProductColumnsForm({
        ...context,
        productsData,
        includePrice: false,
        includeIVA: false,
        includeInvoicePercentage: false,
      }),

    onProductSelect: (product) => {
      product.total =
        Number(product.price || 0) * Number(product.quantity || 0);
      return product;
    },

    validateForm: (formState) => {
      const hasSourceWarehouse = formState.selectedSourceWarehouse;
      const hasDestinationWarehouse = formState.selectedDestinationWarehouse;
      const hasProducts = formState.products.some((p) => p.product);
      const allProductsValid = formState.products
        .filter((p) => p.product)
        .every((p) => p.quantity && Number(p.quantity) > 0);

      return (
        hasSourceWarehouse &&
        hasDestinationWarehouse &&
        hasProducts &&
        allProductsValid
      );
    },

    prepareSubmitData: (formState, user) => ({
      type: ORDER_TYPES.TRANSFER,
      products: formState.products
        .filter((p) => p.product)
        .map((p) => ({
          requestedQuantity: Number(p.quantity),
          product: p.product.id,
          price: Number(p.price),
          name: p.name,
          ivaIncluded: p.ivaIncluded,
          invoicePercentage: p.invoicePercentage,
        })),
      sourceWarehouse: formState.selectedSourceWarehouse,
      destinationWarehouse: formState.selectedDestinationWarehouse,
      createdDate: formState.dateCreated,
      generatedBy: user.id,
    }),

    initialState: {
      selectedSourceWarehouse: null,
      selectedDestinationWarehouse: null,
    },
  };
}

export function createTransferDetailConfig({
  updateOrder,
  deleteOrder,
  warehouses,
  products,
  addItem,
  removeItem,
}) {
  return {
    type: "transfer",
    title: (document) => {
      const baseTitle = document.code || "";
      const container = document.containerCode
        ? ` | ${document.containerCode}`
        : "";
      return `${baseTitle}${container}`;
    },
    redirectPath: "/outflows",
    allowAddItems: true,
    showItemInput: true,
    allowManualEntry: false,
    data: {
      warehouses: warehouses || [],
      products: products || [],
      createdDate: null,
      actualDispatchDate: null,
      confirmedDate: null,
      completedDate: null,
      selectedSourceWarehouse: null,
      selectedDestinationWarehouse: null,
    },
    updateDocument: updateOrder,
    deleteDocument: deleteOrder,
    addItem,
    removeItem,
    getInitialState: (document) => {
      return {
        selectedSourceWarehouse: document?.sourceWarehouse?.id,
        selectedDestinationWarehouse: document?.destinationWarehouse?.id,
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
        key: "selectedSourceWarehouse",
        options: warehouses.map((w) => ({ label: w.name, value: w.id })),
        searchable: true,
      },
      {
        label: "Bodega Destino",
        type: "select",
        key: "selectedDestinationWarehouse",
        options: warehouses.map((w) => ({ label: w.name, value: w.id })),
        searchable: true,
      },
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
    productColumns: createProductColumnsDetailForm({
      useProductIdAsValue: true,
      includePrice: false,
      includeIVA: false,
      quantityKey: "requestedQuantity",
      quantityLabel: "Cantidad requerida",
      itemsLabel: "Cantidad confirmada",
      includeInvoicePercentage: true,
      includeItemsConfirmed: true,
      productFooter: "Total",
      includeUnit: true,
      quantityFooter: (data) =>
        format(data.reduce((acc, d) => acc + Number(d.quantity || 0), 0)),
      itemsFooter: (data) => {
        const total =
          data
            .flatMap((p) => p.items)
            .reduce((acc, item) => acc + Number(item?.quantity || 0), 0) || 0;
        return format(total) || "-";
      },
      includeTotal: true,
      totalFooter: (data) =>
        format(
          data.reduce((acc, p) => acc + (p.price || 0) * (p.quantity || 0), 0),
          "$"
        ),
      onProductChange: (product, row, state) => {
        const priceData = state.selectedCustomerForInvoice?.prices?.find(
          (p) => p.product.id === product.id
        );
        if (priceData) {
          return {
            ...row,
            product,
            price: String(priceData.unitPrice),
            ivaIncluded: priceData.ivaIncluded || false,
            invoicePercentage: priceData.invoicePercentage || 100,
          };
        }
        return { ...row, product };
      },
    }),
    actions: [
      {
        label: "Confirmar transferencia",
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

            showToast.success("Orden transferida exitosamente");
          } catch (error) {
            showToast.error("Error al transferir la orden");
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
        sourceWarehouse: state.selectedSourceWarehouse,
        destinationWarehouse: state.selectedDestinationWarehouse,
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
