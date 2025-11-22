"use client";

import { useCallback, useMemo, useState } from "react";
import Card, {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import IconButton from "@/components/ui/IconButton";
import { useDocumentDetail } from "@/lib/hooks/useDocumentDetail";
import format from "@/lib/utils/format";
import toast from "react-hot-toast";
import {
  ArrowUturnLeftIcon,
  BoltIcon,
  ChatBubbleLeftIcon,
  MinusCircleIcon,
} from "@heroicons/react/24/outline";
import { TrashIcon } from "@heroicons/react/24/solid";

/**
 * Vista especializada para retornos:
 * - Usa el mismo look & feel de ReturnForm (cards por producto)
 * - Mantiene las capacidades de actualización/eliminación de DocumentDetail
 */
export default function ReturnDetailView({ config, initialData }) {
  const fetchedData = config.data || {};

  const [documentState, setDocumentState] = useState(() =>
    config.getInitialState ? config.getInitialState(initialData) : {}
  );

  const updateState = useCallback((updates) => {
    setDocumentState((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleFieldChange = useCallback(
    (field, value) => {
      if (
        field.onChange &&
        config.stateHandlers &&
        config.stateHandlers[field.onChange]
      ) {
        config.stateHandlers[field.onChange](value, documentState, updateState);
      } else {
        updateState({ [field.key]: value });
      }
    },
    [config.stateHandlers, documentState, updateState]
  );

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

  // Control de items/productos a través del hook reutilizable
  const {
    products,
    expandedRows,
    loading,
    notes,
    setNotes,
    updateItemField,
    handleDeleteItemRow,
    handleUpdateDocument,
    handleDeleteDocument,
    toggleExpanded,
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
    allowAutoCreateItems: config.allowAddItems,
  });

  const isReadOnly =
    initialData?.state === "completed" || initialData?.state === "canceled";

  const title = useMemo(() => {
    if (typeof config.title === "function") {
      return config.title(initialData, documentState);
    }
    return config.title || "";
  }, [config.title, documentState, initialData]);

  const visibleActions = useMemo(() => {
    if (!config.actions) return [];
    return config.actions.filter((action) => {
      if (typeof action.visible === "function") {
        return action.visible(initialData, documentState);
      }
      return action.visible !== false;
    });
  }, [config.actions, documentState, initialData]);

  const summary = useMemo(() => {
    const productsWithParent = products.map((p) => {
      const parentProduct = initialData?.parentOrder?.orderProducts?.find(
        (op) => op.product?.id === p.product?.id
      );
      const parentOriginalQuantity =
        parentProduct?.items?.reduce(
          (sum, item) =>
            sum +
            Number(
              item?.currentQuantity !== undefined
                ? item.currentQuantity
                : item.quantity || 0
            ),
          0
        ) || 0;
      return { ...p, parentOriginalQuantity };
    });

    const validProducts = productsWithParent.filter((p) => p.product);
    const totals = validProducts.reduce(
      (acc, product) => {
        const original =
          product.parentOriginalQuantity ||
          product.items
            ?.filter((item) => item.parentItem)
            ?.reduce(
              (sum, item) =>
                sum +
                (item.parentItem?.quantity ||
                  item.parentItem?.currentQuantity ||
                  0),
              0
            ) ||
          0;
        const returned =
          product.items?.reduce(
            (sum, item) => sum + Number(item?.quantity || 0),
            0
          ) || 0;
        return {
          products: acc.products + 1,
          original: acc.original + original,
          returned: acc.returned + returned,
        };
      },
      { products: 0, original: 0, returned: 0 }
    );
    const percent =
      totals.original > 0
        ? Math.round((totals.returned / totals.original) * 100)
        : 0;
    return {
      ...totals,
      percent,
      products: validProducts.length,
      list: productsWithParent,
    };
  }, [products, initialData?.parentOrder]);

  const handleActionClick = useCallback(
    async (action) => {
      if (!action.onClick) return;
      const context = {
        updateDocument: (id, additionalData, loadingFlag, stateOverride) =>
          handleUpdateDocument(additionalData, loadingFlag, stateOverride),
        deleteDocument: handleDeleteDocument,
        updateState,
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
    [documentState, handleDeleteDocument, handleUpdateDocument, initialData, updateState]
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">{title || initialData?.code}</h1>
              <p className="text-gray-400 text-sm mt-1">
                Detalle y edición de la devolución
              </p>
            </div>
            {initialData?.state && (
              <Badge variant={initialData.state === "completed" ? "emerald" : "yellow"}>
                {initialData.state}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.headerFields?.map((field, index) => {
              const options =
                typeof field.options === "function"
                  ? field.options(documentState, fetchedData)
                  : field.options;

              const value =
                typeof documentState[field.key] === "object"
                  ? documentState[field.key]?.id
                  : documentState[field.key];

              return (
                <div key={field.key || index} className="flex flex-col gap-1">
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
                  {field.type === "input" && field.render && (
                    field.render(field, documentState)
                  )}
                  {field.type === "input" && !field.render && (
                    <Input
                      input={value}
                      setInput={(val) => handleFieldChange(field, val)}
                      placeholder={field.placeholder || ""}
                      disabled={isReadOnly || field.disabled}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ArrowUturnLeftIcon className="w-6 h-6 text-yellow-400" />
            <div>
              <CardTitle>Resumen de devolución</CardTitle>
              <CardDescription>
                Vista rápida de los productos devueltos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <SummaryTile label="Productos" value={summary.products} />
            <SummaryTile label="Cantidad original" value={format(summary.original)} />
            <SummaryTile label="Cantidad devuelta" value={format(summary.returned)} />
            <SummaryTile
              label="Progreso"
              value={`${summary.percent}%`}
              accent
            />
          </div>
        </CardContent>
      </Card>

      {/* Productos estilo ReturnItemSelector */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ArrowUturnLeftIcon className="w-6 h-6 text-yellow-400" />
            <div>
              <CardTitle>Items devueltos</CardTitle>
              <CardDescription>
                Ajusta cantidades y datos de los items devueltos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {summary.list.filter((p) => p.product).length === 0 ? (
            <div className="p-10 text-center text-zinc-500 border border-dashed border-zinc-600 rounded-2xl bg-zinc-900/30">
              No hay productos en esta devolución
            </div>
          ) : (
            summary.list
              .filter((p) => p.product)
              .map((product) => (
                <ReturnProductCard
                  key={product.id}
                  product={product}
                  isExpanded={expandedRows.has(product.id)}
                  onToggle={() => toggleExpanded(product.id)}
                  updateItemField={updateItemField}
                  handleDeleteItemRow={handleDeleteItemRow}
                  isReadOnly={isReadOnly}
                  columns={config.productColumns}
                  documentState={documentState}
                  document={initialData}
                />
              ))
          )}
        </CardContent>
      </Card>

      {/* Notas */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ChatBubbleLeftIcon className="w-6 h-6 text-purple-400" />
            <div>
              <CardTitle>Comentarios</CardTitle>
              <CardDescription>Notas sobre esta devolución</CardDescription>
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

      {/* Secciones custom */}
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

      {/* Acciones */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BoltIcon className="w-6 h-6 text-orange-400" />
            <div>
              <CardTitle>Acciones del documento</CardTitle>
              <CardDescription>Gestiona esta devolución</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardFooter className="flex flex-col md:flex-row gap-3">
          <Button
            loading={loading}
            onClick={() => handleUpdateDocument()}
            disabled={isReadOnly}
            className="flex-1 md:flex-initial"
          >
            Actualizar
          </Button>
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

function SummaryTile({ label, value, accent = false }) {
  return (
    <div className="p-4 rounded-lg bg-neutral-800 border border-neutral-700">
      <p className="text-xs uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`text-xl font-semibold ${accent ? "text-emerald-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function ReturnProductCard({
  product,
  isExpanded,
  onToggle,
  updateItemField,
  handleDeleteItemRow,
  isReadOnly,
  columns = [],
  documentState,
  document,
}) {
  const stats = useMemo(() => {
    const original =
      product.parentOriginalQuantity ||
      product.items
        ?.filter((item) => item.parentItem)
        ?.reduce(
          (sum, item) =>
            sum +
            (item.parentItem?.quantity || item.parentItem?.currentQuantity || 0),
          0
        ) ||
      0;
    const returned =
      product.items?.reduce(
        (sum, item) => sum + Number(item?.quantity || 0),
        0
      ) || 0;
    const percent = original > 0 ? Math.round((returned / original) * 100) : 0;
    const itemsWithQuantity =
      product.items?.filter((i) => Number(i?.quantity || 0) > 0).length || 0;

    return {
      original,
      returned,
      percent,
      itemsWithQuantity,
    };
  }, [product.items]);

  const renderedColumns = useMemo(() => {
    return (columns || [])
      .filter((col) => col.key !== "product")
      .map((col) => {
        const raw =
          col.type === "computed" && typeof col.compute === "function"
            ? col.compute(product, documentState, document)
            : product[col.key];
        const formatted = col.format ? col.format(raw) : raw;
        return {
          key: col.key,
          label: col.label,
          value: formatted ?? "-",
        };
      });
  }, [columns, document, documentState, product]);

  return (
    <div className="rounded-2xl border border-neutral-700 bg-neutral-800/60 overflow-hidden">
      <div className="p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">
                {product.product?.name || product.name}
              </h3>
              <Badge variant="cyan">{product.product?.unit || "-"}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-zinc-300">
              {renderedColumns.map((col) => (
                <div key={col.key} className="flex items-center gap-2">
                  <span className="text-zinc-500 text-xs uppercase tracking-wide">
                    {col.label}
                  </span>
                  <span className="font-semibold">{col.value}</span>
                </div>
              ))}
            </div>
            {stats.original > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Progreso</span>
                  <span>{stats.percent}%</span>
                </div>
                <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{ width: `${stats.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <IconButton onClick={onToggle} className="self-start">
            <MinusCircleIcon
              className={`w-5 h-5 transition-all ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </IconButton>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-neutral-700 bg-neutral-900/40">
          {product.items?.length === 0 ? (
            <div className="p-4 text-center text-zinc-500">Sin items</div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {product.items.map((item) => {
                const original =
                  item.parentItem?.quantity ||
                  item.parentItem?.currentQuantity ||
                  0;
                return (
                  <div
                    key={item.id}
                    className="p-4 flex flex-col md:flex-row md:items-center gap-4"
                  >
                    <div className="flex-1">
                      <p className="text-xs text-zinc-400 uppercase tracking-wide">
                        Lote
                      </p>
                      <p className="font-mono text-sm">
                        {item.lotNumber || item.lot || "-"}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Código: {item.itemNumber || item.barcode || "-"}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-zinc-400 uppercase tracking-wide">
                        Cantidad original
                      </p>
                      <p className="text-sm font-semibold">
                        {format(original)} {product.product?.unit || ""}
                      </p>
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-zinc-400 uppercase tracking-wide">
                        Cantidad devuelta
                      </p>
                      <Input
                        type="number"
                        input={item.quantity}
                        setInput={(val) =>
                          updateItemField(
                            product.id,
                            item.id,
                            "quantity",
                            val
                          )
                        }
                        disabled={isReadOnly}
                        className="max-w-36"
                        min={0}
                        max={original || undefined}
                        placeholder="0"
                      />
                      <p className="text-[11px] text-zinc-500">
                        Máx: {format(original)} {product.product?.unit || ""}
                      </p>
                    </div>
                    {!isReadOnly && (
                      <div className="flex-none">
                        <IconButton
                          onClick={() => handleDeleteItemRow(product.id, item.id)}
                          variant="red"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </IconButton>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
