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
import { useFetchData } from "@/lib/hooks/useFetchData";
import format from "@/lib/utils/format";
import toast from "react-hot-toast";

/**
 * DocumentDetailBase V2 - Versión simplificada con config-based API
 * Similar a EntityForm: solo necesita config e initialData
 *
 * @param {Object} config - Configuración del documento
 * @param {Object} initialData - Datos iniciales del documento
 */
export default function DocumentDetailBaseV2({ config, initialData }) {
  // Fetch data usando los data fetchers del config
  const fetchedData = useFetchData(config.dataFetchers);

  // Estado interno del formulario
  const [documentState, setDocumentState] = useState(() =>
    config.getInitialState ? config.getInitialState(initialData) : {}
  );

  // Helper para actualizar estado
  const updateState = useCallback((updates) => {
    setDocumentState(prev => ({ ...prev, ...updates }));
  }, []);

  // Handler de cambio de campo con soporte para state handlers
  const handleFieldChange = useCallback((field, value) => {
    if (field.onChange && config.stateHandlers && config.stateHandlers[field.onChange]) {
      // Ejecutar el state handler personalizado
      config.stateHandlers[field.onChange](value, documentState, updateState);
    } else {
      // Actualización simple del campo
      updateState({ [field.key]: value });
    }
  }, [documentState, updateState, config.stateHandlers]);

  // Preparar datos para actualización
  const prepareUpdateData = useCallback((document, products) => {
    if (config.prepareUpdateData) {
      return config.prepareUpdateData(document, products, documentState);
    }
    return {};
  }, [config, documentState]);

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
    updateDocument: config.updateDocument || (() => Promise.resolve({ success: false })),
    deleteDocument: config.deleteDocument || (() => Promise.resolve({ success: false })),
    addItem: config.addItem,
    removeItem: config.removeItem,
    availableProducts: fetchedData.products || [],
    documentType: config.type,
    onSuccess: config.onUpdate,
    redirectPath: config.redirectPath,
    prepareUpdateData,
  });

  // Handler personalizado para selección de producto (con auto-fill desde config)
  const handleProductSelect = useCallback((product, index) => {
    baseHandleProductSelect(product, index);

    // Si hay lógica de onChange en la columna de producto
    const productColumn = config.productColumns?.find(col => col.key === 'name' || col.key === 'product');
    if (productColumn && productColumn.onChange) {
      const currentRow = products[index];
      const updatedRow = productColumn.onChange(product, currentRow, documentState);

      // Aplicar los cambios al row
      if (updatedRow && updatedRow !== currentRow) {
        Object.entries(updatedRow).forEach(([key, value]) => {
          if (key !== 'product' && value !== currentRow[key]) {
            updateProductField(currentRow.id, key, value);
          }
        });
      }
    }
  }, [baseHandleProductSelect, config.productColumns, documentState, products, updateProductField]);

  // Determinar si es read-only
  const isReadOnly = initialData?.state === "completed" || initialData?.state === "canceled";

  // Calcular título
  const title = useMemo(() => {
    if (typeof config.title === 'function') {
      return config.title(initialData, documentState);
    }
    return config.title || '';
  }, [config.title, initialData, documentState]);

  // Renderizar campos del header
  const renderHeaderFields = useMemo(() => {
    if (!config.headerFields) return null;

    return config.headerFields.map((field, index) => {
      // Calcular opciones (pueden ser función que depende del estado)
      const options = typeof field.options === 'function'
        ? field.options(documentState, fetchedData)
        : field.options;

      const value = documentState[field.key];

      return (
        <div key={field.key || index} className="flex flex-col gap-1 mt-3 md:mt-0 md:flex-1">
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

          {field.type === "input" && field.render && field.render(field, documentState)}
        </div>
      );
    });
  }, [config.headerFields, documentState, fetchedData, handleFieldChange, isReadOnly]);

  // Generar columnas de productos
  const productColumns = useMemo(() => {
    if (!config.productColumns) return [];

    return config.productColumns.map(column => {
      if (column.type === 'select') {
        return {
          ...column,
          render: (_, row, index) => {
            const options = typeof column.options === 'function'
              ? column.options(documentState, fetchedData, row, index, getAvailableProductsForRow(index))
              : column.options;

            return (
              <Select
                className="md:min-w-80"
                options={options || []}
                value={row[column.key] || null}
                onChange={(value) => {
                  if (column.key === 'name' || column.key === 'product') {
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

      if (column.type === 'input') {
        return {
          ...column,
          render: (_, row) => (
            <Input
              input={row[column.key]}
              setInput={(value) => updateProductField(row.id, column.key, value)}
              placeholder={column.placeholder || ""}
              className={column.className || "md:max-w-28"}
              disabled={isReadOnly || !column.editable}
            />
          ),
        };
      }

      if (column.type === 'checkbox') {
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

      if (column.type === 'computed') {
        return {
          ...column,
          render: (_, row) => {
            const value = column.compute ? column.compute(row) : row[column.key];
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
  }, [config.productColumns, documentState, fetchedData, getAvailableProductsForRow, handleProductSelect, updateProductField, isReadOnly]);

  // Generar acciones
  const visibleActions = useMemo(() => {
    if (!config.actions) return [];

    return config.actions.filter(action => {
      if (typeof action.visible === 'function') {
        return action.visible(initialData, documentState);
      }
      return action.visible !== false;
    });
  }, [config.actions, initialData, documentState]);

  // Handler de acciones
  const handleActionClick = useCallback(async (action) => {
    if (!action.onClick) return;

    const context = {
      updateDocument: handleUpdateDocument,
      deleteDocument: handleDeleteDocument,
      showToast: {
        success: (msg) => toast.success(msg),
        error: (msg) => toast.error(msg),
      },
    };

    try {
      await action.onClick(initialData, documentState, context);
    } catch (error) {
      console.error('Error en acción:', error);
      context.showToast.error(error.message || 'Error al ejecutar la acción');
    }
  }, [initialData, documentState, handleUpdateDocument, handleDeleteDocument]);

  // Calcular taxes para invoice
  const invoiceTaxes = useMemo(() => {
    if (config.invoice && config.invoice.taxes) {
      if (typeof config.invoice.taxes === 'function') {
        return config.invoice.taxes(documentState);
      }
      return config.invoice.taxes;
    }
    return [];
  }, [config.invoice, documentState]);

  // Calcular título de invoice
  const invoiceTitle = useMemo(() => {
    if (config.invoice && config.invoice.title) {
      if (typeof config.invoice.title === 'function') {
        return config.invoice.title(initialData, documentState);
      }
      return config.invoice.title;
    }
    return "Factura";
  }, [config.invoice, initialData, documentState]);

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
    <div className="flex flex-col gap-4 w-full">
      {/* Header con título y badge */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <DocumentTextIcon className="w-10 h-10 text-cyan-400" />
              <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>
                  {config.type === 'sale' && 'Orden de Venta'}
                  {config.type === 'purchase' && 'Orden de Compra'}
                  {config.type === 'return' && 'Devolución'}
                </CardDescription>
              </div>
            </div>
            <Badge variant={getBadgeVariant()}>
              {initialData?.state === "draft" && "Borrador"}
              {initialData?.state === "confirmed" && "Confirmada"}
              {initialData?.state === "completed" && "Completada"}
              {initialData?.state === "canceled" && "Cancelada"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:flex-wrap gap-2 md:gap-4">
            {renderHeaderFields}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de productos */}
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center gap-2">
            <ClipboardDocumentListIcon className="w-6 h-6 text-cyan-400" />
            <CardTitle>Productos</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table
            columns={productColumns}
            data={products.filter(p => p.product)}
            onDeleteRow={!isReadOnly ? handleDeleteProductRow : undefined}
            expandable
            expandedRows={expandedRows}
            onToggleExpand={toggleExpanded}
            renderExpandedContent={(row) => (
              <PackingListProduct
                product={row}
                updateItemField={updateItemField}
                handleAddItemRow={handleAddItemRow}
                handleDeleteItemRow={handleDeleteItemRow}
                isReadOnly={isReadOnly}
              />
            )}
          />
        </CardContent>
      </Card>

      {/* Notas */}
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center gap-2">
            <ChatBubbleLeftIcon className="w-6 h-6 text-cyan-400" />
            <CardTitle>Notas</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={setNotes}
            placeholder="Agregar notas adicionales..."
            disabled={isReadOnly}
          />
        </CardContent>
      </Card>

      {/* Acciones */}
      {visibleActions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-row items-center gap-2">
              <BoltIcon className="w-6 h-6 text-cyan-400" />
              <CardTitle>Acciones</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-2 flex-wrap">
              {visibleActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || "zinc"}
                  onClick={() => handleActionClick(action)}
                  loading={action.loading}
                  disabled={action.disabled}
                  className="flex-1 md:flex-initial"
                >
                  {action.label}
                </Button>
              ))}

              <Button
                variant="zinc"
                onClick={() => handleUpdateDocument()}
                loading={loading}
                disabled={isReadOnly}
                className="flex-1 md:flex-initial"
              >
                Actualizar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom sections */}
      {config.customSections && config.customSections.map((section, index) => {
        const isVisible = typeof section.visible === 'function'
          ? section.visible(initialData, documentState)
          : section.visible !== false;

        if (!isVisible) return null;

        return (
          <div key={index}>
            {section.render && section.render(initialData, documentState, visibleActions)}
          </div>
        );
      })}
    </div>
  );
}
