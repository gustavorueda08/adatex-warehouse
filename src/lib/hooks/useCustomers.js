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
    Object.keys(params).forEach((key) => url.searchParams.append(key, params[key]));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message || result.message || `Error ${response.status}`);
    }
    return result.data;
  }, []);

  const getCustomerAccountsReceivable = useCallback(async (customerId, params = {}) => {
    const url = new URL(
      `/api/strapi/customers/${customerId}/accounts-receivable`,
      window.location.origin,
    );
    Object.keys(params).forEach((key) => url.searchParams.append(key, params[key]));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message || result.message || `Error ${response.status}`);
    }
    return result.data;
  }, []);

  const downloadCustomerAccountsReceivable = useCallback(async (customerId, params = {}) => {
    const url = new URL(
      `/api/strapi/customers/${customerId}/accounts-receivable/download`,
      window.location.origin,
    );
    Object.keys(params).forEach((key) => url.searchParams.append(key, params[key]));

    const response = await fetch(url.toString(), { method: "GET" });
    if (!response.ok) throw new Error(`Error ${response.status}`);

    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : `Cartera-${customerId}.${params.format === "pdf" ? "pdf" : "xlsx"}`;

    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }, []);

  const downloadAllAccountsReceivable = useCallback(async (params = {}) => {
    const url = new URL(
      `/api/strapi/siigo/accounts-receivable/download`,
      window.location.origin,
    );
    Object.keys(params).forEach((key) => url.searchParams.append(key, params[key]));

    const response = await fetch(url.toString(), { method: "GET" });
    if (!response.ok) throw new Error(`Error ${response.status}`);

    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : `Cartera-Adatex.${params.format === "pdf" ? "pdf" : "xlsx"}`;

    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }, []);

  return {
    ...strapiResult,
    syncAllCustomersFromSiigo,
    getInvoiceableItems,
    getCustomerAccountsReceivable,
    downloadCustomerAccountsReceivable,
    downloadAllAccountsReceivable,
    syncing,
  };
}
