"use client";
import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";
import Textarea from "@/components/ui/Textarea";
import Badge from "@/components/ui/Bagde";
import { useDocumentDetail } from "@/lib/hooks/useDocumentDetail";
import { PackingListProduct } from "./PackingListProduct";
import { useMemo } from "react";
import format from "@/lib/utils/format";

/**
 * Componente base reutilizable para páginas de detalle de documentos
 */
export default function DocumentDetailBase({
  // Datos del documento
  document,
  // Hooks de datos
  updateDocument,
  deleteDocument,
  addItem,
  removeItem,
  availableProducts,
  // Configuración
  documentType, // 'sale', 'purchase', 'return', 'in', 'out'
  title,
  redirectPath,
  // Campos personalizados
  headerFields = [], // Array de campos para el header
  productColumns, // Función que retorna columnas de la tabla de productos
  actions = [], // Acciones adicionales
  // Slots personalizados
  beforeProducts,
  afterProducts,
  beforeActions,
  customSections = [],
  // Callbacks
  onUpdate,
  // Estado
  isReadOnly = false,
  allowManualEntry = true,
  user = null,
  // Factura
  showInvoice = false,
  invoiceTitle = "Factura",
  taxes = [],
}) {
  const {
    products,
    expandedRows,
    loading,
    notes,
    setNotes,
    updateProductField,
    updateItemField,
    handleProductSelect,
    handleDeleteProductRow,
    handleAddItemRow,
    handleDeleteItemRow,
    handleUpdateDocument,
    handleDeleteDocument,
    toggleExpanded,
    getAvailableProductsForRow,
  } = useDocumentDetail({
    document,
    updateDocument,
    deleteDocument,
    addItem,
    removeItem,
    availableProducts,
    documentType,
    onSuccess: onUpdate,
    redirectPath,
  });

  // Renderizar campos del header dinámicamente
  const renderHeaderFields = useMemo(() => {
    return headerFields.map((field, index) => (
      <div key={index} className="flex flex-col gap-1 mt-3 md:mt-0 md:flex-1">
        <h2 className="font-medium">{field.label}</h2>
        {field.type === "select" && (
          <Select
            disabled={isReadOnly || field.disabled}
            options={field.options}
            value={field.value}
            onChange={field.onChange}
            searchable={field.searchable}
            size="md"
          />
        )}
        {field.type === "date" && (
          <DatePicker
            mode="single"
            value={field.value}
            onChange={field.onChange}
            isDisabled={isReadOnly || field.disabled}
          />
        )}
        {field.type === "input" && field.render?.(field)}
      </div>
    ));
  }, [headerFields, isReadOnly]);

  // Generar datos de la factura
  const invoiceData = useMemo(() => {
    if (!showInvoice) return [];

    const subtotalTaxes = taxes.filter(
      (tax) => tax.applicationType === "subtotal"
    );

    let subtotalForTaxes = 0;
    let subtotalWithNoTaxes = 0;

    products
      .filter((product) => product.product && product.quantity !== "")
      .forEach((product) => {
        const invoicePercentage =
          Number(product.invoicePercentage || 100) / 100;
        const price = product.ivaIncluded
          ? product.price / 1.19
          : product.price;
        const quantity =
          product.items?.reduce((acc, item) => acc + item.quantity, 0) ||
          product.quantity ||
          0;

        const quantityForTaxes =
          Math.round(quantity * invoicePercentage * 100) / 100;
        const quantityWithNoTaxes =
          Math.round((quantity - quantityForTaxes) * 100) / 100;

        subtotalForTaxes += price * quantityForTaxes;
        subtotalWithNoTaxes += price * quantityWithNoTaxes;
      });

    const subtotal = subtotalForTaxes + subtotalWithNoTaxes;

    // Ordenar impuestos
    const ordenPrioridad = ["IVA - 19%", "Retefuente -2,5%", "ICA - 0,77%"];
    const taxesValues = subtotalTaxes
      .map((tax) => ({
        id: tax.id,
        name: tax.name,
        use: tax.use,
        amount:
          subtotalForTaxes >= (tax.treshold || 0)
            ? subtotalForTaxes * tax.amount
            : 0,
      }))
      .sort((a, b) => {
        const indexA = ordenPrioridad.indexOf(a.name);
        const indexB = ordenPrioridad.indexOf(b.name);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return 0;
      });

    const taxAmount = taxesValues.reduce(
      (acc, tax) =>
        tax.use === "increment" ? acc + tax.amount : acc - tax.amount,
      0
    );

    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    return [
      {
        id: "subtotal",
        name: "Subtotal",
        amount: Math.round(subtotal * 100) / 100,
      },
      ...taxesValues.map((tax) => ({
        ...tax,
        amount: Math.round(tax.amount * 100) / 100,
      })),
      {
        id: "total",
        name: "Total",
        amount: total,
      },
    ];
  }, [showInvoice, products, taxes]);

  // Columnas para la tabla de factura
  const invoiceColumns = useMemo(
    () => [
      {
        label: "Producto",
        key: "name",
        render: (_, row) => <p>{row?.product?.name}</p>,
        footer: "Total",
      },
      {
        label: "Precio",
        key: "price",
        render: (_, row) => {
          const price = row.ivaIncluded
            ? Math.round((row.price / 1.19) * 100) / 100
            : row.price;
          return <p>{format(price, "$")}</p>;
        },
        footer: "-",
      },
      {
        label: "Cantidad",
        key: "quantity",
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
        footer: (data) => (
          <p>
            {data.reduce((a, p) => a + (p.quantity || 0), 0).toLocaleString()}
          </p>
        ),
      },
      {
        key: "id",
        label: "Valor bruto",
        render: (_, row) => {
          const price = row.ivaIncluded ? row.price / 1.19 : row.price;
          const quantity =
            row.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
          const total = Math.round(price * quantity * 100) / 100;
          return format(total, "$");
        },
        footer: (data) => {
          const total = data.reduce((acc, product) => {
            const price = product.ivaIncluded
              ? product.price / 1.19
              : product.price;
            const quantity =
              product.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
            const totalValue = Math.round(price * quantity * 100) / 100;
            return acc + totalValue;
          }, 0);
          return format(total, "$");
        },
      },
    ],
    []
  );

  // Columnas para el resumen de factura
  const invoiceResumeColumns = useMemo(
    () => [
      {
        key: "name",
        render: (_, row) => (
          <p
            className={`${
              row.name === "Total" || row.name === "Subtotal"
                ? "font-bold"
                : "font-normal"
            }`}
          >
            {row.name}
          </p>
        ),
      },
      {
        key: "amount",
        render: (_, row) => (
          <p
            className={`${
              row.name === "Total" || row.name === "Subtotal"
                ? "font-bold"
                : "font-normal"
            }`}
          >
            {format(row.amount, "$")}
          </p>
        ),
      },
    ],
    []
  );

  // Columnas de productos con lógica inyectada
  const enhancedProductColumns = useMemo(() => {
    return productColumns(
      updateProductField,
      handleProductSelect,
      getAvailableProductsForRow,
      isReadOnly,
      user
    );
  }, [
    productColumns,
    updateProductField,
    handleProductSelect,
    getAvailableProductsForRow,
    isReadOnly,
    user,
  ]);

  const canAddItems = !(documentType === "purchase" || documentType === "in");

  return (
    <div className="">
      {/* Header */}
      <div className="flex flex-row gap-4 items-center">
        <h1 className="font-bold text-3xl py-4">{title || document?.code}</h1>
        {document?.state && (
          <Badge variant={getStateVariant(document.state)}>
            {getStateLabel(document.state)}
          </Badge>
        )}
      </div>

      {/* Campos del header */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
        {renderHeaderFields}
      </div>

      {/* Slot: Antes de productos */}
      {beforeProducts}

      {/* Tabla de productos */}
      <div className="py-4 w-full">
        <h3 className="text-xl pb-2">Productos</h3>
        <Table
          columns={enhancedProductColumns}
          data={products}
          mobileBlock
          getRowId={(row) => row.id}
          canDeleteRow={() => !isReadOnly}
          onRowDelete={(id, index) => handleDeleteProductRow(index)}
        />
      </div>

      {/* Slot: Después de productos */}
      {afterProducts}

      {/* Lista de empaque */}
      <h3 className="text-xl py-4">Lista de empaque por producto</h3>
      <div className="p-4 bg-zinc-600 rounded-md flex flex-col gap-3">
        {products
          .filter((product) => product.product)
          .map((product, productIndex) => (
            <PackingListProduct
              key={product.id}
              product={product}
              productIndex={productIndex}
              isExpanded={expandedRows.has(product.id)}
              onToggle={() => toggleExpanded(product.id)}
              updateItemField={updateItemField}
              handleDeleteItemRow={handleDeleteItemRow}
              disabled={isReadOnly}
              onEnter={(input, setInput) =>
                handleAddItemRow(product.product.id, input, setInput)
              }
              canAddItems={canAddItems}
              allowManualEntry={allowManualEntry}
            />
          ))}
      </div>

      {/* Factura */}
      {showInvoice && (
        <>
          <h3 className="text-xl py-4">{invoiceTitle}</h3>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-8">
              <Table
                columns={invoiceColumns}
                data={products.filter((p) => p.product)}
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <Table
                columns={invoiceResumeColumns}
                data={invoiceData}
                hiddenHeader
              />
            </div>
          </div>
        </>
      )}

      {/* Secciones personalizadas */}
      {customSections.map((section, index) => (
        <div key={index} className="py-4">
          <h3 className="text-xl pb-2">{section.title}</h3>
          {section.render()}
        </div>
      ))}

      {/* Comentarios */}
      <h3 className="text-xl py-4">Comentarios</h3>
      <div>
        <Textarea
          placeholder="Agrega comentarios al documento"
          setValue={setNotes}
          value={notes}
          disabled={isReadOnly}
        />
      </div>

      {/* Slot: Antes de acciones */}
      {beforeActions}

      {/* Acciones */}
      <h3 className="text-xl py-4">Acciones del documento</h3>
      <div className="flex flex-col w-full md:flex-row md:w-auto gap-4">
        <Button
          loading={loading}
          onClick={() => handleUpdateDocument()}
          disabled={isReadOnly}
        >
          Actualizar
        </Button>

        <Button
          variant="red"
          onClick={handleDeleteDocument}
          disabled={isReadOnly}
        >
          Eliminar
        </Button>

        {/* Acciones personalizadas */}
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant}
            loading={action.loading}
            onClick={action.onClick}
            disabled={action.disabled || isReadOnly}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// Utilidades
function getStateVariant(state) {
  const variants = {
    draft: "zinc",
    confirmed: "cyan",
    completed: "emerald",
    canceled: "red",
  };
  return variants[state] || "gray";
}

function getStateLabel(state) {
  const labels = {
    draft: "Borrador",
    confirmed: "Confirmado",
    transit: "En tránsito",
    completed: "Completado",
    canceled: "Cancelado",
  };
  return labels[state] || state;
}
