"use client";

import React, {
  useMemo,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { Input, Select, SelectItem } from "@heroui/react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEntityList } from "@/lib/hooks/useEntityList";
import { useInfiniteScroll } from "@heroui/use-infinite-scroll";

/**
 * SearchableSelect — Multi/single select (HeroUI Select) with a search
 * input inside the dropdown and async data via useEntityList.
 *
 * API:
 *   - `value`: array of full objects (the source of truth for what's selected)
 *   - `onChange`: (selectedItems: Array) => void — returns full objects
 *
 * Usage:
 *   <SearchableSelect
 *     label="Productos"
 *     listType="products"
 *     selectionMode="multiple"
 *     value={collection.products}           // full objects from server
 *     onChange={(products) => setCollection({ ...collection, products })}
 *     renderItem={(item) => item.name}
 *   />
 */
export default function SearchableSelect({
  label,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",

  // Async mode
  listType,
  filters: externalFilters,
  populate: externalPopulate,
  searchFields = ["name"],

  // Static mode
  items: staticItems,

  // Selection (new simple API)
  selectionMode = "multiple",
  value = [],
  onChange,

  // Rendering
  renderItem,
  itemKey = "id",
  itemLabel = "name",

  // State
  isDisabled = false,
  isRequired = false,
  isLoading: externalLoading,
  className,

  ...rest
}) {
  const isAsync = !!listType;
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const searchRef = useRef(null);

  // Cache the last non-empty options list so we never flash empty
  const cachedItemsRef = useRef([]);

  // ── Build filters function ──
  const filters = useMemo(() => {
    if (typeof externalFilters === "function") return externalFilters;

    return (search) => {
      if (!search) return externalFilters || {};
      return {
        $or: searchFields.map((field) => ({
          [field]: { $containsi: search },
        })),
      };
    };
  }, [externalFilters, searchFields]);

  const populate = useMemo(() => externalPopulate || [], [externalPopulate]);

  // The `value` prop (full objects) is used as `selectedOption` so
  // useEntityList always keeps them in its options array.
  const selectedOption = useMemo(() => {
    if (!value || value.length === 0) return null;
    return value;
  }, [value]);

  // ── Async data source ──
  const {
    options,
    isLoading: asyncLoading,
    hasMore,
    onLoadMore,
    setSearch,
  } = useEntityList({
    listType: listType || "products",
    limit: 20,
    filters,
    populate,
    selectedOption,
    enabled: isAsync,
  });

  const [, scrollerRef] = useInfiniteScroll({
    hasMore: isAsync ? hasMore : false,
    isEnabled: isOpen,
    shouldUseLoader: false,
    onLoadMore: isAsync ? onLoadMore : () => {},
  });

  // ── Helpers ──
  const getLabel = useCallback(
    (item) => {
      if (renderItem) return renderItem(item);
      if (typeof item === "object")
        return item[itemLabel] || String(item[itemKey]);
      return String(item);
    },
    [renderItem, itemLabel, itemKey],
  );

  const getKey = useCallback(
    (item) => {
      if (typeof item === "object") return String(item[itemKey]);
      return String(item);
    },
    [itemKey],
  );

  // ── Derive selectedKeys from value ──
  const selectedKeys = useMemo(() => {
    if (!value || value.length === 0) return new Set();
    return new Set(value.map((item) => getKey(item)));
  }, [value, getKey]);

  // ── Display items: use cached fallback to avoid empty flash ──
  const displayedItems = useMemo(() => {
    if (!isAsync) {
      const source = staticItems || [];
      if (!searchValue) return source;
      const query = searchValue.toLowerCase();
      return source.filter((item) =>
        getLabel(item).toLowerCase().includes(query),
      );
    }

    if (options.length > 0) {
      cachedItemsRef.current = options;
      return options;
    }

    if (cachedItemsRef.current.length > 0) {
      if (!searchValue) return cachedItemsRef.current;
      const query = searchValue.toLowerCase();
      return cachedItemsRef.current.filter((item) =>
        getLabel(item).toLowerCase().includes(query),
      );
    }

    return [];
  }, [isAsync, options, staticItems, searchValue, getLabel]);

  const loading = externalLoading ?? (isAsync ? asyncLoading : false);

  // ── Search ──
  const handleSearchChange = useCallback(
    (v) => {
      setSearchValue(v);
      if (isAsync) setSearch(v);
    },
    [isAsync, setSearch],
  );

  const handleClearSearch = useCallback(
    (e) => {
      e.stopPropagation();
      setSearchValue("");
      if (isAsync) setSearch("");
    },
    [isAsync, setSearch],
  );

  // ── Selection change → resolve full objects and call onChange ──
  const handleSelectionChange = useCallback(
    (keys) => {
      const keySet = new Set(keys);

      // Build a lookup of all known items: options + current value
      const allKnown = isAsync
        ? [...options, ...(value || [])]
        : [...(staticItems || [])];
      const uniqueMap = new Map();
      allKnown.forEach((item) => uniqueMap.set(getKey(item), item));

      // Also include cached items as fallback
      cachedItemsRef.current.forEach((item) => {
        const k = getKey(item);
        if (!uniqueMap.has(k)) uniqueMap.set(k, item);
      });

      const selectedItems = Array.from(uniqueMap.values()).filter((item) =>
        keySet.has(getKey(item)),
      );

      onChange(selectedItems);
    },
    [isAsync, options, staticItems, value, getKey, onChange],
  );

  // ── Open/close ──
  const handleOpenChange = useCallback(
    (open) => {
      setIsOpen(open);
      if (open) {
        setTimeout(() => searchRef.current?.focus(), 50);
      } else {
        setSearchValue("");
        if (isAsync) setSearch("");
      }
    },
    [isAsync, setSearch],
  );

  // ── Render ──
  return (
    <Select
      className={className}
      label={label}
      placeholder={placeholder}
      selectionMode={selectionMode}
      selectedKeys={selectedKeys}
      onSelectionChange={handleSelectionChange}
      onOpenChange={handleOpenChange}
      isOpen={isOpen}
      isDisabled={isDisabled}
      isRequired={isRequired}
      isLoading={loading}
      scrollRef={scrollerRef}
      aria-label={label || "Seleccionar"}
      listboxProps={{
        topContent: (
          <div className="px-1 pt-1 pb-2 sticky top-0 bg-content1 z-20">
            <Input
              ref={searchRef}
              size="sm"
              variant="bordered"
              placeholder={searchPlaceholder}
              value={searchValue}
              onValueChange={handleSearchChange}
              onKeyDown={(e) => e.continuePropagation()}
              startContent={
                <MagnifyingGlassIcon className="w-4 h-4 text-default-400" />
              }
              endContent={
                searchValue ? (
                  <button
                    className="p-0.5 rounded hover:bg-default-200 transition-colors"
                    onClick={handleClearSearch}
                    tabIndex={-1}
                  >
                    <XMarkIcon className="w-3.5 h-3.5 text-default-400" />
                  </button>
                ) : null
              }
              classNames={{
                inputWrapper: "h-8",
                input: "text-sm",
              }}
              aria-label="Buscar opciones"
            />
          </div>
        ),
      }}
      {...rest}
    >
      {displayedItems.map((item) => (
        <SelectItem key={getKey(item)} textValue={getLabel(item)}>
          {getLabel(item)}
        </SelectItem>
      ))}
    </Select>
  );
}
