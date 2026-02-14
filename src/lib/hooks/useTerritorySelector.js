"use client";

import { useEffect, useMemo, useState } from "react";
import { useTerritories } from "./useTerritories";
import { useDebouncedValue } from "./useDebouncedValue";

/**
 * Hook para obtener territorios con búsqueda y paginación incremental,
 * pensado para usarse en selects con búsqueda remota.
 */
export function useTerritorySelector({ pageSize = 25, baseFilters = {} } = {}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [territoryOptions, setTerritoryOptions] = useState([]);

  const filters = useMemo(() => {
    if (!debouncedSearch) return baseFilters;

    return {
      ...baseFilters,
      $or: [
        {
          country: {
            $containsi: debouncedSearch,
          },
        },
        {
          city: {
            $containsi: debouncedSearch,
          },
        },
        {
          state: {
            $containsi: debouncedSearch,
          },
        },
      ],
    };
  }, [baseFilters, debouncedSearch]);

  // Reset de página al cambiar la búsqueda
  useEffect(() => {
    setPage(1);
    setTerritoryOptions([]);
  }, [debouncedSearch]);

  const {
    territories = [],
    loading,
    isFetching,
    pagination,
  } = useTerritories(
    {
      pagination: { page, pageSize },
      sort: ["name:asc"],
      filters,
    },
    {
      keepPreviousData: true,
    },
  );

  const areTerritoriesEqual = (a = [], b = []) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i]?.id !== b[i]?.id) return false;
    }
    return true;
  };

  // Acumular resultados y evitar duplicados al paginar
  useEffect(() => {
    setTerritoryOptions((prev) => {
      if (page === 1) {
        if (areTerritoriesEqual(prev, territories)) return prev;
        return territories;
      }

      const map = new Map(prev.map((t) => [t.id, t]));
      territories.forEach((t) => {
        if (!map.has(t.id)) {
          map.set(t.id, t);
        }
      });
      const merged = Array.from(map.values());
      if (areTerritoriesEqual(prev, merged)) return prev;
      return merged;
    });
  }, [territories, page]);

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
    territories: territoryOptions,
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
