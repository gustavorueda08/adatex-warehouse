import moment from "moment-timezone";
import format from "../utils/format";
import { ORDER_TYPES } from "../utils/orderTypes";
import { createProductColumns } from "./documentConfigs";
import Swal from "sweetalert2";
import { exportDocumentToPDF } from "../utils/exportToPDF";
import { exportDocumentToExcel } from "../utils/exportToExcel";
import { createProductColumnsDetailForm } from "../utils/createProductColumnsForDocuments";
import BulkPackingListUploader from "@/components/documents/BulkPackingListUploader";
import { mapBulkItems } from "../utils/mapBulkItems";
import toast from "react-hot-toast";

export function createOutflowFormConfig({
  warehouses,
  productsData,
  onSubmit,
  loading,
  productSelectProps = {},
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
  addItem,
  removeItem,
  productSelectProps = {},
}) {
  return {
    type: "outflow",
    title: (document) => {
      const baseTitle = document.code || "";
      const container = document.containerCode
        ? ` | ${document.containerCode}`
        : "";
      return `${baseTitle}${container}`;
    },
    redirectPath: "/outflows",
    allowAddItems: (state) => !state.isBulkMode,
    showItemInput: true,
    allowManualEntry: false,
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
    addItem,
    removeItem,
    getInitialState: (document) => {
      return {
        selectedWarehouse: document.sourceWarehouse.id,
        createdDate: document.createdDate,
        actualDispatchDate: document.actualDispatchDate,
        confirmedDate: document.confirmedDate,
        completedDate: document.completedDate,
        isBulkMode: false,
      };
    },
    stateHandlers: {},
    headerFields: [
      {
        label: "Bodega de Origen",
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
      productSelectProps,
    }),
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

      if (state.isBulkMode) {
        // Map products for the Bulk Update / Batch endpoint
        const formattedProducts = products
          .filter((p) => p.product)
          .map((p) => {
            const validItems = p.items.filter(
              (i) => i.quantity !== 0 && i.quantity !== ""
            );

            // Calculate requestedQuantity sum
            const requestedQuantity = validItems.reduce(
              (sum, item) => sum + (Number(item.quantity) || 0),
              0
            );

            const items = validItems.map((item) => ({
              id: item.id,
            }));

            return {
              product: p.product.id,
              items: items,
              requestedQuantity,
            };
          })
          .filter((p) => p.items && p.items.length > 0);

        return {
          products: formattedProducts,
          sourceWarehouse: state.selectedWarehouse,
          createdDate: state.createdDate,
          confirmedDate: state.confirmedDate,
          completedDate: state.completedDate,
          actualDispatchDate: state.actualDispatchDate,
          state:
            confirmed && state.state === "draft" ? "confirmed" : state.state,
        };
      }

      return {
        sourceWarehouse: state.selectedWarehouse,
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
          document.state === "draft" || document.state === "active",
        render: (document, state, helpers) => {
          const handleBulkUpload = async (data) => {
            if (!Array.isArray(data)) return;

            // Map Sale columns (ID, CODE, BARCODE, PRODUCT, QUANTITY)
            // mapBulkItems matches d "productId" against ID/Code
            const parsedItems = data.map((item) => ({
              id:
                item["ID"] ||
                item["id"] ||
                item["CODIGO"] ||
                item["CODE"] ||
                item["BARCODE"] ||
                item["barcode"] ||
                null,
              name:
                item["PRODUCTO"] ||
                item["producto"] ||
                item["NOMBRE"] ||
                item["nombre"] ||
                null,
              quantity:
                Number(item["CANTIDAD"]) || Number(item["cantidad"]) || null,
            }));

            helpers.updateState({ isBulkMode: true });

            await mapBulkItems({
              items: parsedItems,
              currentProducts: helpers?.products || [],
              fetchedProducts: helpers?.fetchedData?.products || [],
              setProducts: helpers?.setProducts,
              toast,
              withItemIds: true,
            });
          };

          return (
            <div className="mt-6 border-t border-zinc-700 pt-6">
              <BulkPackingListUploader
                onFileLoaded={handleBulkUpload}
                context={helpers}
                isReadOnly={document.state !== "draft"}
                requiredColumns={[
                  {
                    key: "ID",
                    label: "ID",
                    description:
                      "ID del producto (Opcional si envía Código/Barcode)",
                  },
                  {
                    key: "CODIGO",
                    label: "CODIGO",
                    description: "Código del producto",
                  },
                  {
                    key: "BARCODE",
                    label: "BARCODE",
                    description: "Código de barras",
                  },
                  {
                    key: "PRODUCTO",
                    label: "PRODUCTO",
                    description: "Nombre del producto",
                  },
                  {
                    key: "CANTIDAD",
                    label: "CANTIDAD",
                    description: "Cantidad a despachar",
                  },
                ]}
              />
            </div>
          );
        },
      },
    ],
  };
}
