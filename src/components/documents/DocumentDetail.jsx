"use client";
import { useState, useCallback, useMemo } from "react";
import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import Table from "@/components/ui/Table";
import MobileList from "@/components/ui/MobileList";
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
import { useUser } from "@/lib/hooks/useUser";
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
    config.getInitialState ? config.getInitialState(initialData) : {},
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
    [documentState, updateState, config.stateHandlers],
  );

  // Preparar datos para actualización
  const prepareUpdateData = useCallback(
    (document, products, stateOverride = null) => {
      if (config.prepareUpdateData) {
        return config.prepareUpdateData(
          document,
          products,
          stateOverride || documentState,
        );
      }
      return {};
    },
    [config, documentState],
  );

  const allowAddItems =
    typeof config.allowAddItems === "function"
      ? config.allowAddItems(documentState)
      : config.allowAddItems;
  const showMainItemInput = config.showItemInput;
  const allowManualEntry = config.allowManualEntry;

  // Preparar documento estable para hook (evitar re-renders infinitos)
  const stableDocument = useMemo(() => {
    const initialState = config.getInitialState
      ? config.getInitialState(initialData)
      : {};
    return { ...initialData, ...initialState };
  }, [initialData, config]);

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
    document: stableDocument,
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
    disableDedupe: config.disableDedupe,
  });

  const resolveProductValue = useCallback(
    (product, index) => {
      if (product && typeof product === "object") return product;
      const available = getAvailableProductsForRow(index) || [];
      return available.find((p) => p.id == product) || product;
    },
    [getAvailableProductsForRow],
  );

  // Helper para actualizar múltiples campos de un producto atómicamente
  const updateProductRow = useCallback(
    (productId, updates) => {
      setProducts((current) =>
        current.map((product) => {
          if (product.id !== productId) return product;
          return { ...product, ...updates };
        }),
      );
    },
    [setProducts],
  );

  // Handler personalizado para selección de producto (con auto-fill desde config)
  const handleProductSelect = useCallback(
    (product, index) => {
      const normalizedProduct = resolveProductValue(product, index);
      baseHandleProductSelect(normalizedProduct, index);

      // Si hay lógica de onChange en la columna de producto
      const productColumn = config.productColumns?.find(
        (col) => col.key === "name" || col.key === "product",
      );
      if (productColumn && productColumn.onChange) {
        const currentRow = products[index];
        const updatedRow = productColumn.onChange(
          normalizedProduct,
          currentRow,
          documentState,
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
    ],
  );

  const { user } = useUser();

  // Determinar si es read-only
  const isReadOnly =
    user?.type !== "admin" &&
    (initialData?.state === "completed" ||
      initialData?.state === "canceled" ||
      initialData?.siigoIdTypeA ||
      initialData?.siigoIdTypeB);

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
              onSearch={field.onSearch}
              onLoadMore={field.onLoadMore}
              hasMore={field.hasMore}
              loading={field.loading}
              loadingMore={field.loadingMore}
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
                    getAvailableProductsForRow(index),
                  )
                : column.options;

            const value =
              column.useProductIdAsValue !== false &&
              typeof row[column.key] === "object"
                ? row[column.key]?.id
                : row[column.key] || null;

            return (
              <Select
                className={column.className || "md:min-w-80"}
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
                onSearch={column.onSearch}
                searchValue={column.searchValue}
                hasMore={column.hasMore}
                onLoadMore={column.onLoadMore}
                loading={column.loading}
                loadingMore={column.loadingMore}
                placeholder={column.placeholder}
                size={column.size || "md"}
                renderOption={column.renderOption}
                renderValue={column.renderValue}
                clearable={column.clearable}
                disabled={isReadOnly || column.disabled}
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
              checked={
                row[column.key] === true || String(row[column.key]) === "true"
              }
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
    ],
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
  // Generar datos de la factura
  const invoiceData = useMemo(() => {
    if (!config.invoice || !config.invoice.enabled) return [];

    // Helper para evaluar condiciones
    const checkThreshold = (value, threshold, condition = ">=") => {
      switch (condition) {
        case ">":
          return value > threshold;
        case ">=":
          return value >= threshold;
        case "<":
          return value < threshold;
        case "<=":
          return value <= threshold;
        case "==":
          return value === threshold;
        default:
          return value >= threshold;
      }
    };

    // 1. Filtrar impuestos activos y productos válidos
    const activeTaxes = invoiceTaxes.filter(
      (t) => t.shouldAppear !== false && t.applicationType !== "self-retention",
    );
    const validProducts = products.filter(
      (product) => product.product && product.quantity !== "",
    );

    // 2. Paso 1: Calcular Subtotal Preliminar
    // Se usa para evaluar condiciones de impuestos tipo 'product-depending-subtotal'
    let subtotalPreliminar = 0;

    validProducts.forEach((product) => {
      const invoicePercentage = Number(product.invoicePercentage || 100) / 100;
      const rawQty =
        product.items?.reduce(
          (acc, item) => acc + Number(item.quantity || 0),
          0,
        ) || Number(product.quantity || 0);
      const quantity = rawQty * invoicePercentage;
      const price = Number(product.price || 0);

      let baseLinea = 0;
      if (product.ivaIncluded) {
        // Asumiendo IVA 19% implícito según guía
        baseLinea = (price * quantity) / 1.19;
      } else {
        baseLinea = price * quantity;
      }
      subtotalPreliminar += baseLinea;
    });

    // 3. Paso 2: Identificar Impuestos Condicionales
    const conditionalTaxesMap = {};
    activeTaxes.forEach((tax) => {
      if (tax.applicationType === "product-depending-subtotal") {
        const threshold = Number(tax.treshold || 0); // Nota: 'treshold' typo en backend original
        const applies = checkThreshold(
          subtotalPreliminar,
          threshold,
          tax.tresholdCondition,
        );
        if (applies) {
          conditionalTaxesMap[tax.id] = true;
        }
      }
    });

    // 4. Paso 3: Calcular Detalle por Item
    let invoiceSubtotal = 0;
    const taxesAccumulated = {}; // taxId -> amount

    validProducts.forEach((product) => {
      const invoicePercentage = Number(product.invoicePercentage || 100) / 100;
      const rawQty =
        product.items?.reduce(
          (acc, item) => acc + Number(item.quantity || 0),
          0,
        ) || Number(product.quantity || 0);
      const quantity = rawQty * invoicePercentage;
      const price = Number(product.price || 0);

      // Calcular Total Bruto esperado para el item
      const itemGrossTotal = price * quantity;

      // Calcular Base del Item (inicial)
      let baseItem = 0;
      if (product.ivaIncluded) {
        baseItem = itemGrossTotal / 1.19;
      } else {
        baseItem = itemGrossTotal;
      }

      // Calcular impuestos por item para determinar el valor real del impuesto
      let itemTotalTaxAmount = 0;
      let totalApplicableTaxRate = 0;

      activeTaxes.forEach((tax) => {
        let applies = false;
        if (tax.applicationType === "product") applies = true;
        if (
          tax.applicationType === "product-depending-subtotal" &&
          conditionalTaxesMap[tax.id]
        )
          applies = true;

        if (applies) {
          // ValorImpuesto = BaseItem * TasaImpuesto
          // CRÍTICO: Redondear a 2 decimales por item
          let taxValue = baseItem * Number(tax.amount || 0);
          taxValue = Math.round(taxValue * 100) / 100;

          if (!taxesAccumulated[tax.id]) taxesAccumulated[tax.id] = 0;
          taxesAccumulated[tax.id] += taxValue;

          itemTotalTaxAmount += taxValue;
          totalApplicableTaxRate += Number(tax.amount || 0);
        }
      });

      // AJUSTE CRÍTICO DE REDONDEO:
      // Si el IVA está incluido (y es el único o suma 19%), ajustamos la base.
      // Si hay otros impuestos (ej. 19% + 5%), no forzamos que el total sea igual al precio de lista
      // porque el divisor 1.19 solo cubre el IVA.
      if (
        product.ivaIncluded &&
        Math.abs(totalApplicableTaxRate - 0.19) < 0.01
      ) {
        baseItem = itemGrossTotal - itemTotalTaxAmount;
      }

      invoiceSubtotal += baseItem;
    });

    // Redondear Subtotal final
    invoiceSubtotal = Math.round(invoiceSubtotal * 100) / 100;

    // 5. Paso 5: Calcular Retenciones (subtotal taxes)
    const retentionTaxes = [];
    activeTaxes.forEach((tax) => {
      if (tax.applicationType === "subtotal") {
        const threshold = Number(tax.treshold || 0);
        const applies = checkThreshold(
          invoiceSubtotal,
          threshold,
          tax.tresholdCondition,
        );

        if (applies) {
          let val = invoiceSubtotal * Number(tax.amount || 0);
          val = Math.round(val * 100) / 100;
          retentionTaxes.push({
            ...tax,
            calculatedAmount: val,
          });
        }
      }
    });

    // 6. Paso 6: Total Final
    let total = invoiceSubtotal;
    const finalTaxList = [];

    // Agregar Product Taxes
    activeTaxes.forEach((tax) => {
      if (taxesAccumulated[tax.id]) {
        const amount = taxesAccumulated[tax.id];
        finalTaxList.push({
          id: tax.id,
          name: tax.name,
          amount: amount,
          use: tax.use,
        });

        if (tax.use === "decrement") {
          total -= amount;
        } else {
          // Default increment
          total += amount;
        }
      }
    });

    // Agregar Retenciones
    retentionTaxes.forEach((ret) => {
      finalTaxList.push({
        id: ret.id,
        name: ret.name,
        amount: ret.calculatedAmount,
        use: ret.use,
      });

      if (ret.use === "decrement") {
        total -= ret.calculatedAmount;
      } else {
        total += ret.calculatedAmount;
      }
    });

    total = Math.round(total * 100) / 100;

    // Ordenar para visualización
    const ordenPrioridad = ["IVA - 19%", "Retefuente - 2,5%", "ICA - 0,77%"];
    finalTaxList.sort((a, b) => {
      const indexA = ordenPrioridad.indexOf(a.name);
      const indexB = ordenPrioridad.indexOf(b.name);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });

    return [
      {
        id: "subtotal",
        name: "Subtotal",
        amount: invoiceSubtotal,
      },
      ...finalTaxList,
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
                0,
              ) || 0,
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
    [],
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
    [],
  );

  // Calcular estadísticas globales de la lista de empaque
  const packingListStats = useMemo(() => {
    const productsWithItems = products.filter((p) => p.product);

    const totalItems = productsWithItems.reduce(
      (acc, p) => acc + (Array.isArray(p.items) ? p.items.length : 1),
      0,
    );

    const totalQuantity = productsWithItems.reduce((acc, p) => {
      if (Array.isArray(p.items)) {
        return (
          acc +
          p.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
        );
      }
      return acc + Number(p.quantity || p.targetQuantity || 0);
    }, 0);

    const totalRequested = productsWithItems.reduce(
      (acc, p) => acc + Number(p.requestedQuantity || 0),
      0,
    );

    const itemsWithQuantity = productsWithItems.reduce((acc, p) => {
      if (Array.isArray(p.items)) {
        return acc + p.items.filter((item) => item.quantity > 0).length;
      }
      const qty = Number(p.quantity || p.targetQuantity || 0);
      return acc + (qty > 0 ? 1 : 0);
    }, 0);

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
    if (state === "completed") {
      if (
        config.type === "sale" &&
        (initialData.siigoIdTypeA || initialData.siigoIdTypeB)
      ) {
        return "purple";
      }
      return "emerald";
    }
    if (state === "confirmed") return "cyan";
    if (state === "draft") return "yellow";
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
                {initialData?.state === "draft" && "Pendiente"}
                {initialData?.state === "confirmed" && "Confirmado"}
                {initialData?.state === "transit" && "En tránsito"}
                {initialData?.state === "completed" &&
                  (config.type === "sale" &&
                  !initialData.siigoIdTypeA &&
                  !initialData.siigoIdTypeB
                    ? "Despachado"
                    : "Completado")}
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
          <div className="md:hidden">
            <MobileList
              columns={productColumns}
              data={products}
              getRowId={(row) => row.id}
              canDeleteRow={() => !isReadOnly}
              onRowDelete={(id, index) => handleDeleteProductRow(index)}
            />
          </div>
          <div className="hidden md:block">
            <Table
              columns={productColumns}
              data={products}
              getRowId={(row) => row.id}
              canDeleteRow={() => !isReadOnly}
              onRowDelete={(id, index) => handleDeleteProductRow(index)}
              renderExpandedContent={
                config.renderExpandedContent
                  ? (row, index) =>
                      config.renderExpandedContent(row, index, {
                        updateProductField: (field, value) =>
                          updateProductField(row.id, field, value),
                        updateProductRow: (updates) =>
                          updateProductRow(row.id, updates),
                      })
                  : undefined
              }
              mergeExpansionToggle={config.mergeExpansionToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de empaque Card */}
      {products.filter((p) => p.product).length > 0 &&
        config.showPackingList !== false && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <ClipboardDocumentListIcon className="w-6 h-6 text-emerald-400" />
                <div className="flex-1">
                  <CardTitle>Lista de Empaque</CardTitle>
                  <CardDescription>
                    Detalle de items por producto
                  </CardDescription>
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
                    <span className="text-sm text-gray-400">
                      Progreso global
                    </span>
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
                          100,
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
                <div className="md:hidden">
                  <MobileList
                    columns={invoiceColumns}
                    data={products.filter((p) => p.product)}
                    footerFilter={(_, value) => value !== "-" && value !== ""}
                  />
                </div>
                <div className="hidden md:block">
                  <Table
                    columns={invoiceColumns}
                    data={products.filter((p) => p.product)}
                  />
                </div>
              </div>
              <div className="col-span-12 md:col-span-4">
                <div className="md:hidden">
                  <MobileList
                    columns={invoiceResumeColumns}
                    data={invoiceData}
                    footerFilter={(_, value) => value !== "-" && value !== ""}
                  />
                </div>
                <div className="hidden md:block">
                  <Table
                    columns={invoiceResumeColumns}
                    data={invoiceData}
                    hiddenHeader
                  />
                </div>
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

          const sectionContext = {
            updateState,
            setProducts,
            products,
            fetchedData,
            isReadOnly,
            actions: visibleActions,
          };

          return (
            <div key={index}>
              {section.render &&
                section.render(initialData, documentState, sectionContext)}
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
                ? action.label(initialData)
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
