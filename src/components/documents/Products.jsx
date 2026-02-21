"use client";
import { useEntityList } from "@/lib/hooks/useEntityList";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import {
  EllipsisHorizontalIcon,
  TrashIcon,
  ArrowDownCircleIcon,
} from "@heroicons/react/24/outline";
import { EllipsisHorizontalCircleIcon } from "@heroicons/react/24/solid";
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Checkbox,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalContent,
  useDisclosure,
} from "@heroui/react";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import classNames from "classnames";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import DebouncedInput from "../ui/DebounceInput";
import { useInfiniteScroll } from "@heroui/use-infinite-scroll";

function createEmptyProduct() {
  return {
    id: uuidv4(),
    name: "",
    requestedQuantity: "",
    price: "",
    product: null,
    key: uuidv4(),
    total: "",
    ivaIncluded: false,
    invoicePercentage: 100,
    items: [],
  };
}

const ProductAutocompleteCell = ({
  product,
  onUpdate,
  disabled,
  globalSearch,
  setGlobalSearch,
  selectedProductIds,
}) => {
  const isNewRow = !product?.product?.id;
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(() => {
    if (product?.product?.name) return product.product.name;
    return isNewRow ? globalSearch || "" : "";
  });
  const [isFocused, setIsFocused] = useState(false);
  const [selectedKey, setSelectedKey] = useState(
    product?.product?.id ? String(product.product.id) : null,
  );

  const disabledKeysToUse = useMemo(() => {
    if (!product?.product?.id) return selectedProductIds;
    return selectedProductIds.filter((id) => id !== String(product.product.id));
  }, [selectedProductIds, product?.product?.id]);

  const ignoreNextInputChange = React.useRef(false);

  const { options, isLoading, hasMore, onLoadMore, setSearch } = useEntityList({
    listType: "products",
    filters: (search) => ({
      name: {
        $containsi: search,
      },
    }),
    populate: [],
    selectedOption: product.product || null,
  });

  const [, scrollerRef] = useInfiniteScroll({
    hasMore,
    isEnabled: isOpen,
    shouldUseLoader: false,
    onLoadMore,
  });

  // Sync inputValue when product changes from outside (and not focused)
  useEffect(() => {
    if (!isFocused && product?.product?.name) {
      setInputValue(product.product.name);
      setSelectedKey(String(product.product.id));
    }
  }, [product, isFocused]);

  // Sync globalSearch to new empty rows
  useEffect(() => {
    if (isNewRow && !isFocused) {
      setInputValue(globalSearch || "");
      setSearch(globalSearch || "");
    }
  }, [globalSearch, isNewRow, isFocused, setSearch]);

  const onSelectionChange = (key) => {
    if (!key) return;
    ignoreNextInputChange.current = true;
    const selectedItem = options.find((item) => item.id == key || item == key);
    if (selectedItem) {
      onUpdate(selectedItem);
      setInputValue(selectedItem.name);
      setSelectedKey(String(selectedItem.id));
    }
    setIsFocused(false);
    setIsOpen(false);
  };

  const onInputChange = (value) => {
    setInputValue(value);
    if (isFocused) {
      if (ignoreNextInputChange.current) {
        ignoreNextInputChange.current = false;
        return;
      }
      setSearch(value);
      if (setGlobalSearch) {
        setGlobalSearch(value);
      }
    }
  };

  const screenSize = useScreenSize();

  return (
    <Autocomplete
      inputValue={inputValue}
      isLoading={isLoading}
      items={options}
      placeholder="Buscar producto"
      onInputChange={onInputChange}
      onSelectionChange={onSelectionChange}
      onOpenChange={setIsOpen}
      onFocus={() => setIsFocused(true)}
      scrollRef={isOpen ? scrollerRef : null}
      onBlur={() => {
        setIsFocused(false);
        if (product?.product?.name) {
          setInputValue(product.product.name);
        }
      }}
      size={screenSize === "lg" ? "md" : "sm"}
      className="md:w-full min-w-[250px] px-2   md:px-0  md:min-w-[300px]"
      selectedKey={selectedKey}
      aria-label="Seleccionar producto"
      disabled={disabled}
      isDisabled={disabled}
      disabledKeys={disabledKeysToUse}
    >
      {(item) => (
        <AutocompleteItem key={item.id} textValue={item.name}>
          {item.name}
        </AutocompleteItem>
      )}
    </Autocomplete>
  );
};

const ModalProductCell = ({
  product,
  onFieldChange,
  onRemove,
  onFillValues,
  disabled,
}) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  return (
    <>
      <Button
        isIconOnly
        aria-label="Editar"
        onPress={onOpen}
        variant="light"
        className="self-center"
      >
        <EllipsisHorizontalCircleIcon className="w-6 h-6 self-center m-auto" />
      </Button>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {!disabled ? "Editar " : ""}
                {product.name || "Producto"}
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <DebouncedInput
                      label="Precio"
                      initialValue={product.price}
                      onDebouncedChange={(val) =>
                        onFieldChange(product.id, "price", val)
                      }
                      type="currency"
                      className="flex-1"
                      disabled={disabled}
                    />
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() =>
                        onFillValues(product.id, "price", product.price)
                      }
                      title="Copiar valor hacia abajo"
                      isDisabled={disabled}
                    >
                      <ArrowDownCircleIcon className="w-6 h-6 text-default-400" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      isSelected={product.ivaIncluded}
                      onValueChange={(isSelected) =>
                        onFieldChange(product.id, "ivaIncluded", isSelected)
                      }
                      className="flex-1"
                      isDisabled={disabled}
                    >
                      IVA Incluido
                    </Checkbox>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() =>
                        onFillValues(
                          product.id,
                          "ivaIncluded",
                          product.ivaIncluded,
                        )
                      }
                      title="Copiar valor hacia abajo"
                      isDisabled={disabled}
                    >
                      <ArrowDownCircleIcon className="w-6 h-6 text-default-400" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <DebouncedInput
                      label="Cantidad Requerida"
                      initialValue={product.requestedQuantity}
                      onDebouncedChange={(val) =>
                        onFieldChange(product.id, "requestedQuantity", val)
                      }
                      type="number"
                      className="flex-1"
                      isDisabled={disabled}
                    />
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() =>
                        onFillValues(
                          product.id,
                          "requestedQuantity",
                          product.requestedQuantity,
                        )
                      }
                      title="Copiar valor hacia abajo"
                      isDisabled={disabled}
                    >
                      <ArrowDownCircleIcon className="w-6 h-6 text-default-400" />
                    </Button>
                  </div>
                  <Input
                    label="Cantidad Confirmada"
                    value={product.confirmedQuantity}
                    disabled
                    type="number"
                    isDisabled={disabled}
                  />
                  <div className="flex items-center gap-2">
                    <DebouncedInput
                      label="% Factura"
                      initialValue={product.invoicePercentage}
                      onDebouncedChange={(val) =>
                        onFieldChange(product.id, "invoicePercentage", val)
                      }
                      type="number"
                      className="flex-1"
                      isDisabled={disabled}
                    />
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() =>
                        onFillValues(
                          product.id,
                          "invoicePercentage",
                          product.invoicePercentage,
                        )
                      }
                      title="Copiar valor hacia abajo"
                      isDisabled={disabled}
                    >
                      <ArrowDownCircleIcon className="w-6 h-6 text-default-400" />
                    </Button>
                  </div>
                  <Input
                    label="Unidad"
                    value={product?.product?.unit || ""}
                    disabled
                    isDisabled={disabled}
                  />
                  <Button
                    color="danger"
                    variant="flat"
                    onPress={() => {
                      onRemove(product.id);
                      onClose();
                    }}
                    startContent={<TrashIcon className="w-4 h-4" />}
                    isDisabled={disabled}
                  >
                    Eliminar Producto
                  </Button>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button onPress={onClose} className="w-full">
                  Cerrar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default function Products({
  products = [],
  setDocument,
  columns,
  priceList = [],
  showSmallColumns = false,
  disabled = false,
}) {
  const realScreenSize = useScreenSize();
  const screenSize = showSmallColumns ? "sm" : realScreenSize;
  const [isMounted, setIsMounted] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  const selectedProductIds = useMemo(() => {
    return products
      .filter((p) => p.product?.id)
      .map((p) => String(p.product.id));
  }, [products]);

  // Stable ghost row to prevent infinite re-renders
  const ghostProductRef = React.useRef(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Memoize the list with a ghostly empty row at the bottom
  const productsWithGhost = useMemo(() => {
    if (!isMounted || !setDocument || disabled) return products;

    if (products.length === 0) {
      if (!ghostProductRef.current) {
        ghostProductRef.current = createEmptyProduct();
      }
      return [ghostProductRef.current];
    }
    const lastProduct = products[products.length - 1];
    if (lastProduct.product) {
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

  const tableColumns = useMemo(() => {
    if (columns) return columns;
    console.log(screenSize);

    if (screenSize !== "lg") {
      const cols = [
        {
          key: "name",
          label: "Producto",
        },
      ];
      if (screenSize === "md") {
        cols.push({
          key: "actions",
          label: (
            <div className="flex justify-center w-full">
              <EllipsisHorizontalIcon className="w-6 h-6" />
            </div>
          ),
          align: "center",
        });
      } else {
        cols.push({
          key: "more",
          label: (
            <div className="flex justify-center w-full">
              <EllipsisHorizontalIcon className="w-6 h-6" />
            </div>
          ),
          align: "center",
        });
      }
      return cols;
    }
    return [
      {
        key: "name",
        label: "Producto",
      },
      {
        key: "price",
        label: "Precio",
      },
      {
        key: "ivaIncluded",
        label: "IVA Incluido",
      },
      {
        key: "requestedQuantity",
        label: "Cantidad Requerida",
      },
      {
        key: "confirmedQuantity",
        label: "Cantidad Confirmada",
      },
      {
        key: "items",
        label: "Items Confirmados",
      },
      {
        key: "unit",
        label: "Unidad",
      },
      {
        key: "invoicePercentage",
        label: "%",
      },
      {
        key: "remove",
        label: "",
        align: "center",
      },
    ];
  }, [columns, screenSize]);

  const updateDocumentProduct = (orderProductId, newProductData) => {
    setDocument((prev) => {
      if (!prev) return prev;
      // Find the specific price for this product in the provided priceList
      const specificPrice = priceList.find((p) => {
        const productId = p.product?.id || p.product;
        return String(productId) === String(newProductData.id);
      });

      const price = specificPrice
        ? specificPrice.unitPrice
        : newProductData.price || 0;
      const ivaIncluded = specificPrice
        ? specificPrice.ivaIncluded
        : newProductData.ivaIncluded || false;

      // Check if we are updating an existing product or adding a new one
      const exists = prev.orderProducts.some((op) => op.id === orderProductId);

      if (exists) {
        const newOrderProducts = prev.orderProducts.map((op) => {
          if (op.id === orderProductId) {
            return {
              ...op,
              product: newProductData,
              name: newProductData.name,
              unit: newProductData.unit,
              items: newProductData.items || [],
              price,
              ivaIncluded,
            };
          }
          return op;
        });
        return {
          ...prev,
          orderProducts: newOrderProducts,
          name: newProductData.name,
          unit: newProductData.unit,
          items: newProductData.items || [],
        };
      } else {
        // It's a new product from the ghost row
        const newProductRow = {
          ...createEmptyProduct(), // Ensure it has all base fields
          id: orderProductId, // Use the ID from the ghost row
          product: newProductData,
          price, // Set retrieved price or default
          ivaIncluded, // Set retrieved ivaIncluded or default
          name: newProductData.name,
          unit: newProductData.unit,
          items: newProductData.items || [],
          // Add other default fields mapping here if necessary
        };

        return {
          ...prev,
          orderProducts: [...prev.orderProducts, newProductRow],
        };
      }
    });
  };

  const handleFieldChange = useCallback(
    (id, field, value) => {
      if (!setDocument) return;
      setDocument((prev) => {
        if (!prev) return prev;
        const exists = prev.orderProducts.some((op) => op.id === id);
        if (exists) {
          // Check if value actually changed to avoid unnecessary updates
          const currentOp = prev.orderProducts.find((op) => op.id === id);
          if (currentOp[field] === value) return prev;

          return {
            ...prev,
            orderProducts: prev.orderProducts.map((op) =>
              op.id === id ? { ...op, [field]: value } : op,
            ),
          };
        } else {
          // Handle ghost row interaction
          const newRow = {
            ...createEmptyProduct(),
            id: id,
            [field]: value,
          };
          return {
            ...prev,
            orderProducts: [...prev.orderProducts, newRow],
          };
        }
      });
    },
    [setDocument],
  );

  const fillValuesDown = (currentProductId, field, value) => {
    setDocument((prev) => {
      if (!prev) return prev;
      const currentIndex = prev.orderProducts.findIndex(
        (op) => op.id === currentProductId,
      );
      if (currentIndex === -1) return prev;

      const newOrderProducts = prev.orderProducts.map((op, index) => {
        if (index > currentIndex) {
          // If it's the ghost row (last one and empty), maybe we shouldn't fill it?
          // Or maybe we should? The user said "todas las filas por debajo".
          // Ghost row usually has no product selected.
          // If I fill price/iva on ghost row, it might start looking like a real row.
          // But creating a new row usually resets these or takes default.
          // Let's fill all. If it's a ghost row, it might be fine or we might want to skip.
          // For now, simple map.
          return { ...op, [field]: value };
        }
        return op;
      });

      return {
        ...prev,
        orderProducts: newOrderProducts,
      };
    });
  };

  const removeProduct = (id) => {
    setDocument((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        orderProducts: prev.orderProducts.filter((op) => op.id !== id),
      };
    });
  };

  const renderCell = (orderProduct, columnKey) => {
    switch (columnKey) {
      case "name":
        return (
          <ProductAutocompleteCell
            product={orderProduct}
            onUpdate={(newProduct) =>
              updateDocumentProduct(orderProduct.id, newProduct)
            }
            disabled={!setDocument || disabled}
            globalSearch={globalSearch}
            setGlobalSearch={setGlobalSearch}
            selectedProductIds={selectedProductIds}
          />
        );
      case "price":
        return (
          <div className="flex items-center gap-1">
            <DebouncedInput
              initialValue={orderProduct.price}
              onDebouncedChange={(val) =>
                handleFieldChange(orderProduct.id, "price", val)
              }
              type="currency"
              aria-label="Precio"
              className="max-w-[100px]"
              disabled={!setDocument || disabled}
            />
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() =>
                fillValuesDown(orderProduct.id, "price", orderProduct.price)
              }
              title="Copiar valor hacia abajo"
              className="min-w-unit-6 w-unit-6 h-unit-6"
              isDisabled={!setDocument || disabled}
            >
              <ArrowDownCircleIcon className="w-4 h-4 text-default-400" />
            </Button>
          </div>
        );
      case "ivaIncluded":
        return (
          <div className="flex items-center gap-1">
            <Checkbox
              isSelected={orderProduct.ivaIncluded}
              onValueChange={(isSelected) =>
                handleFieldChange(orderProduct.id, "ivaIncluded", isSelected)
              }
              aria-label="IVA Incluido"
              isDisabled={!setDocument || disabled}
            />
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() =>
                fillValuesDown(
                  orderProduct.id,
                  "ivaIncluded",
                  orderProduct.ivaIncluded,
                )
              }
              title="Copiar valor hacia abajo"
              className="min-w-unit-6 w-unit-6 h-unit-6"
              isDisabled={!setDocument || disabled}
            >
              <ArrowDownCircleIcon className="w-4 h-4 text-default-400" />
            </Button>
          </div>
        );
      case "requestedQuantity":
        return (
          <div className="flex items-center gap-1">
            <DebouncedInput
              initialValue={orderProduct.requestedQuantity}
              onDebouncedChange={(val) =>
                handleFieldChange(orderProduct.id, "requestedQuantity", val)
              }
              type="number"
              aria-label="Cantidad requerida"
              className="max-w-[100px]"
              disabled={!setDocument || disabled}
            />
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() =>
                fillValuesDown(
                  orderProduct.id,
                  "requestedQuantity",
                  orderProduct.requestedQuantity,
                )
              }
              title="Copiar valor hacia abajo"
              className="min-w-unit-6 w-unit-6 h-unit-6"
              isDisabled={!setDocument || disabled}
            >
              <ArrowDownCircleIcon className="w-4 h-4 text-default-400" />
            </Button>
          </div>
        );
      case "confirmedQuantity":
        return (
          <Input
            value={orderProduct.confirmedQuantity}
            disabled={true}
            type="number"
            aria-label="Cantidad confirmada"
            className="max-w-[100px]"
          />
        );
      case "items":
        return orderProduct.items?.length || 0;
      case "unit":
        return orderProduct?.product?.unit || "";
      case "invoicePercentage":
        return (
          <div className="flex items-center gap-1">
            <DebouncedInput
              initialValue={orderProduct.invoicePercentage}
              onDebouncedChange={(val) =>
                handleFieldChange(orderProduct.id, "invoicePercentage", val)
              }
              type="number"
              aria-label="Porcentaje factura"
              className="max-w-20"
              disabled={!setDocument || disabled}
            />
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() =>
                fillValuesDown(
                  orderProduct.id,
                  "invoicePercentage",
                  orderProduct.invoicePercentage,
                )
              }
              title="Copiar valor hacia abajo"
              className="min-w-unit-6 w-unit-6 h-unit-6"
              isDisabled={!setDocument}
            >
              <ArrowDownCircleIcon className="w-4 h-4 text-default-400" />
            </Button>
          </div>
        );
      case "more":
        return (
          <ModalProductCell
            disabled={!setDocument || disabled}
            product={orderProduct}
            onFieldChange={handleFieldChange}
            onRemove={removeProduct}
            onUpdate={(newProduct) =>
              updateDocumentProduct(orderProduct.id, newProduct)
            }
            onFillValues={fillValuesDown}
          />
        );
      case "actions":
        return (
          <div className="flex items-center justify-center gap-2">
            <ModalProductCell
              product={orderProduct}
              onFieldChange={handleFieldChange}
              onRemove={removeProduct}
              onUpdate={(newProduct) =>
                updateDocumentProduct(orderProduct.id, newProduct)
              }
              onFillValues={fillValuesDown}
            />
            <Button
              isIconOnly
              aria-label="Eliminar"
              onPress={() => removeProduct(orderProduct.id)}
              variant="light"
              color="danger"
              isDisabled={!setDocument || disabled}
            >
              <TrashIcon className="w-6 h-6" />
            </Button>
          </div>
        );
      case "remove":
        return (
          <Button
            isIconOnly
            aria-label="Eliminar"
            onPress={() => removeProduct(orderProduct.id)}
            variant="light"
            color="danger"
            isDisabled={!setDocument || disabled}
          >
            <TrashIcon className="w-6 h-6" />
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Table aria-label="Tabla de productos" shadow="none">
      <TableHeader columns={tableColumns}>
        {(column) => (
          <TableColumn key={column.key} align={column.align || "start"}>
            {column.label}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody items={productsWithGhost}>
        {(product) => (
          <TableRow key={product.id}>
            {(columnKey) => (
              <TableCell
                className={classNames(
                  "px-0 md:px-3",
                  (columnKey === "more" || columnKey === "actions") &&
                    "self-center flex justify-center items-center",
                )}
              >
                {renderCell(product, columnKey)}
              </TableCell>
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
