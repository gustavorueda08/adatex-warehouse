// src/lib/hooks/useOrdersCRUD.js
"use client";

import { normalizeFilters } from "@/lib/api/strapiQueryBuilder";
import { useStrapi } from "./useStrapi";
import { useCallback, useState } from "react";

/**
 * Hook unificado para todas las operaciones CRUD de órdenes
 * @param {Object} queryParams - Parámetros para la consulta GET
 * @param {Object} options - Opciones del hook
 * @returns {Object} Estado y funciones del hook
 */
export function useCustomers(queryParams = {}, options = {}) {
  const strapiResult = useStrapi("customers", queryParams, {
    ...options,
    singularName: "customer",
    pluralName: "customers",
    customNormalizer: normalizeFilters,
  });
  const [syncing, setSyncing] = useState(false);

  const syncAllCustomersFromSiigo = useCallback(async (refetch = true) => {
    setSyncing(true);
    try {
      const response = await fetch(`/api/strapi/customers/sync-from-siigo`, {
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
  }, []);

  const getInvoiceableItems = useCallback(async (customerId, params = {}) => {
    const url = new URL(
      `/api/strapi/customers/${customerId}/invoiceable-items`,
      window.location.origin,
    );

    // Append params key-value pairs
    Object.keys(params).forEach((key) => {
      url.searchParams.append(key, params[key]);
    });

    const response = await fetch(url.toString(), {
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
    return result.data;
  }, []);

  return {
    ...strapiResult,
    syncAllCustomersFromSiigo,
    getInvoiceableItems,
    syncing,
  };
}
