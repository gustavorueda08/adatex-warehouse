"use client";

import { useEffect, useMemo, useState } from "react";
import { useSellers } from "./useSellers";
import { useDebouncedValue } from "./useDebouncedValue";

/**
 * Hook para obtener vendedores con búsqueda y paginación incremental,
 * pensado para usarse en selects con búsqueda remota.
 */
export function useSellerSelector({ pageSize = 25, baseFilters = {} } = {}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [sellerOptions, setSellerOptions] = useState([]);

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
          email: {
            $containsi: debouncedSearch,
          },
        },
        {
          identification: {
            $containsi: debouncedSearch,
          },
        },
      ],
    };
  }, [baseFilters, debouncedSearch]);

  // Reset de página al cambiar la búsqueda
  useEffect(() => {
    setPage(1);
    setSellerOptions([]);
  }, [debouncedSearch]);

  const {
    sellers = [],
    loading,
    isFetching,
    pagination,
  } = useSellers(
    {
      pagination: { page, pageSize },
      sort: ["name:asc"],
      filters,
    },
    {
      keepPreviousData: true,
    }
  );

  const areSellersEqual = (a = [], b = []) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i]?.id !== b[i]?.id) return false;
    }
    return true;
  };

  // Acumular resultados y evitar duplicados al paginar
  useEffect(() => {
    setSellerOptions((prev) => {
      if (page === 1) {
        if (areSellersEqual(prev, sellers)) return prev;
        return sellers;
      }

      const map = new Map(prev.map((s) => [s.id, s]));
      sellers.forEach((s) => {
        if (!map.has(s.id)) {
          map.set(s.id, s);
        }
      });
      const merged = Array.from(map.values());
      if (areSellersEqual(prev, merged)) return prev;
      return merged;
    });
  }, [sellers, page]);

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
    sellers: sellerOptions,
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
