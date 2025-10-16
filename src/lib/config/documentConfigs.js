// lib/config/documentConfigs.js
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import format from "@/lib/utils/format";
import { ORDER_TYPES } from "@/lib/utils/orderTypes";
import unitsAreConsistent from "@/lib/utils/unitsConsistency";
import moment from "moment-timezone";

/**
 * ============================================================================
 * CONFIGURACIÓN PARA DOCUMENTOS DE VENTA
 * ============================================================================
 */
export const saleDocumentConfig = {
  documentType: "sale",
  redirectPath: "/sales",

  // Fields que encabezan la página
  getHeaderFields: ({
    customers,
    parties,
    warehouses,
    selectedCustomer,
    setSelectedCustomer,
    selectedCustomerForInvoice,
    setSelectedCustomerForInvoice,
    selectedWarehouse,
    setSelectedWarehouse,
    dateCreated,
    dateTransit,
    dateArrived,
  }) => [
    {
      label: "Cliente",
      type: "select",
      options: customers.map((c) => ({ label: c.name, value: c.id })),
      value: selectedCustomer?.id,
      onChange: (id) => setSelectedCustomer(customers.find((c) => c.id === id)),
      searchable: true,
    },
    {
      label: "Cliente para la factura",
      type: "select",
      options: parties.map((c) => ({ label: c.name, value: c.id })),
      value: selectedCustomerForInvoice?.id,
      onChange: (id) =>
        setSelectedCustomerForInvoice(parties.find((c) => c.id === id)),
      searchable: true,
    },
    {
      label: "Fecha de Creación",
      type: "date",
      value: dateCreated,
      disabled: true,
    },
    {
      label: "Origen",
      type: "select",
      options: warehouses.map((w) => ({ label: w.name, value: w.id })),
      value: selectedWarehouse?.id,
      onChange: (id) =>
        setSelectedWarehouse(warehouses.find((w) => w.id === id)),
      searchable: true,
    },
    {
      label: "Fecha de confirmación",
      type: "date",
      value: dateTransit,
      disabled: true,
    },
    {
      label: "Fecha de despacho",
      type: "date",
      value: dateArrived,
      disabled: true,
    },
  ],

  // Columnas del resumen de productos
  getProductColumns: (
    updateProductField,
    handleProductSelect,
    getAvailableProducts,
    isReadOnly,
    user
  ) => [
    {
      key: "name",
      label: "Producto",
      render: (_, row, index) => {
        const availableProducts = getAvailableProducts(index);
        const selectOptions = row.product
          ? [
              { label: row.product.name, value: row.product },
              ...availableProducts
                .filter((p) => p.id !== row.product.id)
                .map((p) => ({ label: p.name, value: p })),
            ]
          : availableProducts.map((p) => ({ label: p.name, value: p }));

        return (
          <Select
            className="md:min-w-80"
            options={selectOptions}
            value={row.product || null}
            onChange={(product) => handleProductSelect(product, index)}
            searchable
            disabled={isReadOnly}
          />
        );
      },
      footer: "Total",
    },
    {
      key: "price",
      label: "Precio",
      render: (_, row) => (
        <Input
          input={row.price}
          setInput={(value) => updateProductField(row.id, "price", value)}
          placeholder="$"
          className="md:max-w-28"
          disabled={isReadOnly}
        />
      ),
      footer: "-",
    },
    {
      key: "ivaIncluded",
      label: "IVA Incluido",
      render: (_, row) => (
        <Checkbox
          variant="cyan"
          checked={row.ivaIncluded}
          onCheck={(value) => updateProductField(row.id, "ivaIncluded", value)}
          disabled={isReadOnly}
        />
      ),
      footer: "-",
    },
    {
      key: "requestedQuantity",
      label: "Cantidad requerida",
      render: (_, row) => (
        <Input
          input={row.requestedQuantity}
          setInput={(value) =>
            updateProductField(row.id, "requestedQuantity", value)
          }
          placeholder="Cantidad"
          className="md:max-w-28"
          disabled={isReadOnly}
        />
      ),
      footer: (data) =>
        format(
          data.reduce((acc, d) => acc + Number(d.requestedQuantity || 0), 0)
        ),
    },
    {
      key: "requestedPackages",
      label: "Items requeridos",
      render: (_, row) => (
        <p className="flex justify-start">
          {format(
            Math.round(
              row.requestedQuantity / (row.product?.unitsPerPackage || 1)
            ) || 0
          ) || "-"}
        </p>
      ),
      footer: (data) =>
        format(
          data.reduce(
            (acc, d) =>
              acc +
              Number(
                Math.round(
                  d.requestedQuantity / (d.product?.unitsPerPackage || 1)
                ) || 0
              ),
            0
          )
        ),
    },
    {
      key: "items",
      label: "Cantidad confirmada",
      render: (_, row) => (
        <p>
          {format(
            row.items?.reduce(
              (acc, item) => acc + Number(item?.quantity || 0),
              0
            ) || 0
          ) || "-"}
        </p>
      ),
      footer: (data) => {
        const total =
          data
            .flatMap((p) => p.items)
            .reduce((acc, item) => acc + Number(item?.quantity || 0), 0) || 0;
        return format(total) || "-";
      },
    },
    {
      key: "itemsConfirmed",
      label: "Items Confirmados",
      render: (_, row) =>
        format(row.items?.filter((i) => i.quantity > 0).length || 0) || "-",
      footer: (data) => {
        const total = data.reduce(
          (acc, p) =>
            acc + (p.items?.filter((i) => i.quantity > 0).length || 0),
          0
        );
        return format(total) || "-";
      },
    },
    {
      key: "unit",
      label: "Unidad",
      render: (_, row) => (
        <p className="flex justify-start">{row?.product?.unit || "-"}</p>
      ),
      footer: "-",
    },
    ...(user?.type === "admin"
      ? [
          {
            key: "invoicePercentage",
            label: "%",
            render: (_, row) => (
              <Input
                placeholder="%"
                className="max-w-11"
                input={row.invoicePercentage}
                setInput={(value) =>
                  updateProductField(row.id, "invoicePercentage", value)
                }
              />
            ),
            footer: <p>-</p>,
          },
        ]
      : []),
  ],

  // Acciones que se pueden realizar
  getActions: ({ handleComplete, loadingComplete, document }) => [
    {
      label: "Despachar orden",
      variant: "emerald",
      loading: loadingComplete,
      onClick: handleComplete,
      disabled: document?.state === "completed",
    },
    {
      label: "Descargar lista de empaque",
      variant: "cyan",
      onClick: () => console.log("Descargar packing list"),
    },
    {
      label: "Descargar factura",
      variant: "yellow",
      onClick: () => console.log("Descargar factura"),
    },
  ],
};

/**
 * ============================================================================
 * CONFIGURACIÓN PARA DOCUMENTOS DE COMPRA
 * ============================================================================
 */
export const purchaseDocumentConfig = {
  documentType: "purchase",
  redirectPath: "/purchases",

  getHeaderFields: ({
    suppliers,
    warehouses,
    selectedSupplier,
    setSelectedSupplier,
    selectedWarehouse,
    setSelectedWarehouse,
    createdDate,
    actualDispatchDate,
    setActualDispatchDate,
  }) => [
    {
      label: "Proveedor",
      type: "select",
      options: suppliers.map((s) => ({ label: s.name, value: s.id })),
      value: selectedSupplier?.id,
      onChange: (id) => setSelectedSupplier(suppliers.find((s) => s.id === id)),
      searchable: true,
    },
    {
      label: "Bodega destino",
      type: "select",
      options: warehouses.map((w) => ({ label: w.name, value: w.id })),
      value: selectedWarehouse?.id,
      onChange: (id) =>
        setSelectedWarehouse(warehouses.find((w) => w.id === id)),
      searchable: true,
    },
    {
      label: "Fecha de Creación",
      type: "date",
      value: createdDate,
      onChange: () => {},
      disabled: true,
    },
    {
      label: "Fecha de despacho",
      type: "date",
      value: actualDispatchDate,
      onChange: setActualDispatchDate,
    },
  ],

  getProductColumns: (
    updateProductField,
    handleProductSelect,
    getAvailableProducts,
    isReadOnly
  ) => [
    {
      key: "name",
      label: "Producto",
      render: (_, row, index) => {
        const availableProducts = getAvailableProducts(index);
        const selectOptions = row.product
          ? [
              { label: row.product.name, value: row.product },
              ...availableProducts
                .filter((p) => p.id !== row.product.id)
                .map((p) => ({ label: p.name, value: p })),
            ]
          : availableProducts.map((p) => ({ label: p.name, value: p }));

        return (
          <Select
            className="md:min-w-80"
            options={selectOptions}
            value={row.product || null}
            onChange={(product) => handleProductSelect(product, index)}
            searchable
            disabled={isReadOnly}
          />
        );
      },
      footer: "Total",
    },
    {
      key: "price",
      label: "Precio Unitario",
      render: (_, row) => (
        <Input
          input={row.price}
          setInput={(value) => updateProductField(row.id, "price", value)}
          placeholder="$"
          className="md:max-w-28"
          disabled={isReadOnly}
        />
      ),
      footer: "-",
    },
    {
      key: "requestedQuantity",
      label: "Cantidad Solicitada",
      render: (_, row) => (
        <Input
          input={row.requestedQuantity}
          setInput={(value) =>
            updateProductField(row.id, "requestedQuantity", value)
          }
          placeholder="Cantidad"
          className="md:max-w-28"
          disabled={isReadOnly}
        />
      ),
      footer: (data) =>
        format(data.reduce((acc, d) => acc + Number(d.quantity || 0), 0)),
    },
    {
      key: "items",
      label: "Cantidad Recibida",
      render: (_, row) =>
        format(
          row.items?.reduce(
            (acc, item) => acc + Number(item?.quantity || 0),
            0
          ) || 0
        ) || "-",
      footer: (data) => {
        const total =
          data
            .flatMap((p) => p.items)
            .reduce((acc, item) => acc + Number(item?.quantity || 0), 0) || 0;
        return format(total) || "-";
      },
    },
    {
      label: "Total",
      render: (_, row) =>
        format(
          row.price *
            row.items?.reduce((acc, item) => acc + item.currentQuantity, 0) ||
            0,
          "$"
        ),
      footer: (data) =>
        format(
          data.reduce((acc, p) => acc + (p.price || 0) * (p.quantity || 0), 0),
          "$"
        ),
    },
  ],

  getActions: ({ handleReceive, loadingReceive, document }) => [
    {
      label: "Recibir orden",
      variant: "emerald",
      loading: loadingReceive,
      onClick: handleReceive,
      disabled: document?.state === "completed",
    },
    {
      label: "Descargar orden de compra",
      variant: "cyan",
      onClick: () => console.log("Descargar orden"),
    },
  ],
};

/**
 * ============================================================================
 * CONFIGURACIÓN PARA DOCUMENTOS DE DEVOLUCIÓN
 * ============================================================================
 */
export const returnDocumentConfig = {
  documentType: "return",
  redirectPath: "/returns",

  getHeaderFields: ({
    warehouses,
    selectedWarehouse,
    setSelectedWarehouse,
    dateCreated,
    returnReason,
    setReturnReason,
    sourceOrder,
  }) => [
    {
      label: "Orden de venta original",
      type: "input",
      value: sourceOrder?.code || "-",
      disabled: true,
      render: (field) => (
        <div className="px-3 py-2 bg-zinc-700 rounded-md border border-zinc-600">
          <p className="text-white">{field.value}</p>
        </div>
      ),
    },
    {
      label: "Cliente",
      type: "input",
      value: sourceOrder?.customer?.name || "-",
      disabled: true,
      render: (field) => (
        <div className="px-3 py-2 bg-zinc-700 rounded-md border border-zinc-600">
          <p className="text-white">{field.value}</p>
        </div>
      ),
    },
    {
      label: "Bodega destino",
      type: "select",
      options: warehouses.map((w) => ({ label: w.name, value: w.id })),
      value: selectedWarehouse?.id,
      onChange: (id) =>
        setSelectedWarehouse(warehouses.find((w) => w.id === id)),
      searchable: true,
    },
    {
      label: "Fecha de devolución",
      type: "date",
      value: dateCreated,
      disabled: true,
    },
    {
      label: "Motivo de devolución",
      type: "select",
      options: [
        { label: "Producto defectuoso", value: "defective" },
        { label: "Producto equivocado", value: "wrong_product" },
        { label: "Cliente insatisfecho", value: "unsatisfied" },
        { label: "Otro", value: "other" },
      ],
      value: returnReason,
      onChange: setReturnReason,
    },
  ],

  getProductColumns: (
    updateProductField,
    handleProductSelect,
    getAvailableProducts,
    isReadOnly
  ) => [
    {
      key: "name",
      label: "Producto",
      render: (_, row) => <p>{row.product?.name || "-"}</p>,
      footer: "Total",
    },
    {
      key: "originalQuantity",
      label: "Cantidad original",
      render: (_, row) => (
        <p>
          {format(
            row.items
              ?.filter((i) => i.parentItem)
              ?.reduce((acc, item) => {
                // La cantidad del parentItem es la cantidad original
                return (
                  acc +
                  (item.parentItem?.quantity ||
                    item.parentItem?.currentQuantity ||
                    0)
                );
              }, 0) || 0
          ) || "-"}
        </p>
      ),
      footer: (data) => {
        const total = data.reduce((acc, p) => {
          const productTotal =
            p.items
              ?.filter((i) => i.parentItem)
              ?.reduce((sum, item) => {
                return (
                  sum +
                  (item.parentItem?.quantity ||
                    item.parentItem?.currentQuantity ||
                    0)
                );
              }, 0) || 0;
          return acc + productTotal;
        }, 0);
        return format(total) || "-";
      },
    },
    {
      key: "returnQuantity",
      label: "Cantidad devuelta",
      render: (_, row) => (
        <p>
          {format(
            row.items?.reduce(
              (acc, item) => acc + Number(item?.quantity || 0),
              0
            ) || 0
          ) || "-"}
        </p>
      ),
      footer: (data) => {
        const total =
          data
            .flatMap((p) => p.items)
            .reduce((acc, item) => acc + Number(item?.quantity || 0), 0) || 0;
        return format(total) || "-";
      },
    },
    {
      key: "itemsCount",
      label: "Items devueltos",
      render: (_, row) =>
        format(row.items?.filter((i) => i.quantity > 0).length || 0) || "-",
      footer: (data) => {
        const total = data.reduce(
          (acc, p) =>
            acc + (p.items?.filter((i) => i.quantity > 0).length || 0),
          0
        );
        return format(total) || "-";
      },
    },
    {
      key: "unit",
      label: "Unidad",
      render: (_, row) => (
        <p className="flex justify-start">{row?.product?.unit || "-"}</p>
      ),
      footer: "-",
    },
  ],

  getActions: ({ handleProcess, loadingProcess, document }) => [
    {
      label: "Procesar devolución",
      variant: "emerald",
      loading: loadingProcess,
      onClick: handleProcess,
      disabled: document?.state === "completed",
    },
  ],
};

/**
 * ============================================================================
 * CONFIGURACIÓN PARA ENTRADAS DE INVENTARIO
 * ============================================================================
 */
export const inDocumentConfig = {
  documentType: "in",
  redirectPath: "/inventory/in",

  getHeaderFields: ({
    warehouses,
    selectedWarehouse,
    setSelectedWarehouse,
    dateCreated,
    setDateCreated,
    inType,
    setInType,
  }) => [
    {
      label: "Bodega",
      type: "select",
      options: warehouses.map((w) => ({ label: w.name, value: w.id })),
      value: selectedWarehouse?.id,
      onChange: (id) =>
        setSelectedWarehouse(warehouses.find((w) => w.id === id)),
      searchable: true,
    },
    {
      label: "Tipo de entrada",
      type: "select",
      options: [
        { label: "Ajuste de inventario", value: "adjustment" },
        { label: "Producción", value: "production" },
        { label: "Devolución de cliente", value: "return" },
        { label: "Otro", value: "other" },
      ],
      value: inType,
      onChange: setInType,
    },
    {
      label: "Fecha",
      type: "date",
      value: dateCreated,
      onChange: setDateCreated,
    },
  ],

  getProductColumns: (
    updateProductField,
    handleProductSelect,
    getAvailableProducts,
    isReadOnly
  ) => [
    {
      key: "name",
      label: "Producto",
      render: (_, row, index) => (
        <Select
          className="md:min-w-80"
          options={getAvailableProducts(index).map((p) => ({
            label: p.name,
            value: p,
          }))}
          value={row.product || null}
          onChange={(product) => handleProductSelect(product, index)}
          searchable
          disabled={isReadOnly}
        />
      ),
      footer: "Total",
    },
    {
      key: "quantity",
      label: "Cantidad",
      render: (_, row) => (
        <Input
          input={row.quantity}
          setInput={(value) => updateProductField(row.id, "quantity", value)}
          placeholder="Cantidad"
          className="md:max-w-28"
          disabled={isReadOnly}
        />
      ),
      footer: (data) =>
        format(data.reduce((acc, d) => acc + Number(d.quantity || 0), 0)),
    },
    {
      key: "unit",
      label: "Unidad",
      render: (_, row) => (
        <p className="flex justify-start">{row?.product?.unit || "-"}</p>
      ),
      footer: "-",
    },
  ],

  getActions: ({ handleConfirm, loadingConfirm, document }) => [
    {
      label: "Confirmar entrada",
      variant: "emerald",
      loading: loadingConfirm,
      onClick: handleConfirm,
      disabled: document?.state === "completed",
    },
  ],
};

/**
 * ============================================================================
 * CONFIGURACIÓN PARA SALIDAS DE INVENTARIO
 * ============================================================================
 */
export const outDocumentConfig = {
  documentType: "out",
  redirectPath: "/inventory/out",

  getHeaderFields: ({
    warehouses,
    selectedWarehouse,
    setSelectedWarehouse,
    dateCreated,
    setDateCreated,
    outType,
    setOutType,
  }) => [
    {
      label: "Bodega",
      type: "select",
      options: warehouses.map((w) => ({ label: w.name, value: w.id })),
      value: selectedWarehouse?.id,
      onChange: (id) =>
        setSelectedWarehouse(warehouses.find((w) => w.id === id)),
      searchable: true,
    },
    {
      label: "Tipo de salida",
      type: "select",
      options: [
        { label: "Ajuste de inventario", value: "adjustment" },
        { label: "Merma", value: "waste" },
        { label: "Uso interno", value: "internal_use" },
        { label: "Otro", value: "other" },
      ],
      value: outType,
      onChange: setOutType,
    },
    {
      label: "Fecha",
      type: "date",
      value: dateCreated,
      onChange: setDateCreated,
    },
  ],

  getProductColumns: (
    updateProductField,
    handleProductSelect,
    getAvailableProducts,
    isReadOnly
  ) => [
    {
      key: "name",
      label: "Producto",
      render: (_, row, index) => (
        <Select
          className="md:min-w-80"
          options={getAvailableProducts(index).map((p) => ({
            label: p.name,
            value: p,
          }))}
          value={row.product || null}
          onChange={(product) => handleProductSelect(product, index)}
          searchable
          disabled={isReadOnly}
        />
      ),
      footer: "Total",
    },
    {
      key: "quantity",
      label: "Cantidad",
      render: (_, row) => (
        <Input
          input={row.quantity}
          setInput={(value) => updateProductField(row.id, "quantity", value)}
          placeholder="Cantidad"
          className="md:max-w-28"
          disabled={isReadOnly}
        />
      ),
      footer: (data) =>
        format(data.reduce((acc, d) => acc + Number(d.quantity || 0), 0)),
    },
    {
      key: "unit",
      label: "Unidad",
      render: (_, row) => (
        <p className="flex justify-start">{row?.product?.unit || "-"}</p>
      ),
      footer: "-",
    },
  ],

  getActions: ({ handleConfirm, loadingConfirm, document }) => [
    {
      label: "Confirmar salida",
      variant: "emerald",
      loading: loadingConfirm,
      onClick: handleConfirm,
      disabled: document?.state === "completed",
    },
  ],
};

/**
 * ============================================================================
 * HELPERS PARA CREACIÓN DE DOCUMENTOS (DocumentForm)
 * ============================================================================
 */

/**
 * Generador de columnas comunes para productos en formularios de creación
 */
export function createProductColumns({
  formState,
  updateProductField,
  handleProductSelect,
  getAvailableProductsForRow,
  user,
  productsData = [],
  includePrice = true,
  includeIVA = false,
  includeInvoicePercentage = false,
  currency = "$",
}) {
  const columns = [
    {
      key: "name",
      label: "Producto",
      render: (name, row, index) => {
        const currentProduct = row.product;
        const availableProducts = getAvailableProductsForRow(
          index,
          productsData
        );
        const selectOptions = currentProduct
          ? [
              { label: currentProduct.name, value: currentProduct },
              ...availableProducts
                .filter((p) => p.id !== currentProduct.id)
                .map((p) => ({ label: p.name, value: p })),
            ]
          : availableProducts.map((p) => ({ label: p.name, value: p }));

        return (
          <>
            {/* Select para móvil */}
            <div className="md:hidden">
              <Select
                size="sm"
                options={selectOptions}
                value={currentProduct || null}
                onChange={(selectedProduct) =>
                  handleProductSelect(selectedProduct, index)
                }
                searchable
              />
            </div>

            {/* Select para desktop */}
            <div className="hidden md:block">
              <Select
                className="md:min-w-80"
                size="md"
                options={selectOptions}
                value={currentProduct || null}
                onChange={(selectedProduct) =>
                  handleProductSelect(selectedProduct, index)
                }
                searchable
              />
            </div>
          </>
        );
      },
      footer: "Total",
    },
  ];

  // Precio
  if (includePrice) {
    columns.push({
      key: "price",
      label: "Precio",
      render: (_, row) => (
        <Input
          input={row.price}
          setInput={(value) => updateProductField(row.id, "price", value)}
          placeholder="$"
          className="md:max-w-28"
        />
      ),
      footer: "-",
    });
  }

  // IVA Incluido
  if (includeIVA) {
    columns.push({
      key: "ivaIncluded",
      label: "IVA Incluido",
      render: (_, row) => (
        <Checkbox
          variant="cyan"
          checked={row.ivaIncluded}
          onCheck={(value) => updateProductField(row.id, "ivaIncluded", value)}
        />
      ),
      footer: <p>-</p>,
    });
  }

  // Cantidad
  columns.push({
    key: "quantity",
    label: "Cantidad requerida",
    render: (_, row) => (
      <Input
        input={row.quantity}
        setInput={(value) => updateProductField(row.id, "quantity", value)}
        placeholder="Cantidad"
        className="md:max-w-28"
      />
    ),
    footer: (data) =>
      unitsAreConsistent(
        data.filter((d) => d.product).map((p) => ({ unit: p?.product?.unit }))
      )
        ? format(data.reduce((acc, d) => acc + Number(d.quantity || 0), 0))
        : "-",
  });

  // Unidad
  columns.push({
    key: "id",
    label: "Unidad",
    render: (_, row) => (
      <p className="flex justify-start">{row?.product?.unit || "-"}</p>
    ),
    footer: "-",
  });

  // Total
  if (includePrice) {
    columns.push({
      key: "total",
      label: "Total",
      render: (_, row) => (
        <p className="flex justify-start md:min-w-28">
          {format(row?.total || "", "$") || "-"}
        </p>
      ),
      footer: (data) => (
        <h3 className="font-bold">
          {format(
            data.reduce((acc, d) => acc + Number(d.total || 0), 0) || "",
            currency
          ) || "-"}
        </h3>
      ),
    });
  }

  // Invoice Percentage (solo para admin)
  if (includeInvoicePercentage && user?.type === "admin") {
    columns.push({
      key: "invoicePercentage",
      label: "%",
      render: (_, row) => (
        <Input
          placeholder="%"
          className="max-w-11"
          input={row.invoicePercentage}
          setInput={(value) =>
            updateProductField(row.id, "invoicePercentage", value)
          }
        />
      ),
      footer: <p>-</p>,
    });
  }

  return columns;
}

/**
 * Configuración para crear SALE (Venta)
 */
export function createSaleFormConfig({
  customers,
  warehouses,
  productsData,
  onSubmit,
  loading,
}) {
  return {
    title: "Nueva orden de venta",
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
          options: customers.map((c) => ({ label: c.name, value: c })),
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
        },
        {
          key: "selectedCustomerForInvoice",
          label: "Cliente para factura",
          type: "select",
          searchable: true,
          options: (formState) =>
            (formState.parties || []).map((p) => ({
              label: p.name,
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

/**
 * Configuración para crear PURCHASE (Compra)
 */
export function createPurchaseFormConfig({
  suppliers,
  warehouses,
  productsData,
  onSubmit,
  loading,
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
      createProductColumns({
        ...context,
        productsData,
        includePrice: true,
        includeIVA: false,
        includeInvoicePercentage: false,
      }),

    validateForm: (formState) => {
      const hasSupplier = formState.selectedSupplier;
      const hasWarehouse = formState.selectedWarehouse;
      const hasProducts = formState.products.some((p) => p.product);
      const allProductsValid = formState.products
        .filter((p) => p.product)
        .every((p) => p.quantity && Number(p.quantity) > 0);

      return hasSupplier && hasWarehouse && hasProducts && allProductsValid;
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

/**
 * Configuración para crear INFLOW (Entrada)
 */
export function createInflowFormConfig({
  warehouses,
  productsData,
  onSubmit,
  loading,
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
      type: ORDER_TYPES.IN,
      products: formState.products
        .filter((p) => p.product)
        .map((p) => ({
          requestedQuantity: Number(p.quantity),
          product: p.product.id,
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

/**
 * Configuración para crear OUTFLOW (Salida)
 */
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
          label: "Bodega de origen",
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

/**
 * Configuración para crear RETURN (Devolución)
 */
export function createReturnFormConfig({
  orders,
  warehouses,
  onSubmit,
  loading,
  onOrderSelect,
}) {
  return {
    title: "Nueva devolución",
    type: ORDER_TYPES.RETURN,
    loading,
    onSubmit,
    mode: "return", // Modo especial para returns

    headerFields: [
      [
        {
          key: "selectedOrder",
          label: "Orden de venta",
          type: "select",
          searchable: true,
          options: orders.map((o) => ({
            label: `${o.code} - ${o.customer?.name || "Sin cliente"}`,
            value: o,
          })),
          onChange: (order, formState, updateField) => {
            if (onOrderSelect) {
              onOrderSelect(order);
            }
            // Auto-seleccionar bodega de origen de la venta
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
            .filter((w) => w.type === "stock" || w.type === "printlab")
            .map((w) => ({ label: w.name, value: w })),
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
          searchable: false,
          options: [
            { label: "Producto defectuoso", value: "defective" },
            { label: "Producto equivocado", value: "wrong_product" },
            { label: "Cliente insatisfecho", value: "unsatisfied" },
            { label: "Otro", value: "other" },
          ],
        },
      ],
    ],

    // En modo return, no usamos productColumns tradicional
    productColumns: () => [],

    validateForm: (formState) => {
      const hasOrder = formState.selectedOrder;
      const hasWarehouse = formState.selectedWarehouse;
      const hasSelectedItems =
        formState.selectedItems && formState.selectedItems.length > 0;
      const allItemsValid = formState.selectedItems?.every(
        (item) => item.returnQuantity > 0
      );

      return hasOrder && hasWarehouse && hasSelectedItems && allItemsValid;
    },

    prepareSubmitData: (formState, user) => {
      // Agrupar items por producto para enviar al backend
      const productsMap = new Map();

      formState.selectedItems?.forEach((selectedItem) => {
        const productId = selectedItem.productId;

        if (!productsMap.has(productId)) {
          productsMap.set(productId, {
            product: productId,
            items: [],
          });
        }

        productsMap.get(productId).items.push({
          parentItem: selectedItem.itemId, // Referencia al item original
          quantity: selectedItem.returnQuantity,
          lotNumber: selectedItem.lotNumber || selectedItem.lot,
          itemNumber: selectedItem.itemNumber || selectedItem.barcode,
          warehouse: formState.selectedWarehouse.id,
        });
      });

      return {
        type: ORDER_TYPES.RETURN,
        products: Array.from(productsMap.values()),
        destinationWarehouse: formState.selectedWarehouse.id,
        sourceOrder: formState.selectedOrder.id, // Referencia a la orden original
        returnReason: formState.returnReason,
        createdDate: formState.dateCreated,
        generatedBy: user.id,
      };
    },

    initialState: {
      selectedOrder: null,
      selectedWarehouse: null,
      selectedItems: [], // Array de items seleccionados para devolver
      returnReason: null,
    },
  };
}

/**
 * Configuración para crear TRANSFORM (Transformación)
 */
export function createTransformFormConfig({
  warehouses,
  productsData,
  onSubmit,
  loading,
}) {
  return {
    title: "Nueva orden de transformación",
    type: ORDER_TYPES.TRANSFORM,
    loading,
    onSubmit,
    mode: "transform", // Modo especial para transformaciones

    headerFields: [
      [
        {
          key: "selectedWarehouse",
          label: "Bodega",
          type: "select",
          searchable: true,
          options: warehouses
            .filter((w) => w.type === "stock" || w.type === "printlab")
            .map((w) => ({ label: w.name, value: w })),
        },
        {
          key: "transformationType",
          label: "Tipo de transformación",
          type: "select",
          searchable: false,
          options: [
            {
              label: "Transformación (producto diferente)",
              value: "transformation",
            },
            { label: "Partición/Corte (mismo producto)", value: "partition" },
          ],
        },
      ],
      [
        {
          key: "dateCreated",
          label: "Fecha de Creación",
          type: "date",
        },
      ],
    ],

    // En modo transform, no usamos productColumns tradicional
    productColumns: () => [],

    validateForm: (formState) => {
      const hasWarehouse = formState.selectedWarehouse;
      const hasTransforms =
        formState.selectedTransforms && formState.selectedTransforms.length > 0;

      // Validar que todas las transformaciones tengan los datos completos
      const allTransformsValid = formState.selectedTransforms?.every(
        (transform) =>
          transform.targetProductId &&
          transform.sourceQuantityConsumed > 0 &&
          transform.targetQuantity > 0
      );

      return hasWarehouse && hasTransforms && allTransformsValid;
    },

    prepareSubmitData: (formState, user) => {
      // Agrupar transformaciones por producto destino
      const productsMap = new Map();

      formState.selectedTransforms?.forEach((transform) => {
        const productId = transform.targetProductId;

        if (!productsMap.has(productId)) {
          productsMap.set(productId, {
            product: productId,
            requestedQuantity: 0,
            items: [],
          });
        }

        const productGroup = productsMap.get(productId);
        productGroup.requestedQuantity += Number(transform.targetQuantity);
        productGroup.items.push({
          sourceItemId: transform.sourceItemId,
          sourceQuantityConsumed: Number(transform.sourceQuantityConsumed),
          targetQuantity: Number(transform.targetQuantity),
          warehouse: formState.selectedWarehouse.id,
          lotNumber: transform.lotNumber || undefined,
          itemNumber: transform.itemNumber || undefined,
        });
      });

      return {
        type: ORDER_TYPES.TRANSFORM,
        products: Array.from(productsMap.values()),
        destinationWarehouse: formState.selectedWarehouse.id,
        createdDate: formState.dateCreated,
        generatedBy: user.id,
      };
    },

    initialState: {
      selectedWarehouse: null,
      transformationType: "transformation",
      selectedTransforms: [], // Array de transformaciones
    },
  };
}

/**
 * ============================================================================
 * CONFIGURACIÓN PARA TRANSFORMACIONES (Detalle)
 * ============================================================================
 */
export const transformDocumentConfig = {
  documentType: "transform",
  redirectPath: "/transformations",

  getHeaderFields: ({
    warehouses,
    selectedWarehouse,
    setSelectedWarehouse,
    dateCreated,
    transformationType,
    setTransformationType,
  }) => [
    {
      label: "Bodega",
      type: "select",
      options: warehouses.map((w) => ({ label: w.name, value: w.id })),
      value: selectedWarehouse?.id,
      onChange: (id) =>
        setSelectedWarehouse(warehouses.find((w) => w.id === id)),
      searchable: true,
    },
    {
      label: "Tipo de transformación",
      type: "select",
      options: [
        {
          label: "Transformación (producto diferente)",
          value: "transformation",
        },
        { label: "Partición/Corte (mismo producto)", value: "partition" },
      ],
      value: transformationType,
      onChange: setTransformationType,
    },
    {
      label: "Fecha",
      type: "date",
      value: dateCreated,
      disabled: true,
    },
  ],

  getProductColumns: (
    updateProductField,
    handleProductSelect,
    getAvailableProducts,
    isReadOnly
  ) => [
    {
      key: "name",
      label: "Producto destino",
      render: (_, row, index) => (
        <Select
          className="md:min-w-80"
          options={getAvailableProducts(index).map((p) => ({
            label: p.name,
            value: p,
          }))}
          value={row.product || null}
          onChange={(product) => handleProductSelect(product, index)}
          searchable
          disabled={isReadOnly}
        />
      ),
      footer: "Total",
    },
    {
      key: "requestedQuantity",
      label: "Cantidad destino",
      render: (_, row) => (
        <Input
          input={row.requestedQuantity}
          setInput={(value) =>
            updateProductField(row.id, "requestedQuantity", value)
          }
          placeholder="Cantidad"
          className="md:max-w-28"
          disabled={isReadOnly}
        />
      ),
      footer: (data) =>
        format(
          data.reduce((acc, d) => acc + Number(d.requestedQuantity || 0), 0)
        ),
    },
    {
      key: "items",
      label: "Cantidad transformada",
      render: (_, row) => (
        <p>
          {format(
            row.items?.reduce(
              (acc, item) => acc + Number(item?.quantity || 0),
              0
            ) || 0
          ) || "-"}
        </p>
      ),
      footer: (data) => {
        const total =
          data
            .flatMap((p) => p.items)
            .reduce((acc, item) => acc + Number(item?.quantity || 0), 0) || 0;
        return format(total) || "-";
      },
    },
    {
      key: "itemsCount",
      label: "Items transformados",
      render: (_, row) =>
        format(row.items?.filter((i) => i.quantity > 0).length || 0) || "-",
      footer: (data) => {
        const total = data.reduce(
          (acc, p) =>
            acc + (p.items?.filter((i) => i.quantity > 0).length || 0),
          0
        );
        return format(total) || "-";
      },
    },
    {
      key: "unit",
      label: "Unidad",
      render: (_, row) => (
        <p className="flex justify-start">{row?.product?.unit || "-"}</p>
      ),
      footer: "-",
    },
  ],

  getActions: ({ handleProcess, loadingProcess, document }) => [
    {
      label: "Procesar transformación",
      variant: "emerald",
      loading: loadingProcess,
      onClick: handleProcess,
      disabled: document?.state === "completed",
    },
  ],
};

/**
 * ============================================================================
 * CONFIGURACIÓN PARA FACTURACIÓN PARCIAL
 * ============================================================================
 */
export const partialInvoiceDocumentConfig = {
  documentType: "partial-invoice",
  redirectPath: "/partial-invoices",

  // Fields que encabezan la página
  getHeaderFields: ({ order, parentOrder }) => [
    {
      label: "Orden de venta (remisión)",
      type: "input",
      value: parentOrder?.code || "-",
      disabled: true,
      render: (field) => (
        <div className="px-3 py-2 bg-zinc-700 rounded-md border border-zinc-600">
          <p className="text-white">{field.value}</p>
        </div>
      ),
    },
    {
      label: "Cliente",
      type: "input",
      value: parentOrder?.customer?.name || order?.customer?.name || "-",
      disabled: true,
      render: (field) => (
        <div className="px-3 py-2 bg-zinc-700 rounded-md border border-zinc-600">
          <p className="text-white">{field.value}</p>
        </div>
      ),
    },
    {
      label: "Fecha de creación",
      type: "input",
      value: order?.createdAt
        ? new Date(order.createdAt).toLocaleDateString()
        : "-",
      disabled: true,
      render: (field) => (
        <div className="px-3 py-2 bg-zinc-700 rounded-md border border-zinc-600">
          <p className="text-white">{field.value}</p>
        </div>
      ),
    },
    {
      label: "Estado de facturación",
      type: "input",
      value: order?.siigoId
        ? `Facturado - ${order.invoiceNumber || order.siigoId}`
        : "Pendiente",
      disabled: true,
      render: (field) => (
        <div className="px-3 py-2 bg-zinc-700 rounded-md border border-zinc-600">
          <p
            className={`font-bold ${
              order?.siigoId ? "text-emerald-400" : "text-yellow-400"
            }`}
          >
            {field.value}
          </p>
        </div>
      ),
    },
  ],

  // Columnas del resumen de productos
  getProductColumns: (
    updateProductField,
    handleProductSelect,
    getAvailableProducts,
    isReadOnly
  ) => [
    {
      key: "name",
      label: "Producto",
      render: (_, row) => <p>{row?.product?.name || row?.name || "-"}</p>,
      footer: "Total",
    },
    {
      key: "items",
      label: "Cantidad a facturar",
      render: (_, row) => (
        <p>
          {format(
            row.items?.reduce(
              (acc, item) => acc + Number(item?.quantity || 0),
              0
            ) || 0
          ) || "-"}
        </p>
      ),
      footer: (data) => {
        const total =
          data
            .flatMap((p) => p.items)
            .reduce((acc, item) => acc + Number(item?.quantity || 0), 0) || 0;
        return format(total) || "-";
      },
    },
    {
      key: "itemsCount",
      label: "Items a facturar",
      render: (_, row) =>
        format(row.items?.filter((i) => i.quantity > 0).length || 0) || "-",
      footer: (data) => {
        const total = data.reduce(
          (acc, p) =>
            acc + (p.items?.filter((i) => i.quantity > 0).length || 0),
          0
        );
        return format(total) || "-";
      },
    },
    {
      key: "unit",
      label: "Unidad",
      render: (_, row) => (
        <p className="flex justify-start">{row?.product?.unit || "-"}</p>
      ),
      footer: "-",
    },
  ],

  // Acciones que se pueden realizar
  getActions: ({ handleComplete, loadingComplete, document }) => [
    {
      label:
        document?.state === "completed"
          ? "Factura completada"
          : "Completar y facturar",
      variant: "emerald",
      loading: loadingComplete,
      onClick: handleComplete,
      disabled: document?.state === "completed",
    },
    {
      label: "Ver orden de venta original",
      variant: "cyan",
      onClick: () => {
        if (document?.parentOrder?.id) {
          window.location.href = `/sales/${document.parentOrder.id}`;
        }
      },
      disabled: !document?.parentOrder?.id,
    },
  ],
};
