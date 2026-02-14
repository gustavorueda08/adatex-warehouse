// src/lib/hooks/useOrdersCRUD.js
"use client";

import { normalizeFilters } from "@/lib/api/strapiQueryBuilder";
import { useStrapi } from "./useStrapi";
import { useState } from "react";

/**
 * Hook unificado para todas las operaciones CRUD de órdenes
 * @param {Object} queryParams - Parámetros para la consulta GET
 * @param {Object} options - Opciones del hook
 * @returns {Object} Estado y funciones del hook
 */
export function useProducts(queryParams = {}, options = {}) {
  const { withInventory, date, fromDate, toDate, ...strapiOptions } = options;
  const endpoint = withInventory ? "products/inventory" : "products";

  const finalQueryParams = { ...queryParams };
  if (date) finalQueryParams.date = date;
  if (fromDate) finalQueryParams.fromDate = fromDate;
  if (toDate) finalQueryParams.toDate = toDate;

  const strapiResult = useStrapi(endpoint, finalQueryParams, {
    ...strapiOptions,
    singularName: "product",
    pluralName: "products",
    customNormalizer: normalizeFilters,
  });
  const [syncing, setSyncing] = useState(false);

  const syncAllProductsFromSiigo = async (refetch = true) => {
    try {
      setSyncing(true);
      const response = await fetch(`/api/strapi/products/sync-from-siigo`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message ||
            result.message ||
            `Error ${response.status}: ${response.statusText}`,
        );
      }
      // Refrescar la lista después de agregar
      if (refetch) {
        await strapiResult.refetch();
      }
      return { success: true, data: result.data };
    } catch (err) {
      console.error("Error adding item:", err);
      return { success: false, error: err };
    } finally {
      setSyncing(false);
    }
  };

  const bulkUpsertProducts = async (products) => {
    try {
      const response = await fetch(`/api/strapi/products/bulk-upsert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: products }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message ||
            result.message ||
            `Error ${response.status}: ${response.statusText}`,
        );
      }
      // Refrescar la lista después de agregar
      await strapiResult.refetch();
      return { success: true, data: result.data };
    } catch (err) {
      console.error("Error in bulk upsert:", err);
      return { success: false, error: err };
    }
  };

  return {
    ...strapiResult,
    syncAllProductsFromSiigo,
    bulkUpsertProducts,
    syncing,
  };
}
