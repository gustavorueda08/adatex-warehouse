"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Button,
  Input,
  Autocomplete,
  AutocompleteItem,
  useDisclosure,
  Modal,
  ModalContent,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { PlusCircleIcon, TrashIcon } from "@heroicons/react/24/outline";
import { v4 as uuidv4 } from "uuid";
import { useEntityList } from "@/lib/hooks/useEntityList";
import { useInfiniteScroll } from "@heroui/use-infinite-scroll";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import TransformItemSelect from "./TransformItemSelect";
import format from "@/lib/utils/format";
import DebouncedInput from "../ui/DebounceInput";
import classNames from "classnames";

const TransformProductAutocomplete = ({
  product,
  onChange,
  placeholder,
  disabled,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(product?.name || "");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedKey, setSelectedKey] = useState(
    product?.id ? String(product.id) : null,
  );

  const { options, isLoading, hasMore, onLoadMore, setSearch } = useEntityList({
    listType: "products",
    filters: (search) => ({
      name: { $containsi: search },
    }),
    populate: [],
    selectedOption: product || null,
  });

  const [, scrollerRef] = useInfiniteScroll({
    hasMore,
    isEnabled: isOpen,
    shouldUseLoader: false,
    onLoadMore,
  });

  // Sync inputValue when product changes from outside (and not focused)
  useEffect(() => {
    if (!isFocused && product?.name) {
      setInputValue(product.name);
      setSelectedKey(String(product.id));
    }
  }, [product, isFocused]);

  const onSelectionChange = (key) => {
    if (!key) return;
    const selectedItem = options.find((item) => item.id == key || item == key);
    if (selectedItem) {
      onChange(selectedItem);
      setInputValue(selectedItem.name);
      setSelectedKey(String(selectedItem.id));
    }
    setIsFocused(false);
    setIsOpen(false);
  };

  const onInputChange = (value) => {
    setInputValue(value);
    if (isFocused) {
      setSearch(value);
    }
  };

  const screenSize = useScreenSize();

  return (
    <Autocomplete
      inputValue={inputValue}
      isLoading={isLoading}
      items={options}
      placeholder={placeholder || "Buscar producto"}
      onInputChange={onInputChange}
      onSelectionChange={onSelectionChange}
      onOpenChange={setIsOpen}
      onFocus={() => setIsFocused(true)}
      scrollRef={isOpen ? scrollerRef : null}
      onBlur={() => {
        setIsFocused(false);
        if (product?.name) {
          setInputValue(product.name);
        }
      }}
      size={screenSize === "lg" ? "md" : "sm"}
      className={classNames("min-w-[200px]", className)}
      selectedKey={selectedKey}
      aria-label={placeholder || "Seleccionar producto"}
      isDisabled={disabled}
    >
      {(item) => (
        <AutocompleteItem key={item.id} textValue={item.name}>
          {item.name}
        </AutocompleteItem>
      )}
    </Autocomplete>
  );
};

const ItemAutocomplete = ({
  sourceProduct,
  sourceWarehouse,
  item,
  onChange,
  placeholder,
  disabled,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(item?.name || "");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedKey, setSelectedKey] = useState(item?.id || null);

  const { options, isLoading, hasMore, onLoadMore, setSearch } = useEntityList({
    listType: "items",
    filters: (search) => ({
      product: sourceProduct?.id,
      warehouse: sourceWarehouse?.id,
      $or: [
        { barcode: { $containsi: search } },
        { name: { $containsi: search } },
        { currentQuantity: { $containsi: search } },
      ],
    }),
    populate: ["product"],
    selectedOption: item || null,
  });

  const [, scrollerRef] = useInfiniteScroll({
    hasMore,
    isEnabled: isOpen,
    shouldUseLoader: false,
    onLoadMore,
  });

  // Sync inputValue when product changes from outside (and not focused)
  useEffect(() => {
    if (!isFocused && item?.name) {
      setInputValue(item.name);
      setSelectedKey(String(item.id));
    }
  }, [item, isFocused, sourceProduct]);

  const onSelectionChange = (key) => {
    if (!key) return;
    const selectedItem = options.find((item) => item.id == key || item == key);
    if (selectedItem) {
      onChange(selectedItem);
      setInputValue(selectedItem.name);
      setSelectedKey(String(selectedItem.id));
    }
    setIsFocused(false);
    setIsOpen(false);
  };

  const onInputChange = (value) => {
    setInputValue(value);
    if (isFocused) {
      setSearch(value);
    }
  };

  const screenSize = useScreenSize();

  return (
    <Autocomplete
      inputValue={inputValue}
      isLoading={isLoading}
      items={options}
      placeholder={placeholder || "Buscar item"}
      onInputChange={onInputChange}
      onSelectionChange={onSelectionChange}
      onOpenChange={setIsOpen}
      onFocus={() => setIsFocused(true)}
      scrollRef={isOpen ? scrollerRef : null}
      onBlur={() => {
        setIsFocused(false);
        if (item?.name) {
          setInputValue(item.name);
        }
      }}
      size={screenSize === "lg" ? "md" : "sm"}
      className={classNames("min-w-[200px]", className)}
      selectedKey={selectedKey}
      aria-label={placeholder || "Seleccionar item"}
      isDisabled={disabled || (!sourceProduct && !sourceWarehouse)}
    >
      {(item) => (
        <AutocompleteItem key={item.id} textValue={item.name}>
          <div className="flex flex-col">
            <span className="text-small">{item.barcode || item.name}</span>
            <span className="text-tiny text-default-400">
              Cant: {format(item.currentQuantity)} {item.product?.unit}
            </span>
          </div>
        </AutocompleteItem>
      )}
    </Autocomplete>
  );
};

function createEmptyProduct() {
  return {
    id: uuidv4(),
    sourceProduct: null,
    sourceItem: null,
    targetProduct: null,
    sourceQuantity: "",
    targetQuantity: "",
  };
}

function CutItemsModal({
  sourceItem,
  items = [],
  onChange,
  disabled = false,
  availableQuantity = 0,
}) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Stable ghost row to prevent infinite re-renders
  const ghostItemRef = React.useRef({ id: uuidv4(), quantity: "" });

  const itemsWithGhost = useMemo(() => {
    // If we have no items, always show a ghost row
    if (items.length === 0) {
      if (!ghostItemRef.current) {
        ghostItemRef.current = { id: uuidv4(), quantity: "" };
      }
      return [ghostItemRef.current];
    }
    const lastItem = items[items.length - 1];
    // Check if the last row has any relevant data filled to spawn a new ghost row
    if (lastItem.quantity) {
      // Check if ghost was consumed (is now in items array)
      if (
        !ghostItemRef.current ||
        items.some((i) => i.id === ghostItemRef.current.id)
      ) {
        ghostItemRef.current = { id: uuidv4(), quantity: "" };
      }
      return [...items, ghostItemRef.current];
    }
    return items;
  }, [items]);

  const getCutTotal = () => {
    return items.reduce(
      (acc, item) => acc + (parseFloat(item.quantity) || 0),
      0,
    );
  };

  const getSourceQuantity = () => {
    let baseQty = parseFloat(sourceItem?.currentQuantity) || 0;
    // We already passed the product into CutItemsModal, so we need to pass the real consumed amount
    return baseQty; // We will handle total via a prop
  };

  // getRest calculates based on the original available quantity
  const getRest = () => {
    const total = getCutTotal();
    const source = availableQuantity;
    const rest = source - total;
    // Prevent negative display if float issues, though shouldn't happen if logic is sound
    return format(Math.max(0, rest)) + " " + (sourceItem?.product?.unit || "");
  };

  const handleItemChange = (id, value) => {
    onChange((prevItems) => {
      const items = prevItems || [];
      const exists = items.some((i) => i.id === id);
      if (exists) {
        // Update existing item
        return items.map((item) =>
          item.id === id ? { ...item, quantity: value } : item,
        );
      } else {
        // Create new item from ghost
        const newItem = {
          ...(ghostItemRef.current || {}),
          id,
          quantity: value,
        };
        return [...items, newItem];
      }
    });
  };

  const removeItem = (id) => {
    onChange((prevItems) => (prevItems || []).filter((item) => item.id !== id));
  };

  const columns = [
    {
      key: "quantity",
      label: "Cantidad",
    },
    {
      key: "actions",
      label: "",
    },
  ];

  const renderCell = (item, columnKey) => {
    // Check if limit reached (with small epsilon for float precision if needed, but direct compare is usually fine for UI blocking)
    const isLimitReached = getCutTotal() >= getSourceQuantity();

    if (columnKey === "quantity") {
      const isGhost = item.id === ghostItemRef.current?.id;
      return (
        <DebouncedInput
          type="number"
          initialValue={item.quantity}
          onDebouncedChange={(value) => handleItemChange(item.id, value)}
          size="sm"
          placeholder="0"
          autoFocus={isGhost && items.length > 0}
          disabled={disabled}
        />
      );
    }
    if (columnKey === "actions") {
      // Don't show delete for ghost row
      if (item.id === ghostItemRef.current.id) return null;
      return (
        <Button
          isIconOnly
          color="danger"
          variant="light"
          size="sm"
          onPress={() => removeItem(item.id)}
          isDisabled={disabled}
        >
          <TrashIcon className="w-4 h-4" />
        </Button>
      );
    }
    return null;
  };

  return (
    <>
      <div className="flex flex-row gap-2">
        <Input
          placeholder="Cantidad"
          isReadOnly
          value={`${format(getCutTotal())} ${sourceItem?.unit || ""}`}
        />
        <Button
          isIconOnly
          onPress={onOpen}
          isDisabled={disabled ? disabled : sourceItem ? false : true}
        >
          <PlusCircleIcon className="w-5 h-5" />
        </Button>
      </div>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span>Cortes</span>
                <span className="text-tiny text-default-400">
                  Cantidad a cortar: {format(getCutTotal())} /{" "}
                  {format(availableQuantity)} {sourceItem?.product?.unit || ""}
                </span>
                <span className="text-tiny text-default-400">
                  Restante de origen: {getRest()}
                </span>
                {getCutTotal() > availableQuantity && (
                  <span className="text-tiny text-danger font-bold">
                    ¡La cantidad a cortar excede la cantidad esperada!
                  </span>
                )}
              </ModalHeader>
              <ModalBody>
                <Table aria-label="Tabla de cortes">
                  <TableHeader columns={columns}>
                    {(column) => (
                      <TableColumn key={column.key}>{column.label}</TableColumn>
                    )}
                  </TableHeader>
                  <TableBody items={itemsWithGhost}>
                    {(item) => (
                      <TableRow key={item.id}>
                        {(columnKey) => (
                          <TableCell>{renderCell(item, columnKey)}</TableCell>
                        )}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cerrar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

export default function TransformProducts({
  products = [],
  setDocument,
  sourceWarehouse,
  disabled = false,
  transformType = "cut",
}) {
  const [isMounted, setIsMounted] = useState(false);

  // Stable ghost row to prevent infinite re-renders
  const ghostProductRef = React.useRef(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Memoize the list with a ghostly empty row at the bottom
  const productsWithGhost = useMemo(() => {
    if (!isMounted || !setDocument) return products;

    if (products.length === 0) {
      if (!ghostProductRef.current) {
        ghostProductRef.current = createEmptyProduct();
      }
      return [ghostProductRef.current];
    }
    const lastProduct = products[products.length - 1];

    // Check if the last row has any relevant data filled to spawn a new ghost row
    if (lastProduct.sourceProduct || lastProduct.targetProduct) {
      // Check if ghost was consumed (is now in products array)
      if (
        !ghostProductRef.current ||
        products.some((p) => p.id === ghostProductRef.current.id)
      ) {
        ghostProductRef.current = createEmptyProduct();
      }
      return [...products, ghostProductRef.current];
    }
    return products;
  }, [products, isMounted, setDocument]);

  const handleChange = (id, field, value) => {
    setDocument((prev) => {
      // Check if product exists in the list
      const exists = prev.products.some((p) => p.id === id);

      if (exists) {
        // Update existing product
        const newProducts = prev.products.map((p) => {
          if (p.id === id) {
            let newValue = value;
            if (typeof value === "function") {
              newValue = value(p[field]);
            }
            return { ...p, [field]: newValue };
          }
          return p;
        });
        return { ...prev, products: newProducts };
      } else {
        // It's a new product from the ghost row
        let newValue = value;
        if (typeof value === "function") {
          // New product doesn't have previous value, so pass undefined
          newValue = value(undefined);
        }

        const newProduct = {
          ...createEmptyProduct(),
          id: id,
          [field]: newValue,
        };

        return { ...prev, products: [...prev.products, newProduct] };
      }
    });
  };

  const removeRow = (id) => {
    setDocument((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));
  };

  const columns = useMemo(
    () => [
      { key: "sourceProduct", label: "Producto Origen" },
      { key: "sourceItem", label: "Item Origen" },
      { key: "availableQuantity", label: "Cantidad Disponible" },
      ...(transformType === "transform"
        ? [
            { key: "targetProduct", label: "Producto Destino" },
            { key: "sourceQuantity", label: "Cantidad a Consumir" },
          ]
        : []),
      { key: "targetQuantity", label: "Cantidad a Generar" },
      ...(transformType === "cut"
        ? [
            { key: "cutItems", label: "No de Cortes" },
            { key: "rest", label: "Restante" },
          ]
        : []),
      ...(disabled ? [] : [{ key: "actions", label: "" }]),
    ],
    [disabled, transformType],
  );

  const renderCell = (product, columnKey) => {
    let totalConsumedPrev = 0;
    if (transformType === "cut") {
      totalConsumedPrev = (product.items || []).reduce(
        (acc, item) => acc + (parseFloat(item.sourceQuantityConsumed) || 0),
        0,
      );
    } else {
      totalConsumedPrev = parseFloat(
        product._originalItem?.sourceQuantityConsumed || 0,
      );
    }

    switch (columnKey) {
      case "sourceProduct":
        return (
          <TransformProductAutocomplete
            product={product.sourceProduct}
            placeholder="Producto origen"
            disabled={disabled}
            onChange={(value) =>
              handleChange(product.id, "sourceProduct", value)
            }
            className="min-w-[300px]"
          />
        );
      case "sourceItem":
        return (
          <ItemAutocomplete
            sourceProduct={product.sourceProduct}
            sourceWarehouse={sourceWarehouse}
            item={product.sourceItem}
            placeholder="Item origen"
            disabled={disabled}
            onChange={(value) => {
              handleChange(product.id, "sourceItem", value);
            }}
            className="min-w-[300px]"
          />
        );
      case "targetProduct":
        return (
          <TransformProductAutocomplete
            product={product.targetProduct}
            placeholder="Producto destino"
            disabled={disabled}
            onChange={(value) =>
              handleChange(product.id, "targetProduct", value)
            }
            className="min-w-[300px]"
          />
        );
      case "sourceQuantity":
        if (disabled) {
          return <p className="text-sm">{format(product.sourceQuantity)}</p>;
        }
        return (
          <Input
            value={product.sourceQuantity}
            onValueChange={(val) =>
              handleChange(product.id, "sourceQuantity", val)
            }
            type="number"
            size="sm"
            placeholder="0"
          />
        );
      case "targetQuantity":
        if (disabled) {
          return <p className="text-sm">{format(product.targetQuantity)}</p>;
        }
        if (transformType === "cut") {
          return (
            <CutItemsModal
              items={product.items || []}
              sourceItem={product.sourceItem}
              disabled={disabled}
              availableQuantity={
                (product.sourceItem?.currentQuantity || 0) + totalConsumedPrev
              }
              onChange={(newItems) =>
                handleChange(product.id, "items", newItems)
              }
            />
          );
        } else {
          return (
            <Input
              value={product.targetQuantity}
              onValueChange={(val) =>
                handleChange(product.id, "targetQuantity", val)
              }
              type="number"
              size="sm"
              placeholder="0"
            />
          );
        }
      case "availableQuantity":
        return (
          <Input
            value={`${format((product.sourceItem?.currentQuantity || 0) + totalConsumedPrev)} ${product.sourceProduct?.unit || ""}`}
            size="sm"
            isReadOnly
          />
        );
      case "rest":
        const alreadyConsumedInOrder = (product.items || []).reduce(
          (acc, item) => acc + (parseFloat(item.sourceQuantityConsumed) || 0),
          0,
        );
        const sourceCurrent = product.sourceItem?.currentQuantity || 0;
        const totalCut =
          product.items?.reduce(
            (acc, item) => acc + (parseFloat(item.quantity) || 0),
            0,
          ) || 0;
        return (
          <Input
            value={`${format(sourceCurrent + alreadyConsumedInOrder - totalCut)} ${product?.sourceProduct?.unit || ""}`}
            size="sm"
            isReadOnly
          />
        );
      case "actions":
        return (
          <Button
            isIconOnly
            color="danger"
            variant="light"
            size="sm"
            onPress={() => removeRow(product.id)}
            isDisabled={
              productsWithGhost.length === 1 &&
              !product.sourceProduct &&
              !product.targetProduct
            }
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        );
      case "cutItems":
        return (
          <Input
            value={format(product?.items?.length) || format(0)}
            isReadOnly
          />
        );
      default:
        return null;
    }
  };

  return (
    <Table aria-label="Tabla de transformación" shadow="none" className="p-2">
      <TableHeader columns={columns}>
        {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
      </TableHeader>
      <TableBody
        items={productsWithGhost}
        emptyContent="Agrega items para transformar"
      >
        {(product) => (
          <TableRow key={product.id}>
            {(columnKey) => (
              <TableCell>{renderCell(product, columnKey)}</TableCell>
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
