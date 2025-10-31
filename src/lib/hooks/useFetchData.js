// lib/hooks/useFetchData.js
import { useMemo } from "react";

/**
 * Hook helper para ejecutar data fetchers definidos en el config
 * @param {Object} dataFetchers - Objeto con definiciones de fetchers
 * @returns {Object} Objeto con los datos fetched
 *
 * Ejemplo de dataFetchers:
 * {
 *   customers: { hook: useCustomers, params: { populate: ["prices"] } },
 *   warehouses: { hook: useWarehouses, params: {} },
 * }
 */
export function useFetchData(dataFetchers = {}) {
  const fetchedData = useMemo(() => {
    const results = {};

    Object.entries(dataFetchers).forEach(([key, fetcher]) => {
      if (!fetcher || !fetcher.hook) return;

      // Ejecutar el hook con sus params
      const hookResult = fetcher.hook(fetcher.params || {});

      // El resultado del hook puede ser un objeto con múltiples propiedades
      // Usualmente es algo como { customers: [], loading: false, error: null }
      // Tomamos la propiedad que coincide con el key (plural)
      const dataKey = key; // 'customers', 'warehouses', etc.
      results[dataKey] = hookResult[dataKey] || [];
    });

    return results;
  }, [dataFetchers]);

  return fetchedData;
}
