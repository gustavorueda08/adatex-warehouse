import { createProductColumnsForm } from "../utils/createProductColumnsForDocuments";
import { ORDER_TYPES } from "../utils/orderTypes";
import { createProductColumns } from "./documentConfigs";

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
        includePrice: true,
        includeIVA: true,
        includeInvoicePercentage: true,
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
      type: ORDER_TYPES.SALE,
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
      sourceWarehouse: formState.selectedSourceWarehouse.id,
      destinationWarehouse: formState.selectedDestinationWarehouse.id,
      createdDate: formState.dateCreated,
      generatedBy: user.id,
    }),

    initialState: {
      selectedSourceWarehouse: null,
      selectedDestinationWarehouse: null,
    },
  };
}
