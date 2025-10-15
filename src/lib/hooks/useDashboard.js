"use client";

import { normalizeFilters } from "@/lib/api/strapiQueryBuilder";
import { useStrapi } from "./useStrapi";

/**
 * Hook unificado para todas las operaciones CRUD de órdenes
 * @param {Object} queryParams - Parámetros para la consulta GET
 * @param {Object} options - Opciones del hook
 * @returns {Object} Estado y funciones del hook
 */
export function useDashboard(queryParams = {}, options = {}) {
  return useStrapi("dashboard", queryParams, {
    ...options,
    singularName: "dashboard",
    pluralName: "dashboard",
    customNormalizer: normalizeFilters,
  });
}
