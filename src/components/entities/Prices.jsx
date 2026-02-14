import { useEntityList } from "@/lib/hooks/useEntityList";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import { TrashIcon } from "@heroicons/react/24/outline";
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Checkbox,
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

function createEmptyPrice() {
  return {
    id: uuidv4(),
    unitPrice: "",
    ivaIncluded: false,
    invoicePercentage: 100,
    product: null,
    key: uuidv4(),
  };
}

const PriceAutocompleteCell = ({ price, onUpdate, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(price?.product?.name || "");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedKey, setSelectedKey] = useState(
    price?.product?.id ? String(price.product.id) : null,
  );

  const { options, isLoading, hasMore, onLoadMore, setSearch } = useEntityList({
    listType: "products",
    filters: (search) => ({
      name: {
        $containsi: search,
      },
    }),
    populate: [],
    selectedOption: price.product || null,
  });

  const [, scrollerRef] = useInfiniteScroll({
    hasMore,
    isEnabled: isOpen,
    shouldUseLoader: false,
    onLoadMore,
  });

  useEffect(() => {
    if (!isFocused && price?.product?.name) {
      setInputValue(price.product.name);
      setSelectedKey(String(price.product.id));
    }
  }, [price, isFocused]);

  const onSelectionChange = (key) => {
    if (!key) return;
    const selectedItem = options.find((item) => item.id == key || item == key);
    if (selectedItem) {
      onUpdate({ ...price, product: selectedItem });
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
      placeholder="Buscar producto"
      onInputChange={onInputChange}
      onSelectionChange={onSelectionChange}
      onOpenChange={setIsOpen}
      onFocus={() => setIsFocused(true)}
      scrollRef={isOpen ? scrollerRef : null}
      onBlur={() => {
        setIsFocused(false);
        if (price?.product?.name) {
          setInputValue(price.product.name);
        }
      }}
      size={screenSize === "lg" ? "md" : "sm"}
      className="md:w-full min-w-[200px]"
      selectedKey={selectedKey}
      aria-label="Seleccionar producto"
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

export default function Prices({ prices = [], setEntity, disabled = false }) {
  const [isMounted, setIsMounted] = useState(false);
  const ghostPriceRef = React.useRef(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const pricesWithGhost = useMemo(() => {
    if (!isMounted || disabled) return prices;

    if (prices.length === 0) {
      if (!ghostPriceRef.current) {
        ghostPriceRef.current = createEmptyPrice();
      }
      return [ghostPriceRef.current];
    }
    const lastPrice = prices[prices.length - 1];
    if (lastPrice.product) {
      if (
        !ghostPriceRef.current ||
        prices.some((p) => p.id === ghostPriceRef.current.id)
      ) {
        ghostPriceRef.current = createEmptyPrice();
      }
      return [...prices, ghostPriceRef.current];
    }
    return prices;
  }, [prices, isMounted, disabled]);

  const updatePrice = (priceId, field, value) => {
    setEntity((prev) => {
      const currentPrices = prev.prices || [];
      const exists = currentPrices.some((p) => p.id === priceId);

      if (exists) {
        if (field === "product") {
          // Check duplicate
          const isDuplicate = currentPrices.some(
            (p) => p.product?.id === value.product?.id && p.id !== priceId,
          );
          if (isDuplicate) return prev;
        }

        const newPrices = currentPrices.map((p) => {
          if (p.id === priceId) {
            if (field === "product") {
              return {
                ...p,
                product: value.product,
                unitPrice: value.unitPrice ?? p.unitPrice,
                invoicePercentage:
                  value.invoicePercentage ?? p.invoicePercentage,
              };
            }
            return { ...p, [field]: value };
          }
          return p;
        });
        return { ...prev, prices: newPrices };
      } else {
        // Ghost row
        const newRow = {
          ...createEmptyPrice(),
          id: priceId,
          [field]: field === "product" ? value.product : value,
        };
        // if product is set, maybe init other fields?
        return { ...prev, prices: [...currentPrices, newRow] };
      }
    });
  };

  const removePrice = (id) => {
    setEntity((prev) => ({
      ...prev,
      prices: prev.prices.filter((p) => p.id !== id),
    }));
  };

  const columns = [
    { key: "product", label: "Producto" },
    { key: "unit", label: "Unidad" },
    { key: "unitPrice", label: "Precio Unitario" },
    { key: "ivaIncluded", label: "IVA Incluido" },
    { key: "invoicePercentage", label: "% Factura" },
    { key: "actions", label: "" },
  ];

  const renderCell = (price, columnKey) => {
    switch (columnKey) {
      case "product":
        return (
          <PriceAutocompleteCell
            price={price}
            onUpdate={(updatedPrice) =>
              updatePrice(price.id, "product", updatedPrice)
            }
            disabled={disabled}
          />
        );
      case "unit":
        return (
          <span className="text-small text-default-500">
            {price.product?.unit || "-"}
          </span>
        );
      case "unitPrice":
        return (
          <DebouncedInput
            initialValue={price.unitPrice}
            onDebouncedChange={(val) => updatePrice(price.id, "unitPrice", val)}
            type="currency"
            disabled={disabled}
          />
        );
      case "ivaIncluded":
        return (
          <Checkbox
            isSelected={price.ivaIncluded}
            onValueChange={(val) => updatePrice(price.id, "ivaIncluded", val)}
            isDisabled={disabled}
          />
        );
      case "invoicePercentage":
        return (
          <DebouncedInput
            initialValue={price.invoicePercentage}
            onDebouncedChange={(val) =>
              updatePrice(price.id, "invoicePercentage", val)
            }
            type="number"
            disabled={disabled}
          />
        );
      case "actions":
        return (
          <Button
            isIconOnly
            color="danger"
            variant="light"
            onPress={() => removePrice(price.id)}
            isDisabled={disabled}
          >
            <TrashIcon className="w-5 h-5" />
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Table aria-label="Tabla de precios" shadow="none">
      <TableHeader columns={columns}>
        {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
      </TableHeader>
      <TableBody items={pricesWithGhost}>
        {(item) => (
          <TableRow key={item.id}>
            {(columnKey) => (
              <TableCell>{renderCell(item, columnKey)}</TableCell>
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
