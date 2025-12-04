"use client";

import { useEffect, useMemo, useState } from "react";
import { useCustomers } from "./useCustomers";
import { useDebouncedValue } from "./useDebouncedValue";

/**
 * Hook para obtener clientes con búsqueda y paginación incremental,
 * pensado para usarse en selects con búsqueda remota.
 */
export function useCustomerSelector({ pageSize = 25, baseFilters = {} } = {}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [customerOptions, setCustomerOptions] = useState([]);

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
          lastName: {
            $containsi: debouncedSearch,
          },
        },
        {
          identification: {
            $containsi: debouncedSearch,
          },
        },
        {
          email: {
            $containsi: debouncedSearch,
          },
        },
      ],
    };
  }, [baseFilters, debouncedSearch]);

  // Reset de página al cambiar la búsqueda
  useEffect(() => {
    setPage(1);
    setCustomerOptions([]);
  }, [debouncedSearch]);

  const {
    customers = [],
    loading,
    isFetching,
    pagination,
  } = useCustomers(
    {
      pagination: { page, pageSize },
      sort: ["name:asc"],
      filters,
      populate: ["prices", "prices.product", "parties"],
    },
    {
      keepPreviousData: true,
    }
  );

  const areCustomersEqual = (a = [], b = []) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i]?.id !== b[i]?.id) return false;
    }
    return true;
  };

  // Acumular resultados y evitar duplicados al paginar
  useEffect(() => {
    setCustomerOptions((prev) => {
      if (page === 1) {
        if (areCustomersEqual(prev, customers)) return prev;
        return customers;
      }

      const map = new Map(prev.map((c) => [c.id, c]));
      customers.forEach((c) => {
        if (!map.has(c.id)) {
          map.set(c.id, c);
        }
      });
      const merged = Array.from(map.values());
      if (areCustomersEqual(prev, merged)) return prev;
      return merged;
    });
  }, [customers, page]);

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
    customers: customerOptions,
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
