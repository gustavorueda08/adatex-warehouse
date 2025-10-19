"use client";

import { useState, useEffect } from "react";

/**
 * Hook para gestionar el balance de remisión y facturación parcial
 * @param {number} customerId - ID del cliente
 * @param {Object} options - Opciones del hook
 * @returns {Object} Estado y funciones del hook
 */
export function useConsignmentBalance(customerId, options = {}) {
  const { productId = null, enabled = true } = options;

  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBalance = async () => {
    if (!customerId || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (productId) params.append("product", productId);

      const response = await fetch(
        `/api/strapi/customers/${customerId}/consignment-balance?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setBalance(result.data);
    } catch (err) {
      console.error("Error fetching consignment balance:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, productId, enabled]);

  return {
    balance,
    loading,
    error,
    refetch: fetchBalance,
  };
}

/**
 * Hook para obtener el historial de remisión de un cliente
 * @param {number} customerId - ID del cliente
 * @param {Object} options - Opciones del hook
 * @returns {Object} Estado y funciones del hook
 */
export function useConsignmentHistory(customerId, options = {}) {
  const {
    startDate = null,
    endDate = null,
    productId = null,
    limit = 50,
    enabled = true,
  } = options;

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);

  const fetchHistory = async () => {
    if (!customerId || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (productId) params.append("product", productId);
      if (limit) params.append("limit", limit);

      const response = await fetch(
        `/api/strapi/customers/${customerId}/consignment-history?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setHistory(result.data || []);
      setMeta(result.meta || null);
    } catch (err) {
      console.error("Error fetching consignment history:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, startDate, endDate, productId, limit, enabled]);

  return {
    history,
    meta,
    loading,
    error,
    refetch: fetchHistory,
  };
}

/**
 * Hook para obtener items facturables de una orden
 * @param {number} orderId - ID de la orden
 * @param {Object} options - Opciones del hook
 * @returns {Object} Estado y funciones del hook
 */
export function useInvoiceableItems(orderId, options = {}) {
  const { enabled = true } = options;

  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchItems = async () => {
    if (!orderId || !enabled) {
      console.log("⚠️ useInvoiceableItems: No se puede fetch - orderId:", orderId, "enabled:", enabled);
      setLoading(false);
      return;
    }

    console.log("🔄 useInvoiceableItems: Iniciando fetch para orderId:", orderId);
    setLoading(true);
    setError(null);

    try {
      const url = `/api/strapi/orders/${orderId}/invoiceable-items`;
      console.log("📡 useInvoiceableItems: Fetching:", url);

      const response = await fetch(url);

      console.log("📬 useInvoiceableItems: Response status:", response.status, response.ok);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("✅ useInvoiceableItems: Resultado completo:", result);
      console.log("📦 useInvoiceableItems: result.data:", result.data);
      console.log("📦 useInvoiceableItems: result.data.products:", result.data?.products);

      // Validar estructura de datos
      if (!result || typeof result !== "object") {
        throw new Error("Respuesta inválida del servidor");
      }

      if (!result.data) {
        console.warn("⚠️ useInvoiceableItems: result.data es undefined/null");
        setItems(null);
        return;
      }

      setItems(result.data);
    } catch (err) {
      console.error("❌ useInvoiceableItems: Error fetching invoiceable items:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      console.log("🏁 useInvoiceableItems: Fetch completado");
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, enabled]);

  return {
    items,
    loading,
    error,
    refetch: fetchItems,
  };
}

/**
 * Hook para crear una orden de facturación parcial
 * @returns {Object} Estado y funciones del hook
 */
export function useCreatePartialInvoice() {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Crear factura parcial especificando items por ID
   * @param {Object} data - Datos de la factura parcial
   */
  const createByItems = async (data) => {
    setCreating(true);
    setError(null);

    try {
      console.log("DATOS DE INVOICE", data);

      const response = await fetch("/api/strapi/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(
          result.error?.message ||
            `Error ${response.status}: ${response.statusText}`
        );
      }
      const result = await response.json();
      return { success: true, data: result.data };
    } catch (err) {
      console.error("Error creating partial invoice:", err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setCreating(false);
    }
  };

  /**
   * Crear factura parcial con búsqueda automática FIFO
   * @param {Object} data - Datos de la factura parcial
   */
  const createByQuantity = async (data) => {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/strapi/orders/create-partial-invoice",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(
          result.error?.message ||
            `Error ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();
      return { success: true, data: result.data };
    } catch (err) {
      console.error("Error creating partial invoice:", err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setCreating(false);
    }
  };

  return {
    creating,
    error,
    createByItems,
    createByQuantity,
  };
}
