"use client";

import React, { useState, useEffect } from "react";
import { useEntityList } from "@/lib/hooks/useEntityList";
import {
  Autocomplete,
  AutocompleteItem,
  Select,
  SelectItem,
} from "@heroui/react";
import DebouncedInput from "@/components/ui/DebounceInput";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import { useInfiniteScroll } from "@heroui/use-infinite-scroll";

const UNIT_OPTIONS = [
  { key: "kg", label: "Kilogramo (kg)" },
  { key: "m", label: "Metro (m)" },
  { key: "unit", label: "Unidad (und)" },
  { key: "piece", label: "Pieza" },
  { key: "roll", label: "Rollo" },
];

export default function TransformationFactorsManager({
  product,
  setProduct,
  disabled = false,
}) {
  const screenSize = useScreenSize();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // We only track ONE factor per product actively, even though it's sent as an array
  const currentFactor =
    product?.transformationFactors && product.transformationFactors.length > 0
      ? product.transformationFactors[product.transformationFactors.length - 1]
      : null;

  // Derive if we are in "creation mode" (meaning the user typed a name that does not exist directly)
  const isCreatingNew =
    currentFactor && !currentFactor.id && currentFactor.name;

  const { options, isLoading, hasMore, onLoadMore, setSearch } = useEntityList({
    listType: "transformation-factors",
    filters: (search) => ({
      name: {
        $containsi: search,
      },
    }),
    populate: [],
  });

  const [, scrollerRef] = useInfiniteScroll({
    hasMore,
    isEnabled: isOpen,
    shouldUseLoader: false,
    onLoadMore,
  });

  // Keep input value in sync when the factor changes externally
  useEffect(() => {
    if (!isFocused && currentFactor?.name) {
      setInputValue(currentFactor.name);
    } else if (!isFocused && !currentFactor) {
      setInputValue("");
    }
  }, [currentFactor, isFocused]);

  const onSelectionChange = (key) => {
    if (!key) {
      // User cleared the input
      setInputValue("");
      setProduct({ ...product, transformationFactors: [] });
      setIsFocused(false);
      return;
    }

    const selectedItem = options.find(
      (item) => String(item.id) === String(key) || item === key,
    );

    if (selectedItem) {
      // User selected an existing item
      setInputValue(selectedItem.name);
      setProduct({
        ...product,
        transformationFactors: [{ ...selectedItem }],
      });
    } else {
      // User typed a brand new name and hit enter, triggering a selection of the typed text
      // (This works well if `allowsCustomValue` is on, or we catch it in onInputChange)
      setInputValue(String(key));
      setProduct({
        ...product,
        transformationFactors: [
          {
            name: String(key),
            sourceUnit: product.unit || "m",
            destinationUnit: "unit",
            factor: 1,
            // no ID -> backend will create it
          },
        ],
      });
    }
    setIsFocused(false);
    setIsOpen(false);
  };

  const onInputChange = (value) => {
    setInputValue(value);
    if (isFocused) {
      setSearch(value);

      // If the user is typing something that doesn't match the current factor, assume they are making a new one
      if (value !== currentFactor?.name) {
        setProduct({
          ...product,
          transformationFactors: [
            {
              name: value,
              sourceUnit: product.unit || "m",
              destinationUnit: "unit",
              factor: 1,
            },
          ],
        });
      }
    }
  };

  const handleUpdateNewField = (field, value) => {
    if (!currentFactor) return;
    setProduct({
      ...product,
      transformationFactors: [{ ...currentFactor, [field]: value }],
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Target the autocomplete container */}
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Buscar o crear Factor de Transformación
        </label>
        <Autocomplete
          allowsCustomValue
          inputValue={inputValue}
          isLoading={isLoading}
          items={options}
          placeholder="Escribe el nombre de un factor existente o uno nuevo..."
          onInputChange={onInputChange}
          onSelectionChange={onSelectionChange}
          onOpenChange={setIsOpen}
          onFocus={() => setIsFocused(true)}
          scrollRef={isOpen ? scrollerRef : null}
          onBlur={() => {
            setIsFocused(false);
          }}
          size={screenSize === "lg" ? "md" : "sm"}
          className="w-full"
          selectedKey={currentFactor?.id ? String(currentFactor.id) : null}
          isDisabled={disabled}
        >
          {(item) => (
            <AutocompleteItem key={item.id} textValue={item.name}>
              {item.name}
              <span className="text-gray-500 text-xs ml-2">
                ({item.factor} {item.sourceUnit} → {item.destinationUnit})
              </span>
            </AutocompleteItem>
          )}
        </Autocomplete>
        {currentFactor?.id && (
          <p className="mt-2 text-sm text-success-500">
            ✓ Factor existente enlazado: {currentFactor.factor}{" "}
            {currentFactor.sourceUnit} = 1 {currentFactor.destinationUnit}
          </p>
        )}
      </div>

      {isCreatingNew && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-neutral-800 p-4 rounded-lg border border-neutral-700">
          <div className="col-span-1 md:col-span-3">
            <h4 className="text-sm font-medium text-blue-400">
              Creando Nuevo Factor: {currentFactor.name}
            </h4>
            <p className="text-xs text-gray-400">
              Se creará este nuevo factor automáticamente al guardar el
              producto.
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Unidad Origen
            </label>
            <Select
              selectedKeys={[currentFactor.sourceUnit]}
              onChange={(e) =>
                handleUpdateNewField("sourceUnit", e.target.value)
              }
              size="sm"
              isDisabled={disabled}
            >
              {UNIT_OPTIONS.map((opt) => (
                <SelectItem key={opt.key}>{opt.label}</SelectItem>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Unidad Destino (Salida)
            </label>
            <Select
              selectedKeys={[currentFactor.destinationUnit]}
              onChange={(e) =>
                handleUpdateNewField("destinationUnit", e.target.value)
              }
              size="sm"
              isDisabled={disabled}
            >
              {UNIT_OPTIONS.map((opt) => (
                <SelectItem key={opt.key}>{opt.label}</SelectItem>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Factor Relacional (Cantidad Mínima Origen)
            </label>
            <DebouncedInput
              initialValue={currentFactor.factor}
              onDebouncedChange={(val) => handleUpdateNewField("factor", val)}
              type="number"
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}
