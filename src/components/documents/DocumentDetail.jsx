"use client";
import { useState, useCallback, useMemo } from "react";
import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import Table from "@/components/ui/Table";
import Textarea from "@/components/ui/Textarea";
import Badge from "@/components/ui/Badge";
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
import format from "@/lib/utils/format";
import unitsAreConsistent from "@/lib/utils/unitsConsistency";
import toast from "react-hot-toast";
import moment from "moment-timezone";

/**
 * DocumentDetailBase V2 - Versión simplificada con config-based API
 * Similar a EntityForm: solo necesita config e initialData
 *
 * @param {Object} config - Configuración del documento
 * @param {Object} initialData - Datos iniciales del documento
 */
export default function DocumentDetail({ config, initialData }) {
  // Get fetched data from config (data is now provided by parent component)
  const fetchedData = config.data || {};

  // Estado interno del formulario
  const [documentState, setDocumentState] = useState(() =>
    config.getInitialState ? config.getInitialState(initialData) : {}
  );

  // Helper para actualizar estado
  const updateState = useCallback((updates) => {
    setDocumentState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Handler de cambio de campo con soporte para state handlers
  const handleFieldChange = useCallback(
    (field, value) => {
      if (
        field.onChange &&
        config.stateHandlers &&
        config.stateHandlers[field.onChange]
      ) {
        // Ejecutar el state handler personalizado
        config.stateHandlers[field.onChange](value, documentState, updateState);
      } else {
        // Actualización simple del campo
        updateState({ [field.key]: value });
      }
    },
    [documentState, updateState, config.stateHandlers]
  );

  // Preparar datos para actualización
  const prepareUpdateData = useCallback(
    (document, products, stateOverride = null) => {
      if (config.prepareUpdateData) {
        return config.prepareUpdateData(
          document,
          products,
          stateOverride || documentState
        );
      }
      return {};
    },
    [config, documentState]
  );

  const allowAddItems = config.allowAddItems;
  const showMainItemInput = config.showItemInput;
  const allowManualEntry = config.allowManualEntry;

  // Usar el hook existente para manejo de productos/items
  const {
    products,
    setProducts,
    expandedRows,
    loading,
    notes,
    setNotes,
    updateProductField,
    updateItemField,
    handleProductSelect: baseHandleProductSelect,
    handleDeleteProductRow,
    handleAddItemRow,
    handleDeleteItemRow,
    handleUpdateDocument,
    handleDeleteDocument,
    toggleExpanded,
    getAvailableProductsForRow,
  } = useDocumentDetail({
    document: initialData,
    updateDocument:
      config.updateDocument || (() => Promise.resolve({ success: false })),
    deleteDocument:
      config.deleteDocument || (() => Promise.resolve({ success: false })),
    addItem: config.addItem,
    removeItem: config.removeItem,
    availableProducts: fetchedData.products || [],
    documentType: config.type,
    onSuccess: config.onUpdate,
    redirectPath: config.redirectPath,
    prepareUpdateData,
    allowAutoCreateItems: allowAddItems,
  });

  const resolveProductValue = useCallback(
    (product, index) => {
      if (product && typeof product === "object") return product;
      const available = getAvailableProductsForRow(index) || [];
      return available.find((p) => p.id == product) || product;
    },
    [getAvailableProductsForRow]
  );

  // Handler personalizado para selección de producto (con auto-fill desde config)
  const handleProductSelect = useCallback(
    (product, index) => {
      const normalizedProduct = resolveProductValue(product, index);
      baseHandleProductSelect(normalizedProduct, index);

      // Si hay lógica de onChange en la columna de producto
      const productColumn = config.productColumns?.find(
        (col) => col.key === "name" || col.key === "product"
      );
      if (productColumn && productColumn.onChange) {
        const currentRow = products[index];
        const updatedRow = productColumn.onChange(
          normalizedProduct,
          currentRow,
          documentState
        );

        // Aplicar los cambios al row
        if (updatedRow && updatedRow !== currentRow) {
          Object.entries(updatedRow).forEach(([key, value]) => {
            if (key !== "product" && value !== currentRow[key]) {
              updateProductField(currentRow.id, key, value);
            }
          });
        }
      }
    },
    [
      baseHandleProductSelect,
      config.productColumns,
      documentState,
      products,
      resolveProductValue,
      updateProductField,
    ]
  );

  // Determinar si es read-only
  const isReadOnly =
    initialData?.state === "completed" || initialData?.state === "canceled";

  // Calcular título
  const title = useMemo(() => {
    if (typeof config.title === "function") {
      return config.title(initialData, documentState);
    }
    return config.title || "";
  }, [config.title, initialData, documentState]);

  // Renderizar campos del header
  const renderHeaderFields = useMemo(() => {
    if (!config.headerFields) return null;

    return config.headerFields.map((field, index) => {
      // Calcular opciones (pueden ser función que depende del estado)
      const options =
        typeof field.options === "function"
          ? field.options(documentState, fetchedData)
          : field.options;

      let value = documentState[field.key];
      if (field.type === "select") {
        value = typeof value === "object" && value !== null ? value.id : value;
      }

      return (
        <div
          key={field.key || index}
          className="flex flex-col gap-1 mt-3 md:mt-0 md:flex-1"
        >
          <h2 className="font-medium">{field.label}</h2>

          {field.type === "select" && (
            <Select
              disabled={isReadOnly || field.disabled}
              options={options || []}
              value={value}
              onChange={(val) => handleFieldChange(field, val)}
              searchable={field.searchable}
              size="md"
            />
          )}

          {field.type === "date" && (
            <DatePicker
              mode="single"
              value={value}
              onChange={(val) => handleFieldChange(field, val)}
              isDisabled={isReadOnly || field.disabled}
            />
          )}

          {field.type === "input" &&
            field.render &&
            field.render(field, documentState)}
        </div>
      );
    });
  }, [
    config.headerFields,
    documentState,
    fetchedData,
    handleFieldChange,
    isReadOnly,
  ]);

  // Generar columnas de productos
  const productColumns = useMemo(() => {
    if (!config.productColumns) return [];

    return config.productColumns.map((column) => {
      if (column.type === "select") {
        return {
          ...column,
          render: (_, row, index) => {
            const options =
              typeof column.options === "function"
                ? column.options(
                    documentState,
                    fetchedData,
                    row,
                    index,
                    getAvailableProductsForRow(index)
                  )
                : column.options;

            const useIdValue = column.useProductIdAsValue === true;
            const value =
              column.useProductIdAsValue !== false &&
              typeof row[column.key] === "object"
                ? row[column.key]?.id
                : row[column.key] || null;

            return (
              <Select
                className="md:min-w-80"
                options={options || []}
                value={value}
                onChange={(value) => {
                  if (column.key === "name" || column.key === "product") {
                    handleProductSelect(value, index);
                  } else {
                    updateProductField(row.id, column.key, value);
                  }
                }}
                searchable={column.searchable}
                disabled={isReadOnly}
              />
            );
          },
        };
      }

      if (column.type === "input") {
        return {
          ...column,
          render: (_, row) => (
            <Input
              input={row[column.key]}
              setInput={(value) =>
                updateProductField(row.id, column.key, value)
              }
              placeholder={column.placeholder || ""}
              className={column.className || "md:max-w-28"}
              disabled={isReadOnly || !column.editable}
            />
          ),
        };
      }

      if (column.type === "checkbox") {
        return {
          ...column,
          render: (_, row) => (
            <Checkbox
              variant="cyan"
              checked={row[column.key]}
              onCheck={(value) => updateProductField(row.id, column.key, value)}
              disabled={isReadOnly}
            />
          ),
        };
      }

      if (column.type === "computed") {
        return {
          ...column,
          render: (_, row) => {
            const value = column.compute
              ? column.compute(row)
              : row[column.key];
            const formatted = column.format ? column.format(value) : value;
            return <p>{formatted}</p>;
          },
        };
      }

      // Default: just display
      return {
        ...column,
        render: column.render || ((_, row) => <p>{row[column.key] || "-"}</p>),
      };
    });
  }, [
    config.productColumns,
    documentState,
    fetchedData,
    getAvailableProductsForRow,
    handleProductSelect,
    updateProductField,
    isReadOnly,
  ]);

  // Generar acciones
  const visibleActions = useMemo(() => {
    if (!config.actions) return [];

    return config.actions.filter((action) => {
      if (typeof action.visible === "function") {
        return action.visible(initialData, documentState);
      }
      return action.visible !== false;
    });
  }, [config.actions, initialData, documentState]);

  // Handler de acciones
  const handleActionClick = useCallback(
    async (action) => {
      if (!action.onClick) return;
      const context = {
        updateDocument: (id, additionalData, loading, stateOverride) =>
          handleUpdateDocument(additionalData, loading, stateOverride),
        deleteDocument: handleDeleteDocument,
        updateState: updateState,
        showToast: {
          success: (msg) => toast.success(msg),
          error: (msg) => toast.error(msg),
        },
      };
      try {
        await action.onClick(initialData, documentState, context);
      } catch (error) {
        console.error("Error en acción:", error);
        context.showToast.error(error.message || "Error al ejecutar la acción");
      }
    },
    [
      initialData,
      documentState,
      handleUpdateDocument,
      handleDeleteDocument,
      updateState,
    ]
  );

  // Calcular taxes para invoice
  const invoiceTaxes = useMemo(() => {
    if (config.invoice && config.invoice.taxes) {
      if (typeof config.invoice.taxes === "function") {
        return config.invoice.taxes(documentState);
      }
      return config.invoice.taxes;
    }
    return [];
  }, [config.invoice, documentState]);

  // Calcular título de invoice
  const invoiceTitle = useMemo(() => {
    if (config.invoice && config.invoice.title) {
      if (typeof config.invoice.title === "function") {
        return config.invoice.title(initialData, documentState);
      }
      return config.invoice.title;
    }
    return "Factura";
  }, [config.invoice, initialData, documentState]);

  // Generar datos de la factura
  const invoiceData = useMemo(() => {
    if (!config.invoice || !config.invoice.enabled) return [];

    const subtotalTaxes = invoiceTaxes.filter(
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
          ? Math.round((product.price / 1.19) * 100) / 100
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
    const ordenPrioridad = ["IVA - 19%", "Retefuente - 2,5%", "ICA - 0,77%"];
    const taxesValues = invoiceTaxes
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
  }, [config.invoice, products, invoiceTaxes]);

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
        footer: (data) => {
          // Mapear los datos para extraer las unidades en el formato que espera unitsAreConsistent
          const productsWithUnits = data.map((product) => ({
            unit: product?.product?.unit,
          }));

          // Verificar si todas las unidades son consistentes usando la función existente
          if (!unitsAreConsistent(productsWithUnits)) {
            return <p>-</p>;
          }

          // Si todas son consistentes, calcular la suma desde items
          const total = data.reduce((acc, product) => {
            const quantity =
              product.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
            return acc + quantity;
          }, 0);

          return <p>{total.toLocaleString()}</p>;
        },
      },
      {
        key: "id",
        label: "Valor bruto",
        render: (_, row) => {
          const price = row.ivaIncluded
            ? Math.round((row.price / 1.19) * 100) / 100
            : row.price;
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

  // Badge de estado
  const getBadgeVariant = () => {
    const state = initialData?.state;
    if (state === "completed") return "emerald";
    if (state === "confirmed") return "cyan";
    if (state === "draft") return "zinc";
    if (state === "canceled") return "red";
    return "zinc";
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          {/* Título y Badge de estado */}
          <div className="flex flex-row gap-4 items-center mb-6">
            <h1 className="font-bold text-3xl">{title || initialData?.code}</h1>
            {initialData?.state && (
              <Badge variant={getBadgeVariant()}>
                {initialData?.state === "draft" && "Borrador"}
                {initialData?.state === "confirmed" && "Confirmado"}
                {initialData?.state === "transit" && "En tránsito"}
                {initialData?.state === "completed" && "Completado"}
                {initialData?.state === "canceled" && "Cancelado"}
              </Badge>
            )}
          </div>

          {/* Campos del header */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderHeaderFields}
          </div>
        </CardContent>
      </Card>

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
            columns={productColumns}
            data={products}
            mobileBlock
            getRowId={(row) => row.id}
            canDeleteRow={() => !isReadOnly}
            onRowDelete={(id, index) => handleDeleteProductRow(index)}
          />
        </CardContent>
      </Card>

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
                    showMainInput={showMainItemInput}
                    canAddItems={allowAddItems}
                    allowManualEntry={allowManualEntry}
                    state={initialData.state}
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Factura Card */}
      {config.invoice && config.invoice.enabled && (
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

      {/* Custom sections */}
      {config.customSections &&
        config.customSections.map((section, index) => {
          const isVisible =
            typeof section.visible === "function"
              ? section.visible(initialData, documentState)
              : section.visible !== false;

          if (!isVisible) return null;

          return (
            <div key={index}>
              {section.render &&
                section.render(initialData, documentState, visibleActions)}
            </div>
          );
        })}

      {/* Acciones del documento Card */}
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
          {visibleActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || "zinc"}
              onClick={() => handleActionClick(action)}
              loading={action.loading}
              disabled={action.disabled}
              className="flex-1 md:flex-initial"
            >
              {typeof action.label === "function"
                ? action.label(document)
                : action.label}
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
