import { useState, useEffect } from "react";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

export function useSupplierSelector({
  pageSize = 25,
  baseFilters = {},
  populate = [],
} = {}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [supplierOptions, setSupplierOptions] = useState([]);

  // Construir filtros dinámicos basados en la búsqueda
  const filters = {
    ...baseFilters,
    ...(debouncedSearch
      ? {
          $or: [
            { name: { $containsi: debouncedSearch } },
            { identification: { $containsi: debouncedSearch } },
            { email: { $containsi: debouncedSearch } },
          ],
        }
      : {}),
  };

  const {
    suppliers = [],
    loading,
    isFetching,
    pagination,
  } = useSuppliers({
    pagination: { page, pageSize },
    sort: ["name:asc"],
    filters,
    populate,
  });

  // Resetear opciones y página cuando cambia la búsqueda
  useEffect(() => {
    setPage(1);
    setSupplierOptions([]);
  }, [debouncedSearch]);

  // Acumular proveedores para scroll infinito
  useEffect(() => {
    if (suppliers && suppliers.length > 0) {
      if (page === 1) {
        setSupplierOptions(suppliers);
      } else {
        setSupplierOptions((prev) => {
          const newSuppliers = suppliers.filter(
            (newSupplier) => !prev.some((p) => p.id === newSupplier.id)
          );
          return [...prev, ...newSuppliers];
        });
      }
    } else if (page === 1 && !loading) {
      setSupplierOptions([]);
    }
  }, [suppliers, page, loading]);

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
    suppliers: supplierOptions,
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
