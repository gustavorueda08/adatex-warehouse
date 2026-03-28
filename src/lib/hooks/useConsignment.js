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
        `/api/strapi/customers/${customerId}/consignment-balance?${params.toString()}`,
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
        `/api/strapi/customers/${customerId}/consignment-history?${params.toString()}`,
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
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `/api/strapi/orders/${orderId}/invoiceable-items`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result || typeof result !== "object") {
        throw new Error("Respuesta inválida del servidor");
      }

      setItems(result.data ?? null);
    } catch (err) {
      console.error("Error fetching invoiceable items:", err);
      setError(err.message);
    } finally {
      setLoading(false);
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
      const response = await fetch("/api/strapi/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(
          result.error?.message ||
            `Error ${response.status}: ${response.statusText}`,
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
        },
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(
          result.error?.message ||
            `Error ${response.status}: ${response.statusText}`,
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

/**
 * Hook para obtener items facturables de un cliente (múltiples órdenes)
 * @param {number} customerId - ID del cliente
 * @param {Object} options - Opciones del hook
 * @returns {Object} Estado y funciones del hook
 */
export function useCustomerInvoiceableItems(customerId, options = {}) {
  const { enabled = true } = options;

  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchItems = async () => {
    if (!customerId || !enabled) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch completed/confirmed sale orders for this customer
      // We need orders that have dispatched items but not fully invoiced.
      // Usually "completed" means dispatched.
      // We'll filter items client-side or use a custom endpoint if needed.
      // For now, let's try standard Strapi filtering.

      const qs = new URLSearchParams({
        "filters[customer][id][$eq]": customerId,
        "filters[type][$eq]": "sale",
        "filters[state][$in][0]": "completed",
        "filters[state][$in][1]": "confirmed", // Just in case
        "populate[orderProducts][populate][items]": "true",
        "populate[orderProducts][populate][product]": "true",
        "pagination[limit]": "100", // Careful with limits
      });

      const response = await fetch(`/api/strapi/orders?${qs.toString()}`);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const orders = result.data || [];

      // 2. Aggregate items
      const productMap = new Map();

      orders.forEach((order) => {
        if (!order.orderProducts) return;

        order.orderProducts.forEach((op) => {
          if (!op.product || !op.items) return;

          const productId = op.product.id;

          if (!productMap.has(productId)) {
            productMap.set(productId, {
              product: op.product,
              items: [],
            });
          }

          const entry = productMap.get(productId);

          // Filter items that are NOT invoiced
          const validItems = op.items.filter(
            (item) => !item.isInvoiced && item.quantity > 0,
          );

          validItems.forEach((item) => {
            entry.items.push({
              ...item,
              // Add context if needed?
              orderId: order.id,
              orderCode: order.code,
              price: op.price, // Important: passing the price from OrderProduct
            });
          });
        });
      });

      // Filter products with no valid items
      const products = Array.from(productMap.values()).filter(
        (p) => p.items.length > 0,
      );

      setItems({
        products,
        summary: {
          totalProducts: products.length,
          totalItems: products.reduce((acc, p) => acc + p.items.length, 0),
        },
      });
    } catch (err) {
      console.error("Error fetching customer invoiceable items:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, enabled]);

  return {
    items,
    loading,
    error,
    refetch: fetchItems,
  };
}
