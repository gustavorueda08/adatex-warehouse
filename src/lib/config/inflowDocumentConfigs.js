import moment from "moment-timezone";
import format from "../utils/format";
import { ORDER_TYPES } from "../utils/orderTypes";
import { createProductColumns } from "./documentConfigs";
import Swal from "sweetalert2";
import { exportDocumentToPDF } from "../utils/exportToPDF";
import { exportDocumentToExcel } from "../utils/exportToExcel";
import { createProductColumnsDetailForm } from "../utils/createProductColumnsForDocuments";
import BulkPackingListUploader from "@/components/documents/BulkPackingListUploader";
import toast from "react-hot-toast";
import { mapBulkItems } from "../utils/mapBulkItems";
import LabelGenerator from "@/components/documents/LabelGenerator";

export function createInflowFormConfig({
  warehouses,
  productsData,
  onSubmit,
  loading,
  productSelectProps = {},
}) {
  return {
    title: "Nueva entrada de inventario",
    type: ORDER_TYPES.IN,
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
          label: "Bodega destino",
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
        productSelectProps,
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

      return hasWarehouse; //&& hasProducts; && allProductsValid;
    },

    prepareSubmitData: (formState, user) => ({
      type: ORDER_TYPES.IN,
      products: formState.products
        .filter((p) => p.product)
        .map((p) => ({
          requestedQuantity: Number(p.quantity),
          product: p.product.id,
          price: 0,
        })),
      destinationWarehouse: formState.selectedWarehouse.id,
      createdDate: formState.dateCreated,
      generatedBy: user.id,
    }),

    initialState: {
      selectedWarehouse: null,
    },
  };
}

export function createInflowDetailConfig({
  updateOrder,
  deleteOrder,
  warehouses,
  products,
  refetch,
  productSelectProps = {},
}) {
  return {
    // Tipo de la orden
    type: "inflow",
    // Titulo
    title: (document) => {
      const baseTitle = document.code || "";
      const container = document.containerCode
        ? ` | ${document.containerCode}`
        : "";
      return `${baseTitle}${container}`;
    },
    redirectPath: "/inflows",
    allowAddItems: true,
    allowManualEntry: true,
    showItemInput: false,
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
        createdDate: document.createdDate,
        actualDispatchDate: document.actualDispatchDate,
        confirmedDate: document.confirmedDate,
        completedDate: document.completedDate,
        selectedWarehouse: document.destinationWarehouse.id,
      };
    },
    stateHandlers: {},
    headerFields: [
      {
        label: "Bodega destino",
        type: "select",
        key: "selectedWarehouse",
        options: warehouses.map((w) => ({ label: w.name, value: w.id })),
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
        label: "Fecha de Ingreso",
        type: "date",
        key: "completedDate",
        disabled: true,
      },
    ],
    productColumns: createProductColumnsDetailForm({
      productKey: "product",
      useProductIdAsValue: true,
      productFooter: "Total",
      priceLabel: "Precio Unitario",
      includePrice: false,
      includeIVA: false,
      quantityKey: "requestedQuantity",
      quantityLabel: "Cantidad Solicitada",
      quantityFooter: (data) =>
        format(data.reduce((acc, d) => acc + Number(d.quantity || 0), 0)),
      itemsLabel: "Cantidad Recibida",
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
      includeUnit: false,
      productSelectProps,
    }),
    actions: [
      {
        label: "Ingresar orden",
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
        destinationWarehouse: state.selectedWarehouse?.id,
        createdDate: state.createdDate,
        confirmedDate: state.confirmedDate,
        completedDate: state.completedDate,
        actualDispatchDate: state.actualDispatchDate,
        state: confirmed && state.state === "draft" ? "confirmed" : state.state,
      };
    },
    customSections: [
      {
        visible: (document) =>
          document.state !== "completed" && document.state !== "canceled",
        render: (document, state, helpers) => {
          const handleBulkUpload = async (data) => {
            if (!Array.isArray(data)) return;

            const parsedItems = data.map((item) => ({
              productId: item["id"] || item["ID"] || item["Code"] || null,
              name: item["NOMBRE"] || item["Nombre"] || null,
              quantity: Number(item["CANTIDAD"]) || null,
              lotNumber: item["LOTE"] || "",
              itemNumber: item["NUMERO"] || "",
            }));

            await mapBulkItems({
              items: parsedItems,
              currentProducts: helpers?.products || [],
              fetchedProducts: helpers?.fetchedData?.products || [],
              setProducts: helpers?.setProducts,
              toast,
            });
          };

          return (
            <div className="mt-4">
              <BulkPackingListUploader
                onFileLoaded={handleBulkUpload}
                context={helpers}
                isReadOnly={
                  document.state === "completed" ||
                  document.state === "canceled"
                }
              />
            </div>
          );
        },
      },
      {
        visible: () => true,
        render: (document, state, helpers) => (
          <div className="mt-4">
            <LabelGenerator
              products={(helpers?.products || []).filter((p) => p.product)}
            />
          </div>
        ),
      },
    ],
  };
}
