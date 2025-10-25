"use client";

import { normalizeFilters } from "@/lib/api/strapiQueryBuilder";
import { useStrapi } from "./useStrapi";

/**
 * Hook unificado para todas las operaciones CRUD de órdenes
 * @param {Object} queryParams - Parámetros para la consulta GET
 * @param {Object} options - Opciones del hook
 * @returns {Object} Estado y funciones del hook
 */
export function useCities(queryParams = {}, options = {}) {
  return useStrapi("cities", queryParams, {
    ...options,
    singularName: "city",
    pluralName: "cities",
    customNormalizer: normalizeFilters,
  });
}
