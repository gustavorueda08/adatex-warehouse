"use client";

import { useEffect, useMemo, useState } from "react";
import { useProducts } from "./useProducts";
import { useDebouncedValue } from "./useDebouncedValue";

/**
 * Hook para obtener productos con búsqueda y paginación incremental,
 * pensado para usarse en selects con búsqueda remota.
 */
export function useProductSelector({ pageSize = 25, baseFilters = {} } = {}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [productOptions, setProductOptions] = useState([]);

  const filters = useMemo(() => {
    if (!debouncedSearch) return baseFilters;

    return {
      ...baseFilters,
      $or: [
        {
          name: {
            $containsi: debouncedSearch,
          },
        },
        {
          code: {
            $containsi: debouncedSearch,
          },
        },
      ],
    };
  }, [baseFilters, debouncedSearch]);

  // Reset de página al cambiar la búsqueda
  useEffect(() => {
    setPage(1);
    setProductOptions([]);
  }, [debouncedSearch]);

  const { products = [], loading, isFetching, pagination } = useProducts({
    pagination: { page, pageSize },
    sort: ["name:asc"],
    filters,
  });

  const areProductsEqual = (a = [], b = []) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i]?.id !== b[i]?.id) return false;
    }
    return true;
  };

  // Acumular resultados y evitar duplicados al paginar
  useEffect(() => {
    setProductOptions((prev) => {
      if (page === 1) {
        if (areProductsEqual(prev, products)) return prev;
        return products;
      }

      const map = new Map(prev.map((p) => [p.id, p]));
      products.forEach((p) => {
        if (!map.has(p.id)) {
          map.set(p.id, p);
        }
      });
      const merged = Array.from(map.values());
      if (areProductsEqual(prev, merged)) return prev;
      return merged;
    });
  }, [products, page]);

  const hasMore =
    pagination?.page && pagination?.pageCount
      ? pagination.page < pagination.pageCount
      : false;

  const loadMore = () => {
    if (hasMore && !isFetching) {
      setPage((prev) => prev + 1);
    }
  };

  return {
    products: productOptions,
    search,
    setSearch,
    page,
    setPage,
    hasMore,
    loadMore,
    loading,
    loadingMore: isFetching && page > 1,
    pagination,
  };
}
