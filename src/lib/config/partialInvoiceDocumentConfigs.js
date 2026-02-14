import { ORDER_TYPES } from "@/lib/utils/orderTypes";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import format from "@/lib/utils/format";
import Table from "@/components/ui/Table"; // Use Table inside renderExpandedContent? Or just a div list. Table is cleaner.
import PartialInvoiceExpandedItems from "@/components/partialInvoice/PartialInvoiceExpandedItems";
import unitsAreConsistent from "../utils/unitsConsistency";
import { createProductColumnsDetailForm } from "../utils/createProductColumnsForDocuments";
import { buildInvoiceLabel } from "../utils/invoiceLabel";
import moment from "moment-timezone";
import Swal from "sweetalert2";
import toast from "react-hot-toast";

export function createPartialInvoiceFormConfig({
  customers,
  products = [], // Groups of products
  onCustomerChange,
  currentCustomer,
  onSubmit,
  loading,
  customerSelectProps = {},
}) {
  return {
    title: "Nueva Factura Parcial",
    type: ORDER_TYPES.PARTIAL_INVOICE,
    loading,
    onSubmit,
    initialState: {
      selectedCustomer: currentCustomer || null,
      selectedCustomerForInvoice: currentCustomer
        ? currentCustomer.parties?.find((p) => p.isDefault) ||
          currentCustomer.parties?.[0] ||
          currentCustomer
        : null,
      products: products, // Correctly pass grouped products
    },
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
          onChange: async (customer, formState, updateField) => {
            if (onCustomerChange) {
              onCustomerChange(customer);
            }
            const parties = customer.parties || [];
            updateField("parties", [...parties, customer]);
            if (parties.length === 0) {
              updateField("selectedCustomerForInvoice", customer);
            } else {
              const defaultParty = parties.find((p) => p.isDefault);
              updateField(
                "selectedCustomerForInvoice",
                defaultParty || parties[0] || customer,
              );
            }
          },
          onSearch: customerSelectProps.onSearch,
          onLoadMore: customerSelectProps.onLoadMore,
          hasMore: customerSelectProps.hasMore,
          loading: customerSelectProps.loading,
        },
      ],
    ],
    // Columns for the GROUP (Parent Row)
    productColumns: ({ updateProductField }) => [
      {
        key: "product",
        label: "Producto",
        className: "w-[400px] min-w-[300px]",
        render: (_, row) => {
          const product = row.product?.attributes || row.product;
          return (
            <div className="whitespace-normal">
              <p className="font-medium text-sm text-white">
                {product?.name || "Sin nombre"}
              </p>
              <p className="text-xs text-zinc-400">
                {product?.code} - {product?.unit}
              </p>
            </div>
          );
        },
        footer: "Total",
      },
      {
        key: "totalAvailable",
        label: "Total Disponible",
        render: (_, row) => (
          <p className="text-zinc-400">
            {format(row.totalAvailable)} {row.product?.unit}
          </p>
        ),
        footer: (data) => {
          const products = data.map((d) => d.product);
          if (!unitsAreConsistent(products)) return "-";
          const total = data.reduce(
            (acc, d) => acc + Number(d.totalAvailable || 0),
            0,
          );
          return `${format(total)} ${products[0]?.unit || ""}`;
        },
      },
      {
        key: "quantity",
        label: "A Facturar",
        render: (_, row) => (
          <div className="flex items-center gap-2">
            <span
              className={
                row.quantity > row.totalAvailable
                  ? "text-red-500 font-bold"
                  : "text-white"
              }
            >
              {format(row.quantity)}
            </span>
            <span className="text-xs text-zinc-500">{row.product?.unit}</span>
          </div>
        ),
        footer: (data) => {
          const products = data.map((d) => d.product);
          if (!unitsAreConsistent(products)) return "---";
          const total = data.reduce(
            (acc, d) => acc + Number(d.quantity || 0),
            0,
          );
          return `${format(total)} ${products[0]?.unit || ""}`;
        },
      },
    ],
    renderExpandedContent: (
      row,
      index,
      { updateProductField, updateProductRow },
    ) => {
      const updateItem = (itemId, field, value) => {
        const newItems = row.items.map((i) => {
          if (i.id !== itemId) return i;
          if (field === "toInvoice") {
            return {
              ...i,
              [field]: value,
              invoiceQuantity: value ? i.currentQuantity : 0,
            };
          }
          return { ...i, [field]: value };
        });
        const newQuantity = newItems
          .filter((i) => i.toInvoice)
          .reduce((acc, i) => acc + Number(i.invoiceQuantity || 0), 0);
        const newTotal = newItems
          .filter((i) => i.toInvoice)
          .reduce(
            (acc, i) =>
              acc + Number(i.invoiceQuantity || 0) * (Number(i.price) || 0),
            0,
          );

        // Use atomic update if available
        if (updateProductRow) {
          updateProductRow({
            items: newItems,
            quantity: newQuantity,
            total: newTotal,
          });
        } else {
          updateProductField("items", newItems);
          updateProductField("quantity", newQuantity);
          updateProductField("total", newTotal);
        }
      };

      const toggleAllItems = (checked) => {
        const newItems = row.items.map((i) => ({
          ...i,
          toInvoice: checked,
          invoiceQuantity: checked ? i.currentQuantity : 0, // Auto-fill max quantity if checking
        }));

        const newQuantity = newItems
          .filter((i) => i.toInvoice)
          .reduce((acc, i) => acc + Number(i.invoiceQuantity || 0), 0);

        const newTotal = newItems
          .filter((i) => i.toInvoice)
          .reduce(
            (acc, i) =>
              acc + Number(i.invoiceQuantity || 0) * (Number(i.price) || 0),
            0,
          );

        if (updateProductRow) {
          updateProductRow({
            items: newItems,
            quantity: newQuantity,
            total: newTotal,
          });
        } else {
          updateProductField("items", newItems);
          updateProductField("quantity", newQuantity);
          updateProductField("total", newTotal);
        }
      };

      return (
        <PartialInvoiceExpandedItems
          row={row}
          onUpdateItem={updateItem}
          onToggleAll={toggleAllItems}
        />
      );
    },
    validateForm: (formState) => {
      // Validate that at least one group has quantity > 0
      return (
        formState.selectedCustomer &&
        formState.products.some((p) => Number(p.quantity) > 0)
      );
    },
    prepareSubmitData: (formState, user) => {
      const productsPayload = formState.products
        .filter((group) => group.quantity > 0)
        .map((group) => ({
          product: group.product.id,
          items: group.items
            .filter((i) => i.toInvoice && Number(i.invoiceQuantity) > 0)
            .map((i) => ({
              id: i.id, // ID of the item
              quantity: Number(i.invoiceQuantity),
              price: Number(i.price),
            })),
          requestedQuantity: group.quantity,
          price: group.total / group.quantity,
        }))
        .filter((p) => p.items.length > 0);
      const data = {
        type: "partial-invoice",
        customer: formState.selectedCustomer.id,
        customerForInvoice:
          formState.selectedCustomerForInvoice?.id ||
          formState.selectedCustomer.id,
        products: productsPayload,
        generatedBy: user.id,
      };
      console.log(data);
      return data;
    },
  };
}

export function createPartialInvoiceDetailConfig({
  customers,
  updateOrder,
  deleteOrder,
  refetch,
  getInvoices,
  invoiceableItems = [],
}) {
  return {
    type: "partial-invoice",
    title: (document) => buildInvoiceLabel(document),
    disableDedupe: true, // Prevent useDocumentDetail from re-merging/deduping our carefully constructed list
    redirectPath: "/partial-invoices",
    allowAddItems: false,
    showItemInput: false,
    allowManualEntry: false,
    mergeExpansionToggle: true, // IMPORTANT: Enable merged toggle
    data: {
      customers,
    },
    updateDocument: updateOrder,
    deleteDocument: deleteOrder,
    getInvoices,
    getInitialState: (document) => {
      const customer = document.customer;
      const customerForInvoice = document.customerForInvoice;
      let parties = [];
      if (customer) {
        const customerParties = Array.isArray(customer.parties)
          ? customer.parties
          : [];
        parties = [...customerParties, customer];
        // Ensure customerForInvoice is included
        if (
          customerForInvoice &&
          !parties.find((p) => p.id === customerForInvoice.id)
        ) {
          parties.push(customerForInvoice);
        }
      }

      // --- MERGE LOGIC START ---
      console.log("getInitialState: invoiceableItems", invoiceableItems);
      // 1. Map invoiceable items to our Product Group structure (initially unselected)
      const availableGroups = invoiceableItems.map((group) => ({
        id: group.product.id,
        product: group.product,
        items: group.items.map((item) => ({
          ...item,
          toInvoice: false,
          invoiceQuantity: item.currentQuantity, // Default to max
          price: item.price || 0,
        })),
        totalAvailable: group.totalQuantity || 0,
        quantity: 0,
        total: 0,
        price: 0,
      }));

      // 2. Map existing saved products from the Order
      const savedGroups = (document.orderProducts || []).map((p) => ({
        ...p,
        items: p.items || [],
      }));

      // 3. Merge: savedGroups override availableGroups
      // We start with availableGroups to get the "full picture"
      const mergedProducts = [...availableGroups];

      console.log(
        "getInitialState: availableGroups before merge",
        availableGroups,
      );
      console.log("getInitialState: savedGroups", savedGroups);

      savedGroups.forEach((savedGroup) => {
        const savedProductId =
          savedGroup.product?.data?.id || savedGroup.product?.id;

        const existingIndex = mergedProducts.findIndex((p) => {
          const pId = p.product?.data?.id || p.product?.id;
          return String(pId) === String(savedProductId);
        });

        console.log(
          `Merging Group Product ${savedProductId}: Found index ${existingIndex}`,
        );

        if (existingIndex !== -1) {
          // Group exists in available, merge items
          const existingGroup = mergedProducts[existingIndex];
          const mergedItems = [...existingGroup.items];

          savedGroup.items.forEach((savedItem) => {
            // Robust matching strategy with String coercion
            const matchIndex = mergedItems.findIndex(
              (i) =>
                String(i.id) === String(savedItem.id) ||
                (savedItem.item?.id &&
                  String(i.id) === String(savedItem.item.id)) ||
                (savedItem.item && String(i.id) === String(savedItem.item)) ||
                (i.barcode && i.barcode === savedItem.barcode),
            );

            if (matchIndex !== -1) {
              // Found match in available items -> Mark as selected and sync quantity from saved
              mergedItems[matchIndex] = {
                ...mergedItems[matchIndex],
                ...savedItem, // Keep saved context
                toInvoice: true,
                invoiceQuantity: savedItem.quantity,
                quantity: savedItem.quantity, // Populate quantity
                price: savedItem.price,
                // Ensure display fields
                itemNumber:
                  savedItem.itemNumber ||
                  savedItem.item?.itemNumber ||
                  mergedItems[matchIndex].itemNumber,
                lotNumber:
                  savedItem.lotNumber ||
                  savedItem.lot ||
                  savedItem.item?.lotNumber ||
                  savedItem.item?.lot ||
                  mergedItems[matchIndex].lotNumber ||
                  mergedItems[matchIndex].lot,
              };
            } else {
              // Item saved but NOT in available list.
              // NORMALIZE: Ensure we have display fields like barcode
              const normalizedItem = {
                ...savedItem,
                toInvoice: true,
                invoiceQuantity: savedItem.quantity,
                currentQuantity: savedItem.quantity,
                quantity: savedItem.quantity, // Populate quantity
                barcode:
                  savedItem.barcode ||
                  savedItem.item?.data?.attributes?.barcode ||
                  savedItem.item?.barcode,
                // Ensure display fields
                itemNumber: savedItem.itemNumber || savedItem.item?.itemNumber,
                lotNumber:
                  savedItem.lotNumber ||
                  savedItem.lot ||
                  savedItem.item?.lotNumber ||
                  savedItem.item?.lot,
              };
              mergedItems.push(normalizedItem);
            }
          });

          console.log(
            `Merged Items for Group ${savedGroup.product?.id}:`,
            mergedItems,
          );

          mergedProducts[existingIndex] = {
            ...existingGroup,
            items: mergedItems,
            quantity: savedGroup.quantity || savedGroup.requestedQuantity,
            total: (savedGroup.quantity || 0) * (savedGroup.price || 0),
          };
        } else {
          // Group only in saved, add it whole
          mergedProducts.push({
            id: savedGroup.product.id,
            product: savedGroup.product,
            items: savedGroup.items.map((i) => ({
              ...i,
              toInvoice: true,
              invoiceQuantity: i.quantity,
              currentQuantity: i.quantity,
              quantity: i.quantity, // Populate quantity
              // Ensure display fields
              itemNumber: i.itemNumber || i.item?.itemNumber,
              lotNumber:
                i.lotNumber || i.lot || i.item?.lotNumber || i.item?.lot,
            })),
            totalAvailable: savedGroup.quantity,
            quantity: savedGroup.quantity,
            total: (savedGroup.quantity || 0) * (savedGroup.price || 0),
          });
        }
      });

      // Recalculate totals for all merged groups to be safe
      const finalProducts = mergedProducts.map((group) => {
        const activeItems = group.items.filter((i) => i.toInvoice);
        const quantity = activeItems.reduce(
          (sum, i) => sum + Number(i.invoiceQuantity || 0),
          0,
        );
        const total = activeItems.reduce(
          (sum, i) =>
            sum + Number(i.invoiceQuantity || 0) * Number(i.price || 0),
          0,
        );
        return {
          ...group,
          quantity,
          total,
        };
      });

      console.log("Final Merged Products:", finalProducts);

      return {
        selectedCustomer: customer.id,
        selectedCustomerForInvoice: customerForInvoice?.id,
        parties,
        createdDate: document.createdDate,
        state: document.state,
        manualInvoiceNumbers: document.manualInvoiceNumbers,
        completedDate: document.completedDate,
        orderProducts: finalProducts, // Inject merged products here as orderProducts to override DB data in useDocumentDetail
        products: finalProducts, // Keep this just in case
      };
    },
    headerFields: [
      {
        label: "Cliente",
        type: "select",
        key: "selectedCustomer",
        options: customers.map((c) => ({
          label: `${c.name} ${c.lastName || ""}`,
          value: c.id,
        })),
        searchable: true,
        disabled: true, // Can't change customer on partial invoice
      },
      {
        label: "Cliente para la factura",
        type: "select",
        key: "selectedCustomerForInvoice",
        options: (state) => {
          if (!state.parties) return [];
          return state.parties.map((p) => ({
            label: `${p.name} ${p.lastName || ""}`,
            value: p.id,
          }));
        },
        searchable: true,
        onChange: (value, state, updateState) => {
          // Find full party object
          const party = state.parties.find((p) => p.id == value);
          updateState({ selectedCustomerForInvoice: party || value });
        },
      },
      {
        label: "Fecha de Creación",
        type: "date",
        key: "createdDate",
        disabled: true,
      },
    ],
    productColumns: [
      {
        key: "name",
        label: "Producto",
      },
    ],
    productColumns2: createProductColumnsDetailForm({
      useProductIdAsValue: true,
      includePrice: true,
      includeIVA: true,
      quantityKey: "quantity", // In partial invoice, quantity is what we are modifying
      quantityLabel: "Cantidad",
      includeInvoicePercentage: true,
      productFooter: "Total",
      includeUnit: true,
      disableProductSelect: true,
      quantityFooter: (data) => {
        // Check unit consistency for footer
        const products = data.map((d) => d.product).filter(Boolean);
        if (!unitsAreConsistent(products)) return "---";

        const total = data.reduce((acc, d) => acc + Number(d.quantity || 0), 0);
        return `${format(total)} ${products[0]?.unit || ""}`;
      },
      includeTotal: true,
      totalFooter: (data) =>
        format(
          data.reduce((acc, p) => acc + (p.price || 0) * (p.quantity || 0), 0),
          "$",
        ),
      onProductChange: (product, row, state) => {
        // Price update logic if needed when changing customerForInvoice
        const priceData = state.selectedCustomerForInvoice?.prices?.find(
          (p) => p.product.id === product.id,
        );
        if (priceData) {
          return {
            ...row,
            product,
            price: String(priceData.unitPrice),
            ivaIncluded:
              priceData.ivaIncluded === true ||
              String(priceData.ivaIncluded) === "true",
            invoicePercentage: priceData.invoicePercentage || 100,
          };
        }
        return { ...row, product };
      },
    }),
    renderExpandedContent2: (
      row,
      index,
      { updateProductField, updateProductRow },
    ) => {
      // Re-use logic from createPartialInvoiceFormConfig
      const updateItem = (itemId, field, value) => {
        const newItems = row.items.map((i) => {
          if (i.id !== itemId) return i;
          if (field === "toInvoice") {
            const invQty = value ? i.currentQuantity : 0;
            return {
              ...i,
              [field]: value,
              invoiceQuantity: invQty,
              quantity: invQty, // Sync quantity for DocumentDetail calculations
            };
          }
          // If manually changing invoiceQuantity (future case)
          if (field === "invoiceQuantity") {
            return { ...i, [field]: value, quantity: value };
          }
          return { ...i, [field]: value };
        });
        const newQuantity = newItems
          .filter((i) => i.toInvoice)
          .reduce((acc, i) => acc + Number(i.invoiceQuantity || 0), 0);
        const newTotal = newItems
          .filter((i) => i.toInvoice)
          .reduce(
            (acc, i) =>
              acc + Number(i.invoiceQuantity || 0) * (Number(i.price) || 0),
            0,
          );

        // Atomic update
        if (updateProductRow) {
          updateProductRow({
            items: newItems,
            quantity: newQuantity,
            total: newTotal,
          });
        }
      };

      const toggleAllItems = (checked) => {
        const newItems = row.items.map((i) => ({
          ...i,
          toInvoice: checked,
          invoiceQuantity: checked ? i.currentQuantity : 0,
          quantity: checked ? i.currentQuantity : 0, // Sync quantity
        }));

        const newQuantity = newItems
          .filter((i) => i.toInvoice)
          .reduce((acc, i) => acc + Number(i.invoiceQuantity || 0), 0);

        const newTotal = newItems
          .filter((i) => i.toInvoice)
          .reduce(
            (acc, i) =>
              acc + Number(i.invoiceQuantity || 0) * (Number(i.price) || 0),
            0,
          );

        if (updateProductRow) {
          updateProductRow({
            items: newItems,
            quantity: newQuantity,
            total: newTotal,
          });
        }
      };

      return (
        <PartialInvoiceExpandedItems
          row={row}
          onUpdateItem={updateItem}
          onToggleAll={toggleAllItems}
        />
      );
    },
    actions: [
      {
        label: (document) =>
          document.siigoIdTypeA || document.siigoIdTypeB
            ? "Descargar Facturas"
            : "Completar y Facturar",
        variant:
          document.siigoIdTypeA || document.siigoIdTypeB ? "emerald" : "cyan",
        visible: (document) => document.state !== "canceled",
        onClick: async (document, state, { updateDocument, refetch }) => {
          if (
            document.state === "completed" &&
            (document.siigoIdTypeA || document.siigoIdTypeB)
          ) {
            // Logic to download invoices if already completed and invoiced
            toast.loading("Descargando facturas...");
            const result = await getInvoices(document.id);
            toast.dismiss();
            if (result.success) {
              toast.success("Facturas descargadas");
            } else {
              toast.error("Error al descargar facturas");
            }
            return;
          }

          if (
            document.state === "completed" &&
            !document.siigoIdTypeA &&
            !document.siigoIdTypeB
          ) {
            // Completed but not invoiced (manual or just completed)
            // Maybe allow adding invoice manually?
            // For now simpler logic:
          }

          const result = await Swal.fire({
            title: "Completar Factura Parcial",
            text: "¿Estás seguro? Esto generará la factura en Siigo.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, completar",
            cancelButtonText: "Cancelar",
            background: "#27272a",
            color: "#fff",
            confirmButtonColor: "#06b6d4",
          });

          if (result.isConfirmed) {
            const confirmResult = await Swal.fire({
              title: "Método de facturación",
              text: "¿Generar factura automática o asociar manual?",
              icon: "question",
              showCancelButton: true,
              showDenyButton: true,
              confirmButtonText: "Automática",
              denyButtonText: "Manual",
              background: "#27272a",
              color: "#fff",
            });

            if (confirmResult.isConfirmed) {
              // Automatic
              const newState = {
                state: "completed",
                completedDate: moment().tz("America/Bogota").toDate(),
                emitInvoice: true,
              };
              await updateDocument(document.id, {}, true, newState);
              await refetch();
              toast.success("Factura parcial completada");
            } else if (confirmResult.isDenied) {
              // Manual
              const manualResult = await Swal.fire({
                title: "Número de Factura",
                input: "text",
                showCancelButton: true,
                background: "#27272a",
                color: "#fff",
              });

              if (manualResult.isConfirmed && manualResult.value) {
                const newState = {
                  state: "completed",
                  completedDate: moment().tz("America/Bogota").toDate(),
                  manualInvoiceNumbers: manualResult.value
                    .split(",")
                    .map((s) => s.trim()),
                };
                await updateDocument(document.id, {}, true, newState);
                await refetch();
                toast.success("Factura manual asociada");
              }
            }
          }
        },
      },
    ],
    prepareUpdateData: (_, products, state) => {
      // Logic for updating the partial invoice (re-calculating items)
      // Similar to prepareSubmitData but for update
      const productsPayload = products
        .map((group) => {
          const validItems = group.items
            .filter((i) => i.toInvoice && Number(i.invoiceQuantity) > 0)
            .map((i) => ({
              id: i.id,
              quantity: Number(i.invoiceQuantity),
              price: Number(i.price),
            }));

          if (validItems.length === 0) return null;

          return {
            product: group.product.id,
            items: validItems,
            requestedQuantity: group.quantity,
            price: Number(group.price),
          };
        })
        .filter(Boolean);

      const data = {
        customerForInvoice: state.selectedCustomerForInvoice?.id,
        products: productsPayload,
        state: state.state === "draft" ? "confirmed" : state.state, // Auto confirm if saving?
        emitInvoice: state.emitInvoice,
        manualInvoiceNumbers: state.manualInvoiceNumbers,
        completedDate: state.completedDate,
      };
      return data;
    },
    // Use invoice section logic
    invoice: {
      enabled: true,
      title: (document) => "Factura",
      taxes: (state) => {
        const selectedId = state.selectedCustomerForInvoice?.id;
        return state.parties.find((p) => p.id == selectedId)?.taxes || [];
      },
    },
  };
}
