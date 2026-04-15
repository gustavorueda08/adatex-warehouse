import format from "@/lib/utils/format";
import unitsAreConsistent from "@/lib/utils/unitsConsistency";
import { TrashIcon, EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { Card } from "@heroui/card";
import {
  Accordion,
  AccordionItem,
  Badge,
  Button,
  Chip,
  Divider,
  Input,
  Pagination,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  addToast,
} from "@heroui/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useItems } from "@/lib/hooks/useItems";
import { v4 as uuidv4 } from "uuid";
import DebouncedInput from "../ui/DebounceInput";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import { parseItemData } from "@/lib/utils/parseItemData";
import QuickTransferModal from "./QuickTransferModal";

function PackingListProductHeader({
  document,
  product,
  onHeaderScan,
  isInputEnabled = true,
  setDocument,
  onItemsReplaced,
  onItemsReserved,
}) {
  const isCompleted = product.confirmedQuantity >= product.requestedQuantity;
  const completedPercentage =
    Math.round(
      ((product.confirmedQuantity / product.requestedQuantity) * 100 || 0) *
        100,
    ) / 100;

  const [inputValue, setInputValue] = useState("");
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isTransferOpen,
    onOpen: onTransferOpen,
    onOpenChange: onTransferOpenChange,
  } = useDisclosure();
  const [negativeStockMessage, setNegativeStockMessage] = useState("");
  const [pendingSubmitValue, setPendingSubmitValue] = useState("");

  const type = product.product?.type || "variableQuantityPerItem";

  // Override input disabled state specifically for fixedQuantityPerItem on purchases/inflows
  let finalIsInputEnabled = isInputEnabled;
  if (
    type === "fixedQuantityPerItem" &&
    document &&
    (document.type === "purchase" || document.type === "in")
  ) {
    finalIsInputEnabled = true;
  }

  let placeholderText = "Escanear código de barras o cantidad";
  if (type === "fixedQuantityPerItem")
    placeholderText = "Ingresar cantidad en bulto a reservar";
  if (type === "cutItem") placeholderText = "Ingresar metros/cantidad a cortar";
  if (type === "service") placeholderText = "Ingresar cantidad";

  const submitItem = async (value, forceNegativeStock = false) => {
    let result;
    if (type === "fixedQuantityPerItem") {
      const count = Number(value);
      if (!count || count <= 0) {
        addToast({
          title: "Error",
          description: "Ingrese una cantidad válida",
          color: "danger",
        });
        return;
      }
      if (onHeaderScan) {
        // En ventas y salidas: replace: true instruye al backend a cancelar la reserva
        // anterior y crear una nueva con el nuevo count (operación atómica en una sola transacción).
        result = await onHeaderScan(document.id, {
          product: product.product.id,
          item: { count, replace: true },
        });
      } else {
        // Compras e ingresos generan localmente
        let nextItemNumber = "1";
        let defaultLotNumber = "1";

        const generatedItems = [];
        let currentItemNumber = parseInt(nextItemNumber, 10);
        for (let i = 0; i < count; i++) {
          generatedItems.push({
            id: uuidv4(),
            currentQuantity: "1",
            lotNumber: defaultLotNumber,
            itemNumber: String(currentItemNumber + i),
          });
        }
        
        result = {
          success: true,
          data: generatedItems,
        };
      }
    } else if (type === "cutItem") {
      const quantity = Number(value);
      if (!quantity || quantity <= 0) {
        addToast({
          title: "Error",
          description: "Ingrese una cantidad válida",
          color: "danger",
        });
        return;
      }
      result = await onHeaderScan(document.id, {
        product: product.product.id,
        item: {
          quantity,
          requestedPackages: 1,
          confirmNegativeStock: forceNegativeStock,
        },
      });
    } else if (type === "service") {
      const quantity = Number(value);
      if (!quantity || quantity <= 0) {
        addToast({
          title: "Error",
          description: "Ingrese una cantidad válida",
          color: "danger",
        });
        return;
      }
      result = await onHeaderScan(document.id, {
        product: product.product.id,
        item: { quantity },
      });
    } else {
      const { barcode, quantity } = parseItemData(value);
      result = await onHeaderScan(document.id, {
        product: product.product.id,
        item: {
          barcode,
          quantity,
          product: product.product.id,
          warehouse: document.sourceWarehouse?.id,
        },
      });
    }

    if (result?.success && result?.data) {
      const newItem = result.data;
      setDocument((prev) => {
        const productIndex = prev.orderProducts.findIndex(
          (p) => p.id === product.id,
        );
        if (productIndex === -1) return prev;
        const currentProduct = prev.orderProducts[productIndex];

        let newItems = [...(currentProduct.items || [])];
        if (type === "fixedQuantityPerItem" && Array.isArray(newItem)) {
          // Purchase: entering a new number REPLACES the generated list
          newItems = [...newItem];
        } else if (
          type === "fixedQuantityPerItem" &&
          newItem?.count !== undefined &&
          !Array.isArray(newItem)
        ) {
          // Sale/out bulk reserve (replace behavior): backend unreserved all existing items
          // and reserved a new batch. confirmedQuantity = the new count, not cumulative.
          const newOrderProducts = [...prev.orderProducts];
          newOrderProducts[productIndex] = {
            ...currentProduct,
            confirmedQuantity: newItem.count,
          };
          return {
            ...prev,
            state: prev.state === "draft" ? "confirmed" : prev.state,
            orderProducts: newOrderProducts,
          };
        } else {
          if (newItem.quantity && !newItem.currentQuantity) {
            newItem.currentQuantity = newItem.quantity;
          }
          newItems.push(newItem);
        }

        const newConfirmedQuantity =
          Math.round(
            newItems.reduce(
              (sum, item) =>
                sum +
                (Number(
                  item.quantity || item.currentQuantity || item.count || 1,
                ) || 0),
              0,
            ) * 100,
          ) / 100;

        const newOrderProducts = [...prev.orderProducts];
        newOrderProducts[productIndex] = {
          ...currentProduct,
          items: newItems,
          confirmedQuantity: newConfirmedQuantity,
        };

        let newState = prev.state;
        if (prev.state === "draft") {
          newState = "confirmed";
        }

        return {
          ...prev,
          state: newState,
          orderProducts: newOrderProducts,
        };
      });

      if (type === "fixedQuantityPerItem" && Array.isArray(result.data)) {
        // Purchase/in: locally generated items replaced — reset pagination
        onItemsReplaced?.();
      }
      if (
        type === "fixedQuantityPerItem" &&
        !Array.isArray(result.data) &&
        result.data?.count !== undefined
      ) {
        // Sale/out: backend bulk-reserved items → trigger accordion refetch to show them
        onItemsReserved?.();
      }

      addToast({
        title: "Agregado",
        description: "El item/cantidad ha sido agregado correctamente",
        color: "success",
      });
    } else {
      if (result?.error) {
        throw result?.error;
      }
      addToast({
        title: "Error al agregar",
        description: "El Item no está disponible o hubo un error",
        color: "danger",
      });
    }
  };

  const handleKeyDown = async (e) => {
    // If it's not Enter, return.
    // If onHeaderScan is missing AND it's not the specific case we handle locally (fixedQuantityPerItem), return.
    if (e.key !== "Enter") return;
    if (!onHeaderScan && type !== "fixedQuantityPerItem") return;

    // Guardamos el valor antes de limpiar el input para poder reintentar si falla
    const scannedValue = inputValue;
    setInputValue("");
    try {
      await submitItem(scannedValue);
    } catch (error) {
      console.error(error);
      try {
        const errObj = JSON.parse(error.message);
        if (errObj.code === "NEGATIVE_STOCK") {
          setNegativeStockMessage(errObj.message);
          setPendingSubmitValue(scannedValue);
          onOpen();
          return;
        }
      } catch (err) {}
      addToast({
        title: "Error",
        description: error.message || "Error al agregar",
        color: "danger",
      });
    }
  };

  const showNationalization =
    document?.type === "purchase" &&
    document?.destinationWarehouse?.type === "freeTradeZone";
  const ftzWarehouseId = document?.destinationWarehouse?.id;
  const nationalizedCount = showNationalization
    ? (product.items || []).filter(
        (i) => i.warehouse?.id && i.warehouse.id !== ftzWarehouseId,
      ).length
    : 0;
  const inProgressCount = showNationalization
    ? (product.items || []).filter(
        (i) => i.state === "reserved" && i.warehouse?.id === ftzWarehouseId,
      ).length
    : 0;

  return (
    <div className="flex  flex-col justify-between gap-2">
      <div className="flex flex-row gap-2 align-middle justify-between">
        <div className="flex flex-row gap-2 align-middle flex-wrap">
          <h3 className="text-sm self-center lg:font-bold">{product.name}</h3>
          <Chip
            color={isCompleted ? "success" : "warning"}
            className="self-center md:flex hidden"
            size="sm"
          >
            {isCompleted ? "Completado" : "Pendiente"}
          </Chip>
          {showNationalization && nationalizedCount > 0 && (
            <Chip
              color="success"
              variant="flat"
              className="self-center md:flex hidden"
              size="sm"
            >
              {nationalizedCount} Nacionalizado{nationalizedCount !== 1 ? "s" : ""}
            </Chip>
          )}
          {showNationalization && inProgressCount > 0 && (
            <Chip
              color="warning"
              variant="flat"
              className="self-center md:flex hidden"
              size="sm"
            >
              {inProgressCount} En Proceso
            </Chip>
          )}
        </div>
        <Input
          placeholder={finalIsInputEnabled ? placeholderText : ""}
          type={
            type === "fixedQuantityPerItem" || type === "cutItem"
              ? "number"
              : "text"
          }
          size="md"
          value={inputValue}
          onValueChange={setInputValue}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="hidden md:flex lg:max-w-md max-w-[200px]"
          disabled={!finalIsInputEnabled}
        />
      </div>
      <div className="flex flex-col md:flex-row gap-2">
        <span className="text-xs text-zinc-500 text-start">
          Cantidad {format(product.confirmedQuantity)} {product.unit} /{" "}
          {format(product.requestedQuantity)} {product.unit}
        </span>
        <span className="text-xs text-zinc-500">
          Items {type === "fixedQuantityPerItem"
            ? Math.round(product.confirmedQuantity || 0)
            : (product.items || []).length}
        </span>
      </div>
      <Input
        placeholder={finalIsInputEnabled ? placeholderText : ""}
        type={
          type === "fixedQuantityPerItem" || type === "cutItem"
            ? "number"
            : "text"
        }
        size="sm"
        value={inputValue}
        onValueChange={setInputValue}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="md:hidden"
        disabled={!finalIsInputEnabled}
      />
      <Progress
        className="hidden md:flex"
        value={completedPercentage}
        maxValue={100}
        size="sm"
        color={isCompleted ? "success" : "warning"}
        showValueLabel
        label="Progreso"
      />
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Stock Negativo Detectado
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-500">
                  {negativeStockMessage}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancelar
                </Button>
                {/* {product?.product?.parentProduct && (
                  <Button
                    color="secondary"
                    onPress={() => {
                      onClose();
                      onTransferOpen();
                    }}
                  >
                    Transferencia Rápida
                  </Button>
                )} */}
                <Button
                  color="danger"
                  onPress={() => {
                    submitItem(pendingSubmitValue, true);
                    onClose();
                  }}
                >
                  Confirmar Corte
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <QuickTransferModal
        isOpen={isTransferOpen}
        onOpenChange={onTransferOpenChange}
        cutItemProduct={product?.product}
        onTransferComplete={() => submitItem(pendingSubmitValue)}
      />
    </div>
  );
}

function createEmptyItem(defaults = {}) {
  return {
    id: uuidv4(),
    currentQuantity: "",
    lotNumber: defaults.lotNumber || "",
    itemNumber: defaults.itemNumber || "",
  };
}

const PAGE_SIZE = 100;

// PAGE_SIZE must be ≤ maxLimit in adatex-warehouse-server/config/api.js (currently 100)

function PackingListProduct({
  document,
  product,
  setDocument,
  isItemEditable = false,
  onHeaderScan,
  isHeaderInputEnabled = true,
  onRemoveItem,
}) {
  const type = product.product?.type || "variableQuantityPerItem";
  const isFixed = type === "fixedQuantityPerItem";

  const screenSize = useScreenSize();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedItem, setSelectedItem] = useState(null);

  // ── Accordion open state ─────────────────────────────────────────────────────
  // Controls the `enabled` prop of useItems so items are only fetched when the
  // accordion is actually visible. Avoids wasted network requests on mount.
  const [accordionOpen, setAccordionOpen] = useState(false);

  // ── Server page ───────────────────────────────────────────────────────────────
  // fixedQty: current page being displayed (changed by pagination clicks)
  // variableQty: auto-increments while accumulating all pages in sequence
  const [serverPage, setServerPage] = useState(1);

  // ── Variable-item accumulation ────────────────────────────────────────────────
  // variableQty items are collected across all server pages into this ref, then
  // written to document state in one batch once complete. document state is the
  // source of truth for handleItemChange and handleUpdate in the detail pages.
  const variableAccumRef = React.useRef([]);
  const [variableAllLoaded, setVariableAllLoaded] = useState(false);

  // ── Local page (variable only) ────────────────────────────────────────────────
  // After accumulation is complete, the full list is paginated client-side.
  const [localPage, setLocalPage] = useState(1);

  // ── Scalar fields requested from the API ─────────────────────────────────────
  // Only scalar columns — no sub-relations (warehouse, product). This avoids the
  // SQLite "too many SQL variables" limit and keeps the payload lean.
  const ITEM_FIELDS = useMemo(() => [
    "id", "state", "currentQuantity", "lotNumber", "itemNumber",
    "barcode", "alternativeBarcode", "cost", "isInvoiced",
    "cbm", "weight", "isPartition", "partitionNumber",
    "qualityStatus", "qualityNotes", "receiptDate",
  ], []);

  // ── useItems hook ─────────────────────────────────────────────────────────────
  // Single hook for both product types. Differences:
  //   fixedQty:    enabled while accordion is open; serverPage is user-controlled
  //   variableQty: enabled until all pages accumulated; serverPage auto-increments
  //
  // useStrapi re-fetches automatically when queryParams changes (apiUrl changes).
  // When `enabled` toggles false→true with the same URL it does NOT re-fetch
  // (guarded by currentUrlRef), so closing/re-opening the accordion is free.
  const {
    entities: pageItems,
    loading: isLoadingPage,
    isFetching,
    pagination: serverPagination,
    refetch: refetchItems,
  } = useItems(
    {
      filters: { orderProducts: { id: { $eq: product.id } } },
      pagination: { page: serverPage, pageSize: PAGE_SIZE },
      fields: ITEM_FIELDS,
    },
    {
      enabled: accordionOpen && !!product.id && (isFixed || !variableAllLoaded),
    },
  );

  // ── Effect: multi-page accumulation for variable products ─────────────────────
  // Each time a new page arrives: append it, then either load the next page (by
  // incrementing serverPage which triggers a new apiUrl → auto-refetch) or
  // finalize by copying the full accumulated list to document state so that
  // handleItemChange and handleUpdate can read it from product.items.
  useEffect(() => {
    if (isFixed || !pageItems || !accordionOpen || isLoadingPage || isFetching) return;

    if (serverPage === 1) {
      variableAccumRef.current = [...pageItems];
    } else {
      variableAccumRef.current = [...variableAccumRef.current, ...pageItems];
    }

    const pageCount = serverPagination?.pageCount ?? 1;

    if (serverPage < pageCount) {
      setServerPage((prev) => prev + 1);
    } else {
      setVariableAllLoaded(true);
      const allItems = variableAccumRef.current;
      if (allItems.length > 0) {
        setDocument((prev) => {
          const idx = prev.orderProducts.findIndex((op) => op.id === product.id);
          if (idx === -1) return prev;
          const ops = [...prev.orderProducts];
          ops[idx] = { ...ops[idx], items: allItems };
          return { ...prev, orderProducts: ops };
        });
      }
    }
  }, [pageItems, serverPage, serverPagination, isFixed, accordionOpen, isLoadingPage, isFetching, setDocument, product.id]);

  // ── Effect: refetch fixed items after external document update ────────────────
  // After handleUpdate → setDocument(result.data), product.items may gain new
  // entries (ORDER_POPULATE returns item scalars). Detect the length change and
  // refetch the current server page to reflect the updated state.
  const productItemsLen = (product.items || []).length;
  const prevProductItemsLenRef = React.useRef(productItemsLen);
  useEffect(() => {
    if (!isFixed || !accordionOpen) return;
    if (prevProductItemsLenRef.current !== productItemsLen) {
      refetchItems();
    }
    prevProductItemsLenRef.current = productItemsLen;
  }, [productItemsLen, isFixed, accordionOpen, refetchItems]);

  // ── Accordion selection change handler ────────────────────────────────────────
  // Triggers on user open/close. On first open (or re-open for variable), resets
  // state so a fresh load begins from page 1.
  const handleAccordionSelectionChange = useCallback(
    (keys) => {
      const open = keys instanceof Set ? keys.size > 0 : Boolean(keys);
      if (open && !accordionOpen) {
        if (!isFixed) {
          // Reset accumulation for a clean re-load
          variableAccumRef.current = [];
          setVariableAllLoaded(false);
          setServerPage(1);
          setLocalPage(1);
        }
        setAccordionOpen(true);
      }
    },
    [accordionOpen, isFixed],
  );

  // ── handleItemsReplaced: purchase/in fixedQty local generation ───────────────
  // Called after the user types a new count in the PackingList header for a
  // purchase order (items generated locally with UUIDs, not yet saved to server).
  // Resets to page 1 — no server refetch because items don't exist in DB yet.
  const handleItemsReplaced = useCallback(() => {
    setServerPage(1);
  }, []);

  // ── handleItemsReserved: sale/out fixedQty bulk reservation ──────────────────
  // Called after onHeaderScan returns a count summary (backend reserved items in
  // bulk). Resets to page 1 and refetches so the newly reserved items appear.
  const handleItemsReserved = useCallback(() => {
    if (accordionOpen) {
      setServerPage(1);
      refetchItems();
    }
  }, [accordionOpen, refetchItems]);

  // ── Items to render ───────────────────────────────────────────────────────────
  // fixedQty:    pageItems from the hook (server-paginated, ~100 at a time)
  // variableQty: product.items from document state (full list after accumulation)
  const items = isFixed ? (pageItems || []) : (product.items || []);

  // Refs for keyboard navigation
  const inputRefs = React.useRef({});

  // Ghost Row Logic
  const ghostItemRef = React.useRef(null);
  const itemsWithGhost = useMemo(() => {
    // Ghost rows only apply to variable products (fixedQty items are read-only server records)
    if (isFixed || !isItemEditable) return items;

    // Calculate defaults for the ghost item
    let nextItemNumber = "1";
    let defaultLotNumber = "1";

    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      if (lastItem.itemNumber) {
        const lastNum = parseInt(lastItem.itemNumber, 10);
        if (!isNaN(lastNum)) {
          nextItemNumber = String(lastNum + 1);
        }
      }
    }

    // console.log("Calculating Ghost. Items length:", items.length);

    if (items.length === 0) {
      if (!ghostItemRef.current) {
        ghostItemRef.current = createEmptyItem({
          itemNumber: "1",
          lotNumber: "1",
        });
      } else {
        if (
          ghostItemRef.current.itemNumber !== "1" ||
          ghostItemRef.current.lotNumber !== "1"
        ) {
          ghostItemRef.current = createEmptyItem({
            itemNumber: "1",
            lotNumber: "1",
          });
        }
      }
      return [ghostItemRef.current];
    }

    const lastItem = items[items.length - 1];

    // Check if the last item is "filled" enough to warrant a new ghost row.
    // We check if it has ANY value entered by usage (quantity) or if it exists as a "real" item.
    // But since "real" items might just have defaults, we need to be careful.
    // If the last item has ONLY defaults and NO quantity, maybe we treat it as the ghost?
    // But handleItemChange adds it to 'items' as soon as touched.
    // So if I touch it, it becomes real.

    // To prevent "3 ghosts", we ensure we only add 1 ghost at the end.
    // If the last item is effectively a ghost (only defaults, no quantity), do we add another?
    // The user says "se crean 3 ghost". implying we are adding more than 1.
    // This return statement only adds ONE.
    // So 'items' must already contain 2 "ghost-like" items.

    if (
      lastItem.currentQuantity /* || lastItem.lotNumber || lastItem.itemNumber */
    ) {
      // If the last item has data, we append a new ghost.
      // But what if lastItem IS a ghost I just touched?
      // It has lotNumber="1". So this is true.
      // So we add a NEW ghost.

      // This is correct behavior for auto-growing list.
      // The issue might be that the "defaults" (lot=1) make EVERY item look filled.
      // If I have an item with JUST lot=1, is it filled?
      // Yes, because I might want to save it.

      // Stable ID logic:
      if (
        !ghostItemRef.current ||
        items.some((i) => i.id === ghostItemRef.current.id)
      ) {
        ghostItemRef.current = createEmptyItem({
          itemNumber: nextItemNumber,
          lotNumber: defaultLotNumber,
        });
      } else {
        // Ref exists and is not in items. Use it.
        // Update defaults if needed
        if (
          ghostItemRef.current.itemNumber !== nextItemNumber ||
          ghostItemRef.current.lotNumber !== defaultLotNumber
        ) {
          ghostItemRef.current = createEmptyItem({
            itemNumber: nextItemNumber,
            lotNumber: defaultLotNumber,
          });
        }
      }

      return [...items, ghostItemRef.current];
    }
    return items;
  }, [items, isItemEditable]);

  // ── Pagination ────────────────────────────────────────────────────────────────
  // fixedQty:    server returns pageCount via serverPagination
  // variableQty: local computation over the full accumulated list
  const totalPages = isFixed
    ? (serverPagination?.pageCount ?? 1)
    : Math.max(1, Math.ceil(itemsWithGhost.length / PAGE_SIZE));

  const safePage = isFixed
    ? (serverPagination?.page ?? serverPage)
    : Math.min(localPage, totalPages);

  const displayedItems = useMemo(
    () =>
      isFixed
        ? (pageItems || []) // Server already sent this page's items
        : itemsWithGhost.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [isFixed, pageItems, itemsWithGhost, safePage],
  );

  // Clamp localPage when variable list shrinks (e.g. after removeItem)
  useEffect(() => {
    if (!isFixed && safePage !== localPage) setLocalPage(safePage);
  }, [isFixed, safePage, localPage]);

  // Page change handler
  const handlePageChange = useCallback(
    (newPage) => {
      if (isFixed) {
        setServerPage(newPage); // triggers hook re-fetch via apiUrl change
      } else {
        setLocalPage(newPage);  // client-side slice only
      }
    },
    [isFixed],
  );

  // Loading state:
  //   fixedQty:    hook loading flags
  //   variableQty: waiting for accumulation to finish (only while accordion is open)
  const isLoadingItems = isFixed
    ? (isLoadingPage || isFetching)
    : (!variableAllLoaded && accordionOpen);

  // Displayed total count for the accordion footer / subtitle
  const displayTotalItems = isFixed
    ? (serverPagination?.total ?? (product.confirmedQuantity || 0))
    : items.length;

  const showNationalization =
    document?.type === "purchase" &&
    document?.destinationWarehouse?.type === "freeTradeZone";

  const columns = useMemo(() => {
    if (screenSize === "xs" || screenSize === "sm") {
      return [
        { key: "currentQuantity", label: "Cantidad" },
        { key: "more", label: "" },
      ];
    }
    const cols = [
      { key: "currentQuantity", label: "Cantidad" },
      { key: "lotNumber", label: "Lote" },
      { key: "itemNumber", label: "Numero" },
    ];
    if (showNationalization) {
      cols.push({ key: "nationalizationState", label: "Nac." });
    }
    cols.push({ key: "remove", label: "" });
    return cols;
  }, [screenSize, showNationalization]);

  const handleItemChange = useCallback(
    (targetItem, field, value) => {
      setDocument((prev) => {
        const productIndex = prev.orderProducts.findIndex(
          (p) => p.id === product.id,
        );
        if (productIndex === -1) return prev;

        const currentProduct = prev.orderProducts[productIndex];
        const itemIndex = currentProduct.items.findIndex(
          (i) => i.id === targetItem.id,
        );

        let newItems;
        if (itemIndex === -1) {
          // New item (ghost row)
          const newItem = {
            ...targetItem,
            [field]: value,
          };
          newItems = [...currentProduct.items, newItem];
        } else {
          // Existing item
          newItems = currentProduct.items.map((item) =>
            item.id === targetItem.id ? { ...item, [field]: value } : item,
          );
        }

        const newConfirmedQuantity =
          Math.round(
            newItems.reduce(
              (sum, item) => sum + (parseFloat(item.currentQuantity) || 0),
              0,
            ) * 100,
          ) / 100;

        const newOrderProducts = [...prev.orderProducts];
        newOrderProducts[productIndex] = {
          ...currentProduct,
          items: newItems,
          confirmedQuantity: newConfirmedQuantity,
        };

        return {
          ...prev,
          orderProducts: newOrderProducts,
        };
      });
    },
    [product.id, setDocument],
  );

  const removeItem = useCallback(
    async (itemId) => {
      try {
        if (onRemoveItem) {
          await onRemoveItem(document.id, itemId);
        }
        if (isFixed) {
          // For fixed products, items live in pageItems (hook state) not document state.
          // Refetch the current server page to reflect the deletion immediately.
          await refetchItems();
        } else {
          // For variable products, remove the item from document state locally.
          setDocument((prev) => {
            const productIndex = prev.orderProducts.findIndex(
              (p) => p.id === product.id,
            );
            if (productIndex === -1) return prev;
            const currentProduct = prev.orderProducts[productIndex];
            const newItems = currentProduct.items.filter((i) => i.id !== itemId);
            const newConfirmedQuantity =
              Math.round(
                newItems.reduce(
                  (sum, item) => sum + (parseFloat(item.currentQuantity) || 0),
                  0,
                ) * 100,
              ) / 100;
            const newOrderProducts = [...prev.orderProducts];
            newOrderProducts[productIndex] = {
              ...currentProduct,
              items: newItems,
              confirmedQuantity: newConfirmedQuantity,
            };
            return {
              ...prev,
              orderProducts: newOrderProducts,
            };
          });
        }
        addToast({
          title: "Item removido",
          description: "El item se ha removido correctamente",
          color: "warning",
        });
      } catch (error) {
        addToast({
          title: "Error",
          description: error.message,
          color: "danger",
        });
      }
    },
    [product.id, setDocument, onRemoveItem, isFixed, refetchItems],
  );

  const handleOpenModal = (item) => {
    setSelectedItem(item);
    onOpen();
  };

  const handleKeyDown = (e, currentItem, field) => {
    if (e.key === "Enter") {
      e.preventDefault();

      // Find current item index within the current page
      const currentIndex = displayedItems.findIndex(
        (i) => i.id === currentItem.id,
      );

      // Check if there's a next row on this page
      if (currentIndex !== -1 && currentIndex < displayedItems.length - 1) {
        const nextItem = displayedItems[currentIndex + 1];
        const nextInputKey = `${nextItem.id}-${field}`;

        // Focus next input if it exists
        if (inputRefs.current[nextInputKey]) {
          inputRefs.current[nextInputKey].focus();
        }
      }
    }
  };

  const renderCell = (item, columnKey) => {
    switch (columnKey) {
      case "currentQuantity":
        return isItemEditable ? (
          <DebouncedInput
            ref={(el) => {
              if (el) inputRefs.current[`${item.id}-currentQuantity`] = el;
            }}
            initialValue={item.currentQuantity ?? ""}
            onDebouncedChange={(val) =>
              handleItemChange(item, "currentQuantity", val)
            }
            onKeyDown={(e) => handleKeyDown(e, item, "currentQuantity")}
            type="number"
            debounce={150}
          />
        ) : (
          <Input value={item.currentQuantity ?? ""} isReadOnly />
        );
      case "lotNumber":
        return isItemEditable ? (
          <DebouncedInput
            ref={(el) => {
              if (el) inputRefs.current[`${item.id}-lotNumber`] = el;
            }}
            initialValue={item.lotNumber ?? ""}
            onDebouncedChange={(val) =>
              handleItemChange(item, "lotNumber", val)
            }
            onKeyDown={(e) => handleKeyDown(e, item, "lotNumber")}
            debounce={150}
          />
        ) : (
          <Input value={item.lotNumber ?? ""} isReadOnly />
        );
      case "itemNumber":
        return isItemEditable ? (
          <DebouncedInput
            ref={(el) => {
              if (el) inputRefs.current[`${item.id}-itemNumber`] = el;
            }}
            initialValue={item.itemNumber ?? ""}
            onDebouncedChange={(val) =>
              handleItemChange(item, "itemNumber", val)
            }
            onKeyDown={(e) => handleKeyDown(e, item, "itemNumber")}
            debounce={150}
          />
        ) : (
          <Input value={item.itemNumber ?? ""} isReadOnly />
        );
      case "nationalizationState": {
        const ftzId = document?.destinationWarehouse?.id;
        const isNationalized =
          item.warehouse?.id && item.warehouse.id !== ftzId;
        const isInProgress =
          item.state === "reserved" && item.warehouse?.id === ftzId;
        if (isNationalized)
          return (
            <Chip size="sm" color="success" variant="flat">
              Nacionalizado
            </Chip>
          );
        if (isInProgress)
          return (
            <Chip size="sm" color="warning" variant="flat">
              En Proceso
            </Chip>
          );
        return null;
      }
      case "remove":
        return (
          <Button
            color="danger"
            variant="light"
            size="sm"
            onPress={() => removeItem(item.id)}
            isIconOnly
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        );
      case "more":
        return (
          <Button
            isIconOnly
            variant="light"
            size="sm"
            onPress={() => handleOpenModal(item)}
          >
            <EllipsisHorizontalIcon className="w-6 h-6" />
          </Button>
        );
      default:
        return null;
    }
  };

  // Para fixedQty nunca tiene sentido mostrar la lista individual de ítems
  // (pueden ser 50k+). Renderizar solo el header con el input de "definir cantidad".
  // - Con onHeaderScan (ventas/salidas/transferencias): reserva en servidor.
  // - Sin onHeaderScan (compras/ingresos): genera localmente.
  if (isFixed) {
    return (
      <Card shadow="sm" className="p-4">
        <PackingListProductHeader
          document={document}
          product={product}
          onHeaderScan={onHeaderScan}
          isInputEnabled={isHeaderInputEnabled}
          setDocument={setDocument}
          onItemsReplaced={handleItemsReplaced}
          onItemsReserved={handleItemsReserved}
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Accordion
        variant="shadow"
        onSelectionChange={handleAccordionSelectionChange}
      >
        <AccordionItem
          key={`items-${product.id}`}
          title={
            <PackingListProductHeader
              document={document}
              product={product}
              onHeaderScan={onHeaderScan}
              isInputEnabled={isHeaderInputEnabled}
              isItemEditable={isItemEditable}
              setDocument={setDocument}
              onItemsReplaced={handleItemsReplaced}
              onItemsReserved={handleItemsReserved}
            />
          }
          textValue={product.name}
        >
          {type === "service" ? (
            <div className="p-4 text-sm text-center text-zinc-500">
              Este producto no requiere escaneo ni gestión física de inventario.
              Ingrese y confirme su cantidad en el cajón superior.
            </div>
          ) : isLoadingItems ? (
            <div className="p-4 text-sm text-center text-zinc-400">
              Cargando items ({displayTotalItems} en total)…
            </div>
          ) : (
            <>
              <Table shadow="none" classNames={{ wrapper: "p-0" }}>
                <TableHeader columns={columns}>
                  {(column) => (
                    <TableColumn key={column.key}>{column.label}</TableColumn>
                  )}
                </TableHeader>
                <TableBody
                  items={displayedItems}
                  emptyContent={!accordionOpen ? "Abra el acordeón para cargar los items" : "Sin Items"}
                >
                  {(item) => (
                    <TableRow key={item.id}>
                      {(columnKey) => (
                        <TableCell>{renderCell(item, columnKey)}</TableCell>
                      )}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex w-full justify-center pt-2 pb-1">
                  <Pagination
                    isCompact
                    showControls
                    showShadow
                    color="primary"
                    page={safePage}
                    total={totalPages}
                    onChange={handlePageChange}
                  />
                </div>
              )}
              {isFixed && displayTotalItems > 0 && (
                <p className="text-xs text-zinc-400 text-center pb-2">
                  Mostrando {displayedItems.length} de {displayTotalItems} items •
                  Página {serverPagination?.page ?? serverPage} de {serverPagination?.pageCount ?? 1}
                </p>
              )}
            </>
          )}
        </AccordionItem>
      </Accordion>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {isItemEditable ? "Editar Item" : "Detalle del Item"}
              </ModalHeader>
              <ModalBody>
                {selectedItem && (
                  <div className="flex flex-col gap-4">
                    {isItemEditable ? (
                      <DebouncedInput
                        label="Cantidad"
                        initialValue={selectedItem.currentQuantity}
                        onDebouncedChange={(val) =>
                          handleItemChange(selectedItem, "currentQuantity", val)
                        }
                        type="number"
                      />
                    ) : (
                      <Input
                        label="Cantidad"
                        value={selectedItem.currentQuantity}
                        isReadOnly
                      />
                    )}

                    {isItemEditable ? (
                      <DebouncedInput
                        label="Lote"
                        initialValue={selectedItem.lotNumber}
                        onDebouncedChange={(val) =>
                          handleItemChange(selectedItem, "lotNumber", val)
                        }
                      />
                    ) : (
                      <Input
                        label="Lote"
                        value={selectedItem.lotNumber}
                        isReadOnly
                      />
                    )}

                    {isItemEditable ? (
                      <DebouncedInput
                        label="Número"
                        initialValue={selectedItem.itemNumber}
                        onDebouncedChange={(val) =>
                          handleItemChange(selectedItem, "itemNumber", val)
                        }
                      />
                    ) : (
                      <Input
                        label="Número"
                        value={selectedItem.itemNumber}
                        isReadOnly
                      />
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                {isItemEditable && (
                  <Button
                    color="danger"
                    variant="light"
                    onPress={() => {
                      if (selectedItem) removeItem(selectedItem.id);
                      onClose();
                    }}
                  >
                    Eliminar Item
                  </Button>
                )}
                <Button color="primary" onPress={onClose}>
                  Cerrar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

export default function PackingList({
  document,
  setDocument,
  isItemEditable = false,
  onHeaderScan,
  isHeaderInputEnabled = true,
  onRemoveItem,
}) {
  const products = document?.orderProducts.filter((op) => op.product?.id) || [];
  const totalRequested =
    Math.round(
      products.reduce((acc, product) => {
        return acc + (Number(product.requestedQuantity) || 0);
      }, 0) * 100,
    ) / 100;
  const totalConfirmed =
    Math.round(
      products.reduce((acc, product) => {
        return acc + (Number(product.confirmedQuantity) || 0);
      }, 0) * 100,
    ) / 100;
  const totalItems = products.reduce((acc, product) => {
    return acc + (Number((product.items || []).length) || 0);
  }, 0);
  const completedPercentage =
    Math.round(((totalConfirmed / totalRequested) * 100 || 0) * 100) / 100;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header Resumen  */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="px-2 py-2">
          <h3 className="text-sm">Productos</h3>
          <p className="text-lg font-semibold">{products.length || 0}</p>
        </Card>
        <Card className="px-2 py-2">
          <h3 className="text-sm">Items Totales</h3>
          <p className="text-lg font-semibold">{totalItems || 0}</p>
        </Card>
        {unitsAreConsistent(products) && (
          <Card className="px-2 py-2">
            <h3 className="text-sm">Cantidad Confirmada</h3>
            <p className="text-lg font-semibold">
              {format(totalConfirmed)} {products[0]?.unit || ""}
            </p>
          </Card>
        )}
      </div>
      {/* Progreso Global */}
      <Progress
        value={completedPercentage}
        max={100}
        label="Progreso Global"
        showValueLabel
        color="success"
        classNames={{
          label: "text-sm lg:text-base",
          valueLabel: "text-sm lg:text-base",
        }}
      />
      <Divider />
      {/* Tabla de Items de cada producto */}
      {products.map((product, index) => (
        <PackingListProduct
          document={document}
          key={product.id ? `${product.id}-${index}` : `product-${index}`}
          product={product}
          setDocument={setDocument}
          isItemEditable={isItemEditable}
          onHeaderScan={onHeaderScan}
          isHeaderInputEnabled={isHeaderInputEnabled}
          onRemoveItem={onRemoveItem}
        />
      ))}
    </div>
  );
}
