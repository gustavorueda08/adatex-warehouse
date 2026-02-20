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
import React, { useCallback, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import DebouncedInput from "../ui/DebounceInput";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import { parseItemData } from "@/lib/utils/parseItemData";

function PackingListProductHeader({
  document,
  product,
  onHeaderScan,
  isInputEnabled = true,
  setDocument,
}) {
  const isCompleted = product.confirmedQuantity >= product.requestedQuantity;
  const completedPercentage =
    Math.round(
      ((product.confirmedQuantity / product.requestedQuantity) * 100 || 0) *
        100,
    ) / 100;

  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = async (e) => {
    try {
      if (e.key === "Enter" && onHeaderScan) {
        const value = inputValue;
        setInputValue("");
        const { barcode, quantity } = parseItemData(value);
        const result = await onHeaderScan(document.id, {
          product: product.product.id,
          item: {
            barcode,
            quantity,
            product: product.product.id,
            warehouse: document.sourceWarehouse?.id,
          },
        });
        if (result?.success && result?.data) {
          const newItem = result.data;
          setDocument((prev) => {
            const productIndex = prev.orderProducts.findIndex(
              (p) => p.id === product.id,
            );
            if (productIndex === -1) return prev;

            const currentProduct = prev.orderProducts[productIndex];

            // Ensure compatibility with PackingList expected quantity field
            if (newItem.quantity && !newItem.currentQuantity) {
              newItem.currentQuantity = newItem.quantity;
            }

            const newItems = [...(currentProduct.items || []), newItem];

            const newConfirmedQuantity =
              Math.round(
                newItems.reduce(
                  (sum, item) =>
                    sum + (Number(item.quantity || item.currentQuantity) || 0),
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
              state: "confirmed",
              orderProducts: newOrderProducts,
            };
          });

          addToast({
            title: "Item agregado",
            description: "El item ha sido agregado correctamente",
            color: "success",
          });
        } else {
          addToast({
            title: "Error al agregar Item",
            description: "El Item no está disponible o no existe",
            color: "danger",
          });
        }
      }
    } catch (error) {
      console.error(error.message);
    }
  };

  return (
    <div className="flex  flex-col justify-between gap-2">
      <div className="flex flex-row gap-2 align-middle justify-between">
        <div className="flex flex-row gap-2 align-middle">
          <h3 className="text-sm self-center lg:font-bold">{product.name}</h3>
          <Chip
            color={isCompleted ? "success" : "warning"}
            className="self-center md:flex hidden"
            size="sm"
          >
            {isCompleted ? "Completado" : "Pendiente"}
          </Chip>
        </div>
        <Input
          placeholder={
            isInputEnabled ? "Escanear código de barras o cantidad" : ""
          }
          size="md"
          value={inputValue}
          onValueChange={setInputValue}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="hidden md:flex lg:max-w-md max-w-[200px]"
          disabled={!isInputEnabled}
        />
      </div>
      <div className="flex flex-col md:flex-row gap-2">
        <span className="text-xs text-zinc-500 text-start">
          Cantidad {format(product.confirmedQuantity)} {product.unit} /{" "}
          {format(product.requestedQuantity)} {product.unit}
        </span>
        <span className="text-xs text-zinc-500">
          Items {product.items.length}
        </span>
      </div>
      <Input
        placeholder={
          isInputEnabled ? "Escanear código de barras o cantidad" : ""
        }
        size="sm"
        value={inputValue}
        onValueChange={setInputValue}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="md:hidden"
        disabled={!isInputEnabled}
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

function PackingListProduct({
  document,
  product,
  setDocument,
  isItemEditable = false,
  onHeaderScan,
  isHeaderInputEnabled = true,
  onRemoveItem,
}) {
  const { items } = product;
  const screenSize = useScreenSize();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedItem, setSelectedItem] = useState(null);

  // Refs for keyboard navigation
  const inputRefs = React.useRef({});

  // Ghost Row Logic
  const ghostItemRef = React.useRef(null);
  const itemsWithGhost = useMemo(() => {
    if (!isItemEditable) return items;

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

  // Create a ref to store the ghost item to keep its ID stable across renders unless consumed
  // Actually, useMemo creates a new object every time.
  // If we want stable ID, we need to persist the ID for the "next" ghost.
  // But since the ghost is recreated when `items` changes (which is when we consume it),
  // the NEW ghost naturally has a new ID.
  // The OLD ghost (now in items) has its ID preserved in `items`.
  // So focus *should* be preserved.
  // I will add a log to verify IDs.
  // console.log("Items with Ghost IDs:", itemsWithGhost.map(i => i.id));

  const columns = useMemo(() => {
    if (screenSize === "xs" || screenSize === "sm") {
      return [
        { key: "currentQuantity", label: "Cantidad" },
        { key: "more", label: "" },
      ];
    }
    return [
      { key: "currentQuantity", label: "Cantidad" },
      { key: "lotNumber", label: "Lote" },
      { key: "itemNumber", label: "Numero" },
      { key: "remove", label: "" },
    ];
  }, [screenSize]);

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
          // New item (ghost row) - Use the targetItem (ghost) as base to preserve defaults!
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
    [product.id, setDocument, items, onRemoveItem],
  );

  const handleOpenModal = (item) => {
    setSelectedItem(item);
    onOpen();
  };

  const handleKeyDown = (e, currentItem, field) => {
    if (e.key === "Enter") {
      e.preventDefault();

      // Find current item index
      const currentIndex = itemsWithGhost.findIndex(
        (i) => i.id === currentItem.id,
      );

      // Check if there's a next row
      if (currentIndex !== -1 && currentIndex < itemsWithGhost.length - 1) {
        const nextItem = itemsWithGhost[currentIndex + 1];
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

  return (
    <div className="flex flex-col gap-4">
      <Accordion variant="shadow">
        <AccordionItem
          title={
            <PackingListProductHeader
              document={document}
              product={product}
              onHeaderScan={onHeaderScan}
              isInputEnabled={isHeaderInputEnabled}
              isItemEditable={isItemEditable}
              setDocument={setDocument}
            />
          }
          textValue={product.name}
        >
          <Table shadow="none" classNames={{ wrapper: "p-0" }}>
            <TableHeader columns={columns}>
              {(column) => (
                <TableColumn key={column.key}>{column.label}</TableColumn>
              )}
            </TableHeader>
            <TableBody items={itemsWithGhost} emptyContent="Sin Items">
              {(item) => (
                <TableRow key={item.id}>
                  {(columnKey) => (
                    <TableCell>{renderCell(item, columnKey)}</TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
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
    return acc + (Number(product.items.length) || 0);
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
