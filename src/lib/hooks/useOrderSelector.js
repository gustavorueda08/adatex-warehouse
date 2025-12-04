import { useState, useEffect } from "react";
import { useOrders } from "@/lib/hooks/useOrders";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

export function useOrderSelector({
  pageSize = 25,
  baseFilters = {},
  populate = [],
} = {}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [orderOptions, setOrderOptions] = useState([]);

  // Construir filtros dinámicos basados en la búsqueda
  const filters = {
    ...baseFilters,
    ...(debouncedSearch
      ? {
          $or: [
            { code: { $containsi: debouncedSearch } },
            { invoiceNumber: { $containsi: debouncedSearch } },
            {
              customer: {
                name: { $containsi: debouncedSearch },
              },
            },
            {
              customer: {
                lastName: { $containsi: debouncedSearch },
              },
            },
            {
              customer: {
                identification: { $containsi: debouncedSearch },
              },
            },
          ],
        }
      : {}),
  };

  const {
    orders = [],
    loading,
    isFetching,
    pagination,
  } = useOrders({
    pagination: { page, pageSize },
    sort: ["updatedAt:desc"],
    filters,
    populate,
  });

  // Resetear opciones y página cuando cambia la búsqueda
  useEffect(() => {
    setPage(1);
    setOrderOptions([]);
  }, [debouncedSearch]);

  // Acumular órdenes para scroll infinito
  useEffect(() => {
    if (orders && orders.length > 0) {
      if (page === 1) {
        setOrderOptions(orders);
      } else {
        setOrderOptions((prev) => {
          const newOrders = orders.filter(
            (newOrder) => !prev.some((p) => p.id === newOrder.id)
          );
          return [...prev, ...newOrders];
        });
      }
    } else if (page === 1 && !loading) {
      setOrderOptions([]);
    }
  }, [orders, page, loading]);

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
    orders: orderOptions,
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
