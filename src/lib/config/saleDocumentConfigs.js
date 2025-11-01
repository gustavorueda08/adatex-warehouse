import format from "@/lib/utils/format";
import moment from "moment-timezone";
import Swal from "sweetalert2";

/**
 * Configuración V2 para Sales - Compatible con DocumentDetailBaseV2
 * Usa pattern config + initialData (sin props externos)
 */
export function createSaleDetailConfig({
  order,
  customers,
  warehouses,
  products,
  updateOrder,
  deleteOrder,
  addItem,
  removeItem,
}) {
  return {
    type: "sale",
    title: (document) => {
      const baseTitle = document.code || "";
      const container = document.containerCode
        ? ` | ${document.containerCode}`
        : "";
      const isConsignment =
        document.state === "completed" && !document?.siigoId;
      const consignmentLabel = isConsignment ? " (Remisión)" : "";
      return `${baseTitle}${container}${consignmentLabel}`;
    },
    redirectPath: "/sales",

    data: {
      customers: customers || [],
      warehouses: warehouses || [],
      products: products || [],
    },

    // CRUD operations
    updateDocument: updateOrder,
    deleteDocument: deleteOrder,
    addItem,
    removeItem,

    // Estado inicial del formulario
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
        selectedCustomer: customer,
        selectedCustomerForInvoice: customerForInvoice,
        selectedWarehouse: document.sourceWarehouse,
        parties,
        createdDate: document.createdDate,
        actualDispatchDate: document.actualDispatchDate,
        confirmedDate: document.confirmedDate,
        completedDate: document.completedDate,
      };
    },

    // State handlers - Lógica de estado reutilizable
    stateHandlers: {
      // SOLUCIÓN al problema de parties/customerForInvoice
      onCustomerChange: (customerId, state, updateState) => {
        const customer = customers.find((c) => c.id == customerId);
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

    // Header fields con acceso al estado interno
    headerFields: [
      {
        label: "Cliente",
        type: "select",
        key: "selectedCustomer",
        options: (state, data) => {
          if (!data.customers) return [];
          return data.customers.map((c) => ({ label: c.name, value: c.id }));
        },
        searchable: true,
        onChange: "onCustomerChange", // Referencia al state handler
      },
      {
        label: "Cliente para la factura",
        type: "select",
        key: "selectedCustomerForInvoice",
        options: (state, data) => {
          if (!state.parties) return [];
          return state.parties.map((p) => ({ label: p.name, value: p.id }));
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
          // Auto-fill precio desde customerForInvoice.prices
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
      },
      {
        key: "price",
        label: "Precio",
        type: "input",
        editable: true,
        placeholder: "$",
        className: "md:max-w-28",
      },
      {
        key: "ivaIncluded",
        label: "IVA Incluido",
        type: "checkbox",
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

    // Actions con contexto completo
    actions: [
      {
        label: "Confirmar Orden",
        variant: "cyan",
        visible: (document) => document.state === "draft",
        onClick: async (document, state, { updateDocument }) => {
          await updateDocument(document.id, {
            state: "confirmed",
            confirmedDate: moment.tz("America/Bogota").toDate(),
          });
        },
      },
      {
        label: "Despachar orden",
        variant: "emerald",
        visible: (document) => document.state !== "completed",
        onClick: async (document, state, { updateDocument, showToast }) => {
          try {
            await updateDocument(document.id, {
              state: "completed",
              completedDate: moment.tz("America/Bogota").toDate(),
              customer: state.selectedCustomer?.id,
              customerForInvoice: state.selectedCustomerForInvoice?.id,
              sourceWarehouse: state.selectedWarehouse?.id,
            });
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
        onClick: async (document) => {
          await handleDocumentExport(document, { includeLot: false });
        },
      },
      {
        label: (document) =>
          document.siigoId || document.invoiceNumber
            ? "Descargar factura"
            : "Facturar Orden",
        variant: "emerald",
        onClick: async (document, state, { updateDocument }) => {
          if (!document.siigoId && !document.invoiceNumber) {
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
                await updateDocument(document.id, {
                  state: "completed",
                  completedDate: moment.tz("America/Bogota").toDate(),
                  emitInvoice: true,
                });
              } catch (error) {
                toast.error("Error al facturar la orden");
                throw error;
              }
            }
          } else {
            // TODO: Descargar factura
          }
        },
      },
    ],

    // Preparar datos para actualización
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
        customer: state.selectedCustomer?.id,
        customerForInvoice: state.selectedCustomerForInvoice?.id,
        sourceWarehouse: state.selectedWarehouse?.id,
        createdDate: state.createdDate,
        actualDispatchDate: state.actualDispatchDate,
        state: "completed",
      };
    },

    // Invoice config
    invoice: {
      enabled: true,
      title: (document) =>
        document.state === "draft" || document.state === "confirmed"
          ? "Factura Proforma"
          : "Factura",
      taxes: (state) => {
        return state.selectedCustomerForInvoice?.taxes || [];
      },
    },
    // Custom sections
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
    ],
  };
}
