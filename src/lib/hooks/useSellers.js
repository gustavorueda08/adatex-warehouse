// src/lib/hooks/useSellers.js
"use client";

import { normalizeFilters } from "@/lib/api/strapiQueryBuilder";
import { useStrapi } from "./useStrapi";

/**
 * Hook unificado para todas las operaciones CRUD de sellers
 * @param {Object} queryParams - Parámetros para la consulta GET
 * @param {Object} options - Opciones del hook
 * @returns {Object} Estado y funciones del hook
 */
export function useSellers(queryParams = {}, options = {}) {
  return useStrapi("sellers", queryParams, {
    ...options,
    singularName: "seller",
    pluralName: "sellers",
    customNormalizer: normalizeFilters,
  });
}
