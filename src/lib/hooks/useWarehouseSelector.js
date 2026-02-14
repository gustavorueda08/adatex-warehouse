"use client";

import { useEffect, useMemo, useState } from "react";
import { useWarehouses } from "./useWarehouses";
import { useDebouncedValue } from "./useDebouncedValue";

/**
 * Hook para obtener bodegas con búsqueda y paginación incremental,
 * pensado para usarse en selects con búsqueda remota.
 */
export function useWarehouseSelector({ pageSize = 25, baseFilters = {} } = {}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [warehouseOptions, setWarehouseOptions] = useState([]);

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
    setWarehouseOptions([]);
  }, [debouncedSearch]);

  const {
    warehouses = [],
    loading,
    isFetching,
    pagination,
  } = useWarehouses(
    {
      pagination: { page, pageSize },
      sort: ["name:asc"],
      filters,
    },
    {
      keepPreviousData: true,
    },
  );

  const areWarehousesEqual = (a = [], b = []) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i]?.id !== b[i]?.id) return false;
    }
    return true;
  };

  // Acumular resultados y evitar duplicados al paginar
  useEffect(() => {
    setWarehouseOptions((prev) => {
      if (page === 1) {
        if (areWarehousesEqual(prev, warehouses)) return prev;
        return warehouses;
      }

      const map = new Map(prev.map((t) => [t.id, t]));
      warehouses.forEach((t) => {
        if (!map.has(t.id)) {
          map.set(t.id, t);
        }
      });
      const merged = Array.from(map.values());
      if (areWarehousesEqual(prev, merged)) return prev;
      return merged;
    });
  }, [warehouses, page]);

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
    warehouses: warehouseOptions,
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
