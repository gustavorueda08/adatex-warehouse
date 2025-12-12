import moment from "moment-timezone";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import { createProductColumns } from "./documentConfigs";
import { ORDER_TYPES } from "../utils/orderTypes";
import { exportDocumentToExcel } from "../utils/exportToExcel";
import { exportDocumentToPDF } from "../utils/exportToPDF";
import { createProductColumnsDetailForm } from "../utils/createProductColumnsForDocuments";
import format from "../utils/format";
import { buildInvoiceLabel } from "../utils/invoiceLabel";
import BulkPackingListUploader from "@/components/documents/BulkPackingListUploader";
import { mapBulkItems } from "../utils/mapBulkItems";

export function createSaleFormConfig({
  customers,
  warehouses,
  productsData,
  onSubmit,
  loading,
  productSelectProps = {},
  customerSelectProps = {},
  quickCreateCustomer, // New prop
}) {
  return {
    title: "Nueva Venta",
    type: ORDER_TYPES.SALE,
    loading,
    onSubmit,
    headerFields: [
      [
        {
          key: "selectedCustomer",
          label: "Cliente",
          type: "select",
          searchable: true,
          options: customers.map((c) => ({
            label: `${c.name} ${c.lastName || ""}`,
            value: c,
          })),
          placeholder: "Selecciona un cliente",
          quickCreate: quickCreateCustomer, // Enable quick create
          onChange: (customer, formState, updateField) => {
            const parties = customer.parties || [];
            updateField("parties", [...parties, customer]);

            if (parties.length === 0) {
              updateField("selectedCustomerForInvoice", customer);
            } else {
              const defaultParty = parties.find((p) => p.isDefault);
              updateField(
                "selectedCustomerForInvoice",
                defaultParty || parties[0]
              );
            }
          },
          onSearch: customerSelectProps.onSearch,
          onLoadMore: customerSelectProps.onLoadMore,
          hasMore: customerSelectProps.hasMore,
          loading: customerSelectProps.loading,
          loadingMore: customerSelectProps.loadingMore,
        },
        {
          key: "selectedCustomerForInvoice",
          label: "Cliente para factura",
          type: "select",
          searchable: true,
          hasMenu: false,
          options: (formState) =>
            (formState.parties || []).map((p) => ({
              label: `${p.name} ${p.lastName || ""}`,
              value: p,
            })),
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
          label: "Bodega de origen",
          type: "select",
          searchable: true,
          hasMenu: false,
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
        includePrice: true,
        includeIVA: true,
        includeInvoicePercentage: true,
      }),

    onProductSelect: (product, selectedProduct, formState) => {
      if (formState.selectedCustomer?.prices) {
        const priceData = formState.selectedCustomer.prices.find(
          (p) => p.product.id === selectedProduct.id
        );
        if (priceData) {
          product.price = String(priceData.unitPrice);
          product.ivaIncluded = priceData.ivaIncluded || false;
          product.invoicePercentage = priceData.invoicePercentage || 100;
        }
      }
      product.total =
        Number(product.price || 0) * Number(product.quantity || 0);
      return product;
    },

    validateForm: (formState) => {
      const hasCustomer = formState.selectedCustomer;
      const hasWarehouse = formState.selectedWarehouse;
      const hasProducts = formState.products.some((p) => p.product);
      const allProductsValid = formState.products
        .filter((p) => p.product)
        .every((p) => p.quantity && Number(p.quantity) > 0);

      return hasCustomer && hasWarehouse && hasProducts && allProductsValid;
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
      sourceWarehouse: formState.selectedWarehouse.id,
      customer: formState.selectedCustomer.id,
      customerForInvoice: formState.selectedCustomerForInvoice.id,
      createdDate: formState.dateCreated,
      generatedBy: user.id,
    }),

    initialState: {
      selectedCustomer: null,
      selectedCustomerForInvoice: null,
      selectedWarehouse: null,
      parties: [],
    },
  };
}

export function createSaleDetailConfig({
  customers,
  warehouses,
  products,
  updateOrder,
  deleteOrder,
  addItem,
  removeItem,
  refetch,
  productSelectProps = {},
  customerSelectProps = {},
  currentCustomer = null,
  quickCreateCustomer,
  getInvoices = null,
}) {
  const allCustomers =
    currentCustomer && !customers.find((c) => c.id === currentCustomer.id)
      ? [currentCustomer, ...customers]
      : customers;

  return {
    type: "sale",
    title: (document) => buildInvoiceLabel(document),
    redirectPath: "/sales",
    allowAddItems: (state) => !state.isBulkMode,
    showItemInput: true,
    allowManualEntry: false,
    data: {
      customers: allCustomers,
      warehouses,
      products,
    },
    updateDocument: updateOrder,
    deleteDocument: deleteOrder,
    addItem,
    removeItem,
    getInitialState: (document) => {
      const customer = document.customer;
      const customerForInvoice = document.customerForInvoice;
      // Calcular parties
      let parties = [];
      if (customer) {
        const customerParties = Array.isArray(customer.parties)
          ? customer.parties
          : [];
        parties = [...customerParties, customer];
        // Asegurarse de que customerForInvoice esté incluido
        if (
          customerForInvoice &&
          !parties.find((p) => p.id === customerForInvoice.id)
        ) {
          parties.push(customerForInvoice);
        }
      }
      return {
        selectedCustomer: customer.id,
        selectedCustomerForInvoice: customerForInvoice.id,
        selectedWarehouse: document.sourceWarehouse.id,
        parties,
        createdDate: document.createdDate,
        actualDispatchDate: document.actualDispatchDate,
        confirmedDate: document.confirmedDate,
        completedDate: document.completedDate,
        isBulkMode: false, // Default state
      };
    },
    stateHandlers: {
      onCustomerChange: (customerId, state, updateState) => {
        const customer = allCustomers.find((c) => c.id == customerId);
        const customerParties = Array.isArray(customer.parties)
          ? customer.parties
          : [];
        const allParties = [...customerParties, customer];
        // Auto-seleccionar party por defecto
        let defaultParty = customer;
        if (customerParties.length > 0) {
          defaultParty =
            customerParties.find((p) => p.isDefault) || customerParties[0];
        }
        updateState({
          selectedCustomer: customer,
          parties: allParties,
          selectedCustomerForInvoice: defaultParty,
        });
      },
      onCustomerForInvoiceChange: (
        customerForInvoiceId,
        state,
        updateState
      ) => {
        const parties = state.parties || [];
        const customerForInvoice = parties.find(
          (p) => p.id == customerForInvoiceId
        );
        if (customerForInvoice) {
          updateState({
            selectedCustomerForInvoice: customerForInvoice,
          });
        }
      },
    },
    headerFields: [
      {
        label: "Cliente",
        type: "select",
        key: "selectedCustomer",
        options: allCustomers.map((c) => ({
          label: `${c.name} ${c.lastName || ""}`,
          value: c.id,
        })),
        searchable: true,
        placeholder: "Selecciona un cliente",
        quickCreate: quickCreateCustomer, // Enable quick create
        onChange: "onCustomerChange", // Referencia al state handler
        onSearch: customerSelectProps.onSearch,
        onLoadMore: customerSelectProps.onLoadMore,
        hasMore: customerSelectProps.hasMore,
        loading: customerSelectProps.loading,
        loadingMore: customerSelectProps.loadingMore,
      },
      {
        label: "Cliente para la factura",
        type: "select",
        key: "selectedCustomerForInvoice",
        options: (state, data) => {
          if (!state.parties) return [];
          return state.parties.map((p) => ({
            label: `${p.name} ${p.lastName || ""}`,
            value: p.id,
          }));
        },
        searchable: true,
        onChange: "onCustomerForInvoiceChange",
      },
      {
        label: "Bodega origen",
        type: "select",
        key: "selectedWarehouse",
        options: (state, data) => {
          if (!data.warehouses) return [];
          return data.warehouses.map((w) => ({ label: w.name, value: w.id }));
        },
        searchable: true,
      },
      {
        label: "Fecha de Creación",
        type: "date",
        key: "createdDate",
        disabled: true,
      },
      {
        label: "Fecha de confirmación",
        type: "date",
        key: "confirmedDate",
        disabled: true,
      },
      {
        label: "Fecha de despacho",
        type: "date",
        key: "actualDispatchDate",
        disabled: true,
      },
    ],
    productColumns: createProductColumnsDetailForm({
      useProductIdAsValue: true,
      includePrice: true,
      includeIVA: true,
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
        label: "Confirmar Orden",
        variant: "cyan",
        visible: (document) => document.state === "draft",
        onClick: async (document, state, { updateDocument }) => {
          const newState = {
            ...state,
            state: "confirmed",
            confirmedDate: moment.tz("America/Bogota").toDate(),
          };
          await updateDocument(document.id, {}, true, newState);
        },
      },
      {
        label: "Despachar orden",
        variant: "emerald",
        visible: (document) => document.state !== "completed",
        onClick: async (document, state, { updateDocument, showToast }) => {
          try {
            const newState = {
              ...state,
              state: "completed",
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
        variant: "yellow",
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
      {
        label: (document) =>
          document.siigoIdTypeA || document.siigoIdTypeB
            ? "Descargar Facturas"
            : "Facturar Orden",
        variant:
          document.siigoIdTypeA || document.siigoIdTypeB ? "emerald" : "purple",
        onClick: async (document, state, { updateState, updateDocument }) => {
          if (!document.siigoIdTypeA && !document.siigoIdTypeB) {
            const result = await Swal.fire({
              title: "Facturar Orden",
              text: "¿Está seguro que quiere facturar la orden? Esta acción no se puede deshacer",
              icon: "question",
              showCancelButton: true,
              confirmButtonText: "Facturar",
              cancelButtonText: "Cancelar",
              background: "#27272a",
              color: "#fff",
              confirmButtonColor: "#10b981",
              cancelButtonColor: "#71717a",
            });

            if (result.isConfirmed) {
              try {
                const newState = {
                  state: "completed",
                  completedDate: moment.tz("America/Bogota").toDate(),
                  emitInvoice: true,
                };
                await updateDocument(document.id, {}, true, newState);
                await refetch();
              } catch (error) {
                toast.error("Error al facturar la orden");
                throw error;
              }
            }
          } else {
            toast.loading("Descargando facturas...");
            const result = await getInvoices(document.id);
            toast.dismiss();
            if (result.success) {
              toast.success("Facturas descargadas");
            } else {
              toast.error("Error al descargar facturas");
            }
          }
        },
      },
    ],
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

        const data = {
          products: formattedProducts, // Override products payload
          customer: state.selectedCustomer,
          customerForInvoice: state.selectedCustomerForInvoice,
          sourceWarehouse: state.selectedWarehouse,
          createdDate: state.createdDate,
          confirmedDate: state.confirmedDate,
          completedDate: state.completedDate,
          actualDispatchDate: state.actualDispatchDate,
          state:
            confirmed && state.state === "draft" ? "confirmed" : state.state,
          emitInvoice: state.emitInvoice || false,
        };
        console.log("data", data);

        return data;
      }

      return {
        customer: state.selectedCustomer,
        customerForInvoice: state.selectedCustomerForInvoice,
        sourceWarehouse: state.selectedWarehouse,
        createdDate: state.createdDate,
        confirmedDate: state.confirmedDate,
        completedDate: state.completedDate,
        actualDispatchDate: state.actualDispatchDate,
        state: confirmed && state.state === "draft" ? "confirmed" : state.state,
        emitInvoice: state.emitInvoice || false,
      };
    },
    invoice: {
      enabled: true,
      title: (document) =>
        document.state === "draft" || document.state === "confirmed"
          ? "Factura Proforma"
          : "Factura",
      taxes: (state) => {
        return (
          state.parties.find((p) => p.id === state.selectedCustomerForInvoice)
            ?.taxes || []
        );
      },
    },
    customSections: [
      {
        visible: (document) =>
          document.state === "completed" && !document.siigoId,
        render: (document, state) => (
          <div className="p-4 bg-yellow-900/20 border border-yellow-500 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⚠️</span>
              <h4 className="font-bold text-yellow-400">
                Esta orden está en remisión
              </h4>
            </div>
            <p className="text-sm text-yellow-300 mb-3">
              Los productos han sido despachados pero aún no se han facturado.
              Puedes crear facturas parciales según el cliente te reporte las
              ventas.
            </p>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = `/sales/${document.id}/partial-invoice`;
                }
              }}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-md transition-colors"
            >
              Crear Factura Parcial
            </button>
          </div>
        ),
      },
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
                    description: "Cantidad a vender",
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
