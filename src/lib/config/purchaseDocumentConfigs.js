// lib/config/documentConfigs.js
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import format from "@/lib/utils/format";
import { ORDER_TYPES } from "@/lib/utils/orderTypes";
import unitsAreConsistent from "@/lib/utils/unitsConsistency";
import moment from "moment-timezone";
import LabelGenerator from "@/components/documents/LabelGenerator";
import BulkPackingListUploader from "@/components/documents/BulkPackingListUploader";
import { exportDocumentToExcel } from "@/lib/utils/exportToExcel";
import { exportDocumentToPDF } from "@/lib/utils/exportToPDF";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import {
  createProductColumnsDetailForm,
  createProductColumnsForm,
} from "../utils/createProductColumnsForDocuments";
import { mapBulkItems } from "../utils/mapBulkItems";

export function createPurchaseFormConfig({
  suppliers,
  warehouses,
  productsData,
  onSubmit,
  loading,
  productSelectProps = {},
}) {
  return {
    title: "Nueva orden de compra",
    type: ORDER_TYPES.PURCHASE,
    loading,
    onSubmit,
    headerFields: [
      [
        {
          key: "selectedSupplier",
          label: "Proveedor",
          type: "select",
          searchable: true,
          options: suppliers.map((s) => ({ label: s.name, value: s })),
        },
        {
          key: "containerCode",
          label: "Codigo de la orden",
          type: "input",
          placeholder: "Escribe el codigo unico de la orden",
        },
      ],
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
          options: warehouses.map((w) => ({ label: w.name, value: w })),
        },
      ],
    ],
    productColumns: (context) =>
      createProductColumnsForm({
        ...context,
        productsData,
        productSelectProps,
        includePrice: true,
        includeIVA: true,
        includeInvoicePercentage: false,
      }),
    validateForm: (formState) => {
      const hasSupplier = formState.selectedSupplier;
      const hasWarehouse = formState.selectedWarehouse;
      //const hasProducts = formState.products.some((p) => p.product);
      const allProductsValid = formState.products
        .filter((p) => p.product)
        .every((p) => p.quantity && Number(p.quantity) > 0);

      return hasSupplier && hasWarehouse && allProductsValid;
    },
    prepareSubmitData: (formState, user) => ({
      type: ORDER_TYPES.PURCHASE,
      products: formState.products
        .filter((p) => p.product)
        .map((p) => ({
          requestedQuantity: Number(p.quantity),
          product: p.product.id,
          price: Number(p.price),
        })),
      destinationWarehouse: formState.selectedWarehouse.id,
      supplier: formState.selectedSupplier.id,
      createdDate: formState.dateCreated,
      generatedBy: user.id,
      containerCode: formState.containerCode,
    }),
    initialState: {
      selectedSupplier: null,
      selectedWarehouse: null,
    },
  };
}

export function createPurchaseDetailConfig({
  suppliers,
  warehouses,
  products,
  updateOrder,
  deleteOrder,
  productSelectProps = {},
}) {
  return {
    type: "purchase",
    redirectPath: "/purchases",
    allowAddItems: true,
    allowManualEntry: true,
    showItemInput: false,
    title: (document) => {
      const parts = [document.code || ""];
      if (document.containerCode) parts.push(document.containerCode);
      return parts.filter(Boolean).join(" | ");
    },
    data: {
      suppliers,
      warehouses,
      products,
    },
    getInitialState: (document) => ({
      selectedSupplier: document.supplier.id || null,
      selectedWarehouse: document.destinationWarehouse.id || null,
      createdDate: document.createdDate,
      actualDispatchDate: document.actualDispatchDate || null,
      dateArrived: document.actualWarehouseDate || null,
    }),
    stateHandlers: {},
    headerFields: [
      {
        label: "Proveedor",
        type: "select",
        key: "selectedSupplier",
        searchable: true,
        options: suppliers.map((s) => ({ label: s.name, value: s.id })),
      },
      {
        label: "Bodega destino",
        type: "select",
        key: "selectedWarehouse",
        searchable: true,
        options: warehouses.map((w) => ({ label: w.name, value: w.id })),
      },
      {
        label: "Fecha de Creación",
        type: "date",
        key: "createdDate",
        disabled: true,
      },
      {
        label: "Fecha de despacho",
        type: "date",
        key: "actualDispatchDate",
      },
    ],
    productColumns: createProductColumnsDetailForm({
      productKey: "product",
      useProductIdAsValue: true,
      productFooter: "Total",
      priceLabel: "Precio Unitario",
      includePrice: true,
      includeIVA: true,
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
        label: "Completar Orden",
        variant: "emerald",
        visible: (doc) => doc.state !== "completed" && doc.state !== "canceled",
        onClick: async (document, state, { updateDocument }) => {
          const newState = {
            ...state,
            state: "completed",
            completedDate: moment.tz("America/Bogota").toDate(),
            actualDispatchDate: moment.tz("America/Bogota").toDate(),
          };
          await updateDocument(document.id, {}, true, newState);
        },
      },
      {
        label: "Descargar orden de compra",
        variant: "cyan",
        onClick: async (document) => {
          await handleDocumentExport(document, { includeLot: false });
        },
      },
    ],
    prepareUpdateData: (document, products, state) => {
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
        supplier: state.selectedSupplier,
        destinationWarehouse: state.selectedWarehouse,
        createdDate: state.createdDate,
        actualDispatchDate: state.actualDispatchDate,
        completedDate: state.completedDate,
        state: confirmed && state.state === "draft" ? "confirmed" : state.state,
      };
    },
    updateDocument: updateOrder,
    deleteDocument: deleteOrder,
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
