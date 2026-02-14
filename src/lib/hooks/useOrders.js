// src/lib/hooks/useOrdersCRUD.js
"use client";

import { normalizeFilters } from "@/lib/api/strapiQueryBuilder";
import { useStrapi } from "./useStrapi";
import { useCallback, useState } from "react";

export function useOrders(queryParams = {}, options = {}) {
  const strapiResult = useStrapi("orders", queryParams, {
    staleTime: 5000, // 1 minuto de caché por defecto
    ...options,
    singularName: "order",
    pluralName: "orders",
    customNormalizer: normalizeFilters,
  });

  const [addingItem, setAddingItem] = useState(false);
  const [removingItem, setRemovingItem] = useState(false);

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
        console.error("Error adding item:", err);
        return { success: false, error: err };
      } finally {
        setAddingItem(false);
      }
    },
    [strapiResult.refetch],
  );

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
        console.log(result, "RESULTADO");
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
        console.error("Error removing item:", err);
        return { success: false, error: err };
      } finally {
        setRemovingItem(false);
      }
    },
    [strapiResult.refetch],
  );

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
        console.error("Error getting invoices:", err);
        return { success: false, error: err };
      }
    },
    [strapiResult.refetch],
  );
  return {
    ...strapiResult,
    addItem,
    removeItem,
    addingItem,
    removingItem,
    getInvoices,
  };
}
