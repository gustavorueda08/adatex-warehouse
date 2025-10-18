"use client";
import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";
import Textarea from "@/components/ui/Textarea";
import Badge from "@/components/ui/Bagde";
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import {
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  ChatBubbleLeftIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
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
  prepareUpdateData, // Función opcional que retorna datos adicionales para la actualización
  // Estado
  isReadOnly = false,
  allowManualEntry = true,
  showMainInput = true,
  user = null,
  // Factura
  showInvoice = false,
  invoiceTitle = "Factura",
  taxes = [],
}) {
  const {
    products,
    setProducts,
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
    prepareUpdateData,
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

  // Calcular estadísticas globales de la lista de empaque
  const packingListStats = useMemo(() => {
    const productsWithItems = products.filter((p) => p.product);
    const totalItems = productsWithItems.reduce(
      (acc, p) => acc + (p.items?.length || 0),
      0
    );
    const totalQuantity = productsWithItems.reduce(
      (acc, p) =>
        acc +
        (p.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) ||
          0),
      0
    );
    const totalRequested = productsWithItems.reduce(
      (acc, p) => acc + Number(p.requestedQuantity || 0),
      0
    );
    const itemsWithQuantity = productsWithItems.reduce(
      (acc, p) =>
        acc + (p.items?.filter((item) => item.quantity > 0).length || 0),
      0
    );

    return {
      productsCount: productsWithItems.length,
      totalItems,
      itemsWithQuantity,
      totalQuantity,
      totalRequested,
      percentComplete:
        totalRequested > 0
          ? Math.round((totalQuantity / totalRequested) * 100)
          : 0,
    };
  }, [products]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          {/* Título y Badge de estado */}
          <div className="flex flex-row gap-4 items-center mb-6">
            <h1 className="font-bold text-3xl">{title || document?.code}</h1>
            {document?.state && (
              <Badge variant={getStateVariant(document.state)}>
                {getStateLabel(document.state)}
              </Badge>
            )}
          </div>

          {/* Campos del header */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderHeaderFields}
          </div>
        </CardContent>
      </Card>

      {/* Slot: Antes de productos */}
      {beforeProducts}

      {/* Productos Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DocumentTextIcon className="w-6 h-6 text-cyan-400" />
              <div>
                <CardTitle>Productos</CardTitle>
                <CardDescription>
                  Gestiona los productos de este documento
                </CardDescription>
              </div>
            </div>
            <Badge variant="cyan">
              {products.filter((p) => p.product).length} productos
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table
            columns={enhancedProductColumns}
            data={products}
            mobileBlock
            getRowId={(row) => row.id}
            canDeleteRow={() => !isReadOnly}
            onRowDelete={(id, index) => handleDeleteProductRow(index)}
          />
        </CardContent>
      </Card>

      {/* Slot: Después de productos */}
      {afterProducts}

      {/* Lista de empaque Card */}
      {products.filter((p) => p.product).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <ClipboardDocumentListIcon className="w-6 h-6 text-emerald-400" />
              <div className="flex-1">
                <CardTitle>Lista de Empaque</CardTitle>
                <CardDescription>Detalle de items por producto</CardDescription>
              </div>
            </div>

            {/* Estadísticas globales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700">
                <p className="text-xs text-gray-400">Productos</p>
                <p className="text-lg font-semibold text-white">
                  {packingListStats.productsCount}
                </p>
              </div>
              <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700">
                <p className="text-xs text-gray-400">Items totales</p>
                <p className="text-lg font-semibold text-white">
                  {packingListStats.totalItems}
                </p>
              </div>
              <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700">
                <p className="text-xs text-gray-400">Cantidad procesada</p>
                <p className="text-lg font-semibold text-emerald-400">
                  {format(packingListStats.totalQuantity)}
                </p>
              </div>
              <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700">
                <p className="text-xs text-gray-400">Cantidad solicitada</p>
                <p className="text-lg font-semibold text-cyan-400">
                  {format(packingListStats.totalRequested)}
                </p>
              </div>
            </div>

            {/* Progress bar global */}
            {packingListStats.totalRequested > 0 && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Progreso global</span>
                  <span className="text-sm font-semibold text-white">
                    {packingListStats.percentComplete}%
                  </span>
                </div>
                <div className="w-full bg-neutral-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      packingListStats.percentComplete >= 100
                        ? "bg-emerald-500"
                        : packingListStats.percentComplete > 0
                        ? "bg-yellow-500"
                        : "bg-zinc-600"
                    }`}
                    style={{
                      width: `${Math.min(
                        packingListStats.percentComplete,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
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
                    showMainInput={showMainInput}
                    canAddItems={canAddItems}
                    allowManualEntry={allowManualEntry}
                    state={document.state}
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Factura Card */}
      {showInvoice && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <BanknotesIcon className="w-6 h-6 text-yellow-400" />
              <div>
                <CardTitle>{invoiceTitle}</CardTitle>
                <CardDescription>
                  Resumen financiero del documento
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {/* Secciones personalizadas - cada una en su Card */}
      {customSections.map((section, index) => (
        <div key={index}>{section.render({ setProducts, products })}</div>
      ))}

      {/* Comentarios Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ChatBubbleLeftIcon className="w-6 h-6 text-purple-400" />
            <div>
              <CardTitle>Comentarios</CardTitle>
              <CardDescription>
                Agrega notas o información adicional sobre este documento
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Escribe tus comentarios aquí..."
            setValue={setNotes}
            value={notes}
            disabled={isReadOnly}
          />
        </CardContent>
      </Card>

      {/* Slot: Antes de acciones */}
      {beforeActions}

      {/* Acciones Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BoltIcon className="w-6 h-6 text-orange-400" />
            <div>
              <CardTitle>Acciones del documento</CardTitle>
              <CardDescription>
                Gestiona y completa las acciones disponibles
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardFooter className="flex flex-col md:flex-row gap-3">
          {/* Acción principal: Actualizar */}
          <Button
            loading={loading}
            onClick={() => handleUpdateDocument()}
            disabled={isReadOnly}
            className="flex-1 md:flex-initial"
          >
            Actualizar
          </Button>

          {/* Acciones personalizadas */}
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant}
              loading={action.loading}
              onClick={() =>
                action.onClick({
                  products,
                  setProducts,
                  handleAddItemRow,
                  handleDeleteItemRow,
                  handleDeleteDocument,
                  handleUpdateDocument,
                })
              }
              disabled={action.disabled || isReadOnly}
              className="flex-1 md:flex-initial"
            >
              {action.label}
            </Button>
          ))}

          {/* Acción destructiva: Eliminar (al final) */}
          <Button
            variant="red"
            onClick={handleDeleteDocument}
            disabled={isReadOnly}
            className="flex-1 md:flex-initial md:ml-auto"
          >
            Eliminar
          </Button>
        </CardFooter>
      </Card>
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
