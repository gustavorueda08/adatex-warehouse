"use client";

/**
 * @fileoverview Panel de nacionalización para órdenes de compra en zona franca.
 *
 * Se muestra en la página de detalle de una orden de compra cuando:
 *   1. La orden está COMPLETADA.
 *   2. La bodega destino tiene tipo `freeTradeZone`.
 *
 * Permite al usuario:
 *   - Ver los items (rollos) disponibles agrupados por producto.
 *   - Seleccionar items individualmente o ingresar una cantidad para
 *     auto-selección FIFO.
 *   - Seleccionar la bodega stock destino.
 *   - Crear la orden de nacionalización con un clic.
 */

import { useState, useEffect, useCallback } from "react";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import {
  Button,
  Select,
  SelectItem,
  Chip,
  Spinner,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Pagination,
} from "@heroui/react";
import { GlobeAltIcon } from "@heroicons/react/24/solid";
import toast from "react-hot-toast";

/**
 * @param {Object} props
 * @param {Object} props.document - The completed purchase order document.
 * @param {Function} props.createNationalization - `createNationalization` from useOrders.
 * @param {Function} props.getNationalizableItems - `getNationalizableItems` from useOrders.
 * @param {Function} [props.onSuccess] - Called with the created order after a successful nationalization.
 */
export default function NationalizationPanel({
  document,
  createNationalization,
  getNationalizableItems,
  onSuccess,
}) {
  // Grouped data: [{ product, items, totalAvailable }]
  const [groups, setGroups] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const GROUP_PAGE_SIZE = 5;
  const [groupPage, setGroupPage] = useState(1);

  const ITEMS_PAGE_SIZE = 10;
  const [itemPages, setItemPages] = useState({}); // { [productId]: number }

  // Set of selected item IDs (numbers)
  const [selectedItems, setSelectedItems] = useState(new Set());
  // Qty input per product (for FIFO auto-selection)
  const [qtyInputs, setQtyInputs] = useState({});

  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { warehouses: stockWarehouses, loading: warehousesLoading } =
    useWarehouses({ filters: { type: "stock", isActive: true } }, {});

  // Fetch available items grouped by product
  useEffect(() => {
    if (!document?.id || !getNationalizableItems) return;
    setLoadingItems(true);
    setFetchError(null);
    getNationalizableItems(document.id)
      .then((result) => {
        if (!result.success)
          throw new Error(result.error?.message || "Error al cargar items");
        const data = result.data || [];
        setGroups(data);
        const init = {};
        data.forEach((g) => {
          init[g.product.id] = "";
        });
        setQtyInputs(init);
      })
      .catch((err) => setFetchError(err.message))
      .finally(() => setLoadingItems(false));
  }, [document?.id]);

  const setItemPage = useCallback((productId, page) => {
    setItemPages((prev) => ({ ...prev, [productId]: page }));
  }, []);

  // When qty input changes: FIFO-select items for that product
  const handleQtyChange = useCallback((productId, value, items) => {
    setQtyInputs((prev) => ({ ...prev, [productId]: value }));
    setItemPages((prev) => ({ ...prev, [productId]: 1 }));
    const qty = Number(value);
    if (!value || isNaN(qty) || qty <= 0) {
      setSelectedItems((prev) => {
        const next = new Set(prev);
        items.forEach((item) => next.delete(item.id));
        return next;
      });
      return;
    }
    // FIFO: items are already sorted createdAt:asc from the backend
    let remaining = qty;
    const toSelect = new Set();
    for (const item of items) {
      if (remaining <= 0) break;
      toSelect.add(item.id);
      remaining -= Number(item.currentQuantity) || 0;
    }
    setSelectedItems((prev) => {
      const next = new Set(prev);
      items.forEach((item) => {
        if (toSelect.has(item.id)) next.add(item.id);
        else next.delete(item.id);
      });
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((productId, items) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      items.forEach((item) => next.add(item.id));
      return next;
    });
    const total = items.reduce(
      (s, i) => s + (Number(i.currentQuantity) || 0),
      0,
    );
    setQtyInputs((prev) => ({ ...prev, [productId]: String(total) }));
    setItemPages((prev) => ({ ...prev, [productId]: 1 }));
  }, []);

  const handleClearAll = useCallback((productId, items) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      items.forEach((item) => next.delete(item.id));
      return next;
    });
    setQtyInputs((prev) => ({ ...prev, [productId]: "" }));
    setItemPages((prev) => ({ ...prev, [productId]: 1 }));
  }, []);

  const handleTableSelectionChange = useCallback(
    (productId, visibleItems, allGroupItems, keys) => {
      if (keys === "all") {
        // Select all visible items on this page; preserve other pages' selections
        setSelectedItems((prev) => {
          const next = new Set(prev);
          visibleItems.forEach((item) => next.add(item.id));
          const total = allGroupItems
            .filter((i) => next.has(i.id))
            .reduce((s, i) => s + (Number(i.currentQuantity) || 0), 0);
          setQtyInputs((prevQ) => ({
            ...prevQ,
            [productId]: total > 0 ? String(total) : "",
          }));
          return next;
        });
        return;
      }
      const newSelectedIds = new Set([...keys].map(Number));
      setSelectedItems((prev) => {
        const next = new Set(prev);
        // Only update visible items — items on other pages are untouched
        visibleItems.forEach((item) => {
          if (newSelectedIds.has(item.id)) next.add(item.id);
          else next.delete(item.id);
        });
        // Compute total from ALL group items so qty reflects the full selection
        const total = allGroupItems
          .filter((i) => next.has(i.id))
          .reduce((s, i) => s + (Number(i.currentQuantity) || 0), 0);
        setQtyInputs((prevQ) => ({
          ...prevQ,
          [productId]: total > 0 ? String(total) : "",
        }));
        return next;
      });
    },
    [],
  );

  const handleSubmit = async () => {
    if (!destinationWarehouseId) {
      toast.error("Selecciona la bodega stock de destino");
      return;
    }

    const products = groups
      .map((group) => {
        const itemIds = group.items
          .filter((item) => selectedItems.has(item.id))
          .map((item) => item.id);
        return itemIds.length > 0
          ? { product: group.product.id, itemIds }
          : null;
      })
      .filter(Boolean);

    if (products.length === 0) {
      toast.error("Selecciona al menos un item para nacionalizar");
      return;
    }

    setSubmitting(true);
    const promise = createNationalization(document.id, {
      destinationWarehouseId: Number(destinationWarehouseId),
      products,
      notes: `Nacionalización de ${document.code}`,
    })
      .then((result) => {
        if (!result.success) {
          throw new Error(
            result.error?.message || "Error al crear la nacionalización",
          );
        }
        onSuccess?.(result.data);
        return result;
      })
      .finally(() => setSubmitting(false));

    toast.promise(promise, {
      loading: "Creando orden de nacionalización...",
      success: "Orden de nacionalización creada exitosamente",
      error: (err) => err.message || "Error al crear la nacionalización",
    });
  };

  if (loadingItems) {
    return (
      <div className="flex items-center justify-center py-10 gap-3">
        <Spinner size="sm" />
        <span className="text-sm text-zinc-500">
          Cargando items disponibles...
        </span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="rounded-lg bg-danger-50 dark:bg-danger-900/20 p-4 text-sm text-danger-600 dark:text-danger-400">
        {fetchError}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-6 text-sm text-zinc-500 text-center">
        No hay items disponibles para nacionalizar en esta orden.
      </div>
    );
  }

  const totalSelectedItems = selectedItems.size;
  const groupPageCount = Math.ceil(groups.length / GROUP_PAGE_SIZE);
  const visibleGroups = groups.slice(
    (groupPage - 1) * GROUP_PAGE_SIZE,
    groupPage * GROUP_PAGE_SIZE,
  );

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Selecciona los rollos que deseas nacionalizar. Puedes elegir items
        individualmente o ingresar una cantidad para auto-selección FIFO.
      </p>

      {/* Product groups */}
      {visibleGroups.map((group) => {
        const pid = group.product.id;
        const selectedCount = group.items.filter((i) =>
          selectedItems.has(i.id),
        ).length;
        const selectedQty = group.items
          .filter((i) => selectedItems.has(i.id))
          .reduce((s, i) => s + (Number(i.currentQuantity) || 0), 0);
        const unit = group.product.unit || "u";

        const itemPage = itemPages[pid] ?? 1;
        const itemPageCount = Math.ceil(group.items.length / ITEMS_PAGE_SIZE);
        const visibleItems = group.items.slice(
          (itemPage - 1) * ITEMS_PAGE_SIZE,
          itemPage * ITEMS_PAGE_SIZE,
        );

        return (
          <div
            key={pid}
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
          >
            {/* Product header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm">
                  {group.product.name}
                </span>
                {group.product.code && (
                  <span className="text-xs text-zinc-400 font-mono">
                    {group.product.code}
                  </span>
                )}
                <Chip size="sm" variant="flat" color="default">
                  {group.items.length} rollos · {group.totalAvailable} {unit}
                </Chip>
                {selectedCount > 0 && (
                  <Chip size="sm" variant="flat" color="primary">
                    {selectedCount} seleccionados · {selectedQty} {unit}
                  </Chip>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  size="sm"
                  variant="bordered"
                  placeholder="Cantidad FIFO"
                  className="w-36"
                  min={0}
                  max={group.totalAvailable}
                  value={qtyInputs[pid] ?? ""}
                  onChange={(e) =>
                    handleQtyChange(pid, e.target.value, group.items)
                  }
                  endContent={
                    <span className="text-xs text-zinc-400 shrink-0">
                      {unit}
                    </span>
                  }
                  aria-label="Cantidad a nacionalizar FIFO"
                />
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  onPress={() => handleSelectAll(pid, group.items)}
                >
                  Todo
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  color="default"
                  onPress={() => handleClearAll(pid, group.items)}
                >
                  Limpiar
                </Button>
              </div>
            </div>

            {/* Items table */}
            <Table
              removeWrapper
              selectionMode="multiple"
              selectedKeys={
                new Set(
                  visibleItems
                    .filter((i) => selectedItems.has(i.id))
                    .map((i) => String(i.id)),
                )
              }
              onSelectionChange={(keys) =>
                handleTableSelectionChange(pid, visibleItems, group.items, keys)
              }
              bottomContent={
                itemPageCount > 1 ? (
                  <div className="flex w-full justify-center pb-2">
                    <Pagination
                      isCompact
                      showControls
                      showShadow
                      color="primary"
                      page={itemPage}
                      total={itemPageCount}
                      onChange={(p) => setItemPage(pid, p)}
                    />
                  </div>
                ) : null
              }
              aria-label={`Items de ${group.product.name}`}
              classNames={{
                td: "py-2 text-sm",
                th: "text-xs bg-transparent",
                wrapper: itemPageCount > 1 ? "min-h-[180px]" : undefined,
              }}
            >
              <TableHeader>
                <TableColumn>N° Item</TableColumn>
                <TableColumn>Lote</TableColumn>
                <TableColumn className="text-right">Cantidad</TableColumn>
                <TableColumn className="text-right">Costo</TableColumn>
              </TableHeader>
              <TableBody>
                {visibleItems.map((item) => (
                  <TableRow key={String(item.id)}>
                    <TableCell className="font-mono text-xs">
                      {item.itemNumber ?? item.id}
                    </TableCell>
                    <TableCell>{item.lotNumber ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {item.currentQuantity} {unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.cost != null
                        ? `$${Number(item.cost).toLocaleString("es-CO")}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      })}

      {/* Paginación de grupos */}
      {groupPageCount > 1 && (
        <div className="flex justify-center">
          <Pagination
            isCompact
            showControls
            showShadow
            color="primary"
            page={groupPage}
            total={groupPageCount}
            onChange={setGroupPage}
          />
        </div>
      )}

      {/* Bottom action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-700">
        <div className="w-full sm:w-64">
          <Select
            label="Bodega stock destino"
            placeholder="Selecciona una bodega"
            selectedKeys={
              destinationWarehouseId ? [String(destinationWarehouseId)] : []
            }
            onSelectionChange={(keys) => {
              const val = [...keys][0];
              setDestinationWarehouseId(val || "");
            }}
            isLoading={warehousesLoading}
            size="sm"
            variant="bordered"
            aria-label="Bodega destino"
          >
            {(stockWarehouses || []).map((wh) => (
              <SelectItem key={String(wh.id)} value={String(wh.id)}>
                {wh.name}
              </SelectItem>
            ))}
          </Select>
        </div>
        <Button
          color="primary"
          startContent={<GlobeAltIcon className="w-4 h-4" />}
          onPress={handleSubmit}
          isLoading={submitting}
          isDisabled={
            submitting || !destinationWarehouseId || totalSelectedItems === 0
          }
        >
          Crear Nacionalización
          {totalSelectedItems > 0 && ` (${totalSelectedItems} items)`}
        </Button>
      </div>
    </div>
  );
}
