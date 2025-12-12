import { useState, useMemo, useCallback, useEffect } from "react";
import { useItems } from "./useItems";
import { useDebouncedValue } from "./useDebouncedValue";

/**
 * Hook to manage item selection with server-side search and pagination
 * @param {Object} options
 * @param {string|number} options.warehouseId - Warehouse to filter items by
 * @param {number} options.pageSize - Number of items per page
 * @returns {Object} { items, loading, hasMore, onSearch, onLoadMore }
 */
export function useItemSelector({ warehouseId, productId, pageSize = 20 } = {}) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 500);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pagesData, setPagesData] = useState({});

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
    setPagesData({});
  }, [debouncedSearch, warehouseId]);

  // Construct filters dynamically
  const filters = useMemo(() => {
    const baseFilters = {};
    
    if (warehouseId) {
      baseFilters.warehouse = warehouseId;
    }

    if (productId) {
      baseFilters.product = productId;
    }
    
    // Default: only show available items
    baseFilters.currentQuantity = { $gt: 0 };

    if (!debouncedSearch) {
      return baseFilters;
    }

    const term = debouncedSearch.trim();
    
    // Base search options
    const orFilters = [
        { id: { $eq: term } }, // Exact ID match
        { currentQuantity: { $eq: term } }, // Product Name
    ];

    // If term is a number, allow searching by quantity
    if (!isNaN(term) && term !== "") {
      orFilters.push({ currentQuantity: { $eq: Number(term) } });
    }

    return {
      ...baseFilters,
      $or: orFilters,
    };
  }, [warehouseId, productId, debouncedSearch]);

  const {
    items: entities,
    loading,
    meta,
  } = useItems(
    {
      filters,
      populate: ["product", "warehouse"], // Ensure product details are loaded
      pagination: { page, pageSize },
    },
    {
      enabled: true,
    }
  );

  // Update accumulated data when new page arrives
  useEffect(() => {
    if (!loading && entities) {
      setPagesData((prev) => ({
        ...prev,
        [page]: entities,
      }));
    }
  }, [entities, loading, page]);

  // Flatten pages to single list
  const items = useMemo(() => {
    return Object.keys(pagesData)
      .sort((a, b) => Number(a) - Number(b))
      .flatMap((k) => pagesData[k]);
  }, [pagesData]);

  const hasNextPage = meta?.pagination?.pageCount > page;

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !loading) {
        setPage((p) => p + 1);
    }
  }, [hasNextPage, loading]);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  return {
    items,
    loading,
    loadingMore: loading && page > 1,
    hasMore: hasNextPage,
    onLoadMore: handleLoadMore,
    onSearch: handleSearch,
    searchValue: searchTerm,
  };
}
