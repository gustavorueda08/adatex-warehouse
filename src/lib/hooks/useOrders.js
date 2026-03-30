/**
 * @fileoverview Order-specific CRUD hook.
 *
 * Wraps `useStrapi("orders")` and adds custom async methods —
 * `addItem`, `removeItem`, `getInvoices`, `getNationalizableItems`,
 * and `createNationalization` — that call the order custom routes
 * on the Strapi backend.
 */
// src/lib/hooks/useOrdersCRUD.js
"use client";

import { normalizeFilters } from "@/lib/api/strapiQueryBuilder";
import { useStrapi } from "./useStrapi";
import { useCallback, useState } from "react";

/**
 * Hook for fetching and mutating orders, extending `useStrapi("orders")`.
 *
 * Adds three custom methods on top of the standard CRUD operations:
 * - `addItem` — adds a physical item to an existing order
 * - `removeItem` — removes a physical item from an order
 * - `getInvoices` — fetches or downloads invoice files for a completed order
 *
 * @param {Object} [queryParams={}] - Strapi query params forwarded to the GET request.
 * @param {Object} [options={}] - Options forwarded to `useStrapi`.
 * @returns {Object} All fields from `useStrapi` plus `addItem`, `removeItem`,
 *   `getInvoices`, `getNationalizableItems`, `createNationalization`,
 *   `addingItem`, `removingItem`.
 */
export function useOrders(queryParams = {}, options = {}) {
  const strapiResult = useStrapi(
    "orders",
    {
      sort: ["updatedAt:desc"],
      ...queryParams,
    },
    {
      staleTime: 5000, // 1 minuto de caché por defecto
      ...options,
      singularName: "order",
      pluralName: "orders",
      customNormalizer: normalizeFilters,
    },
  );

  const [addingItem, setAddingItem] = useState(false);
  const [removingItem, setRemovingItem] = useState(false);

  /**
   * Adds a physical item to an order via the `/add` custom route.
   * On success the backend emits an `order:item-added` socket event.
   *
   * @param {string|number} orderId - ID of the target order.
   * @param {Object} itemData - `{ product, item: { barcode?, quantity?, warehouse } }`.
   * @param {boolean} [refetch=false] - Re-fetch the orders list after adding.
   * @returns {Promise<{success: boolean, data?: Object, error?: Error}>}
   */
  const addItem = useCallback(
    async (orderId, itemData, refetch = false) => {
      if (!orderId || !itemData) {
        const error = new Error("Order ID e item data son requeridos");
        return { success: false, error };
      }
      setAddingItem(true);
      try {
        const response = await fetch(`/api/strapi/orders/${orderId}/add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: itemData }),
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
        return { success: false, error: err };
      } finally {
        setAddingItem(false);
      }
    },
    [strapiResult.refetch],
  );

  /**
   * Removes a physical item from an order via the `/remove` custom route.
   * On success the backend emits an `order:item-removed` socket event.
   *
   * @param {string|number} orderId - ID of the target order.
   * @param {string|number} itemId - ID of the item to remove.
   * @param {boolean} [refetch=false] - Re-fetch the orders list after removing.
   * @returns {Promise<{success: boolean, data?: Object, error?: Error}>}
   */
  const removeItem = useCallback(
    async (orderId, itemId, refetch = false) => {
      if (!orderId || !itemId) {
        const error = new Error("Order ID e item ID son requeridos");
        return { success: false, error };
      }
      setRemovingItem(true);
      try {
        const response = await fetch(`/api/strapi/orders/${orderId}/remove`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: {
              item: itemId,
            },
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result.error?.message ||
              result.message ||
              `Error ${response.status}: ${response.statusText}`,
          );
        }

        // Refrescar la lista después de remover
        if (refetch) {
          await strapiResult.refetch();
        }

        return { success: true, data: result.data };
      } catch (err) {
        return { success: false, error: err };
      } finally {
        setRemovingItem(false);
      }
    },
    [strapiResult.refetch],
  );

  /**
   * Fetches invoices for a completed order.
   *
   * - If the server responds with JSON, returns `{ success: true, data }`.
   * - If the server responds with a binary file (PDF or ZIP), triggers a
   *   browser download and returns `{ success: true }`.
   *
   * @param {string|number} orderId - ID of the order.
   * @param {boolean} [refetch=false] - Re-fetch the orders list after downloading.
   * @returns {Promise<{success: boolean, data?: Object, error?: Error}>}
   */
  const getInvoices = useCallback(
    async (orderId, refetch = false) => {
      if (!orderId) {
        const error = new Error("Order ID es requerido");
        return { success: false, error };
      }
      try {
        const response = await fetch(`/api/strapi/orders/${orderId}/invoices`, {
          method: "GET",
        });

        const contentType = response.headers.get("content-type");
        const isJson = contentType && contentType.includes("application/json");

        if (isJson) {
          const result = await response.json();
          if (!response.ok) {
            throw new Error(
              result.error?.message ||
                result.message ||
                `Error ${response.status}: ${response.statusText}`,
            );
          }
          return { success: true, data: result.data };
        } else {
          // Es un archivo, procesarlo como blob
          if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
          }

          const blob = await response.blob();

          // Intentar obtener el nombre del archivo del header
          const contentDisposition = response.headers.get(
            "content-disposition",
          );
          let filename = `invoices-${orderId}.zip`; // Default

          if (contentDisposition) {
            const filenameMatch =
              contentDisposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch && filenameMatch[1]) {
              filename = filenameMatch[1];
            }
          } else {
            // Fallback basado en content-type
            if (contentType?.includes("pdf")) {
              filename = `invoice-${orderId}.pdf`;
            }
          }

          // Crear URL y descargar
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          if (refetch) {
            await strapiResult.refetch();
          }

          return { success: true };
        }
      } catch (err) {
        return { success: false, error: err };
      }
    },
    [strapiResult.refetch],
  );
  /**
   * Fetches items available for nationalization from a completed purchase order
   * in a zona franca (free-trade-zone) warehouse.
   *
   * @param {string|number} purchaseOrderId - ID of the completed purchase order.
   * @returns {Promise<{success: boolean, data?: Array, error?: Error}>}
   */
  const getNationalizableItems = useCallback(async (purchaseOrderId) => {
    if (!purchaseOrderId) {
      return { success: false, error: new Error("Purchase order ID es requerido") };
    }
    try {
      const response = await fetch(
        `/api/strapi/orders/${purchaseOrderId}/nationalizable-items`,
        { method: "GET" },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error?.message ||
            result.message ||
            `Error ${response.status}: ${response.statusText}`,
        );
      }
      return { success: true, data: result.data };
    } catch (err) {
      return { success: false, error: err };
    }
  }, []);

  /**
   * Creates a nationalization order that moves items from a zona franca
   * warehouse to a regular stock warehouse.
   *
   * The backend selects items FIFO per product up to the requested quantities.
   * The created order starts in CONFIRMED state, ready to be processed and
   * completed.
   *
   * @param {string|number} purchaseOrderId - ID of the completed purchase order in zona franca.
   * @param {Object} payload
   * @param {number} payload.destinationWarehouseId - ID of the target stock warehouse.
   * @param {Array<{product: number, quantity: number}>} payload.products - Products and quantities to nationalize.
   * @param {string} [payload.notes] - Optional notes.
   * @param {boolean} [refetch=false] - Re-fetch the orders list after creation.
   * @returns {Promise<{success: boolean, data?: Object, error?: Error}>}
   */
  const createNationalization = useCallback(
    async (purchaseOrderId, payload, refetch = false) => {
      if (!purchaseOrderId || !payload) {
        return {
          success: false,
          error: new Error("Purchase order ID y payload son requeridos"),
        };
      }
      try {
        const response = await fetch(
          `/api/strapi/orders/${purchaseOrderId}/nationalize`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result.error?.message ||
              result.message ||
              `Error ${response.status}: ${response.statusText}`,
          );
        }
        if (refetch) {
          await strapiResult.refetch();
        }
        return { success: true, data: result.data };
      } catch (err) {
        return { success: false, error: err };
      }
    },
    [strapiResult.refetch],
  );

  /**
   * Approves or revokes the credit block exception for a sale order (admin only).
   *
   * @param {string|number} orderId - ID of the sale order.
   * @param {boolean} [override=true] - true to approve, false to revoke.
   * @returns {Promise<{success: boolean, data?: Object, error?: Error}>}
   */
  const approveCredit = useCallback(
    async (orderId, override = true) => {
      if (!orderId) {
        return { success: false, error: new Error("Order ID es requerido") };
      }
      try {
        const response = await fetch(
          `/api/strapi/orders/${orderId}/approve-credit`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ override }),
          },
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result.error?.message ||
              result.message ||
              `Error ${response.status}: ${response.statusText}`,
          );
        }
        return { success: true, data: result.data };
      } catch (err) {
        return { success: false, error: err };
      }
    },
    [],
  );

  return {
    ...strapiResult,
    addItem,
    removeItem,
    addingItem,
    removingItem,
    getInvoices,
    getNationalizableItems,
    createNationalization,
    approveCredit,
  };
}
