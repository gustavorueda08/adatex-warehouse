"use client";

import { normalizeFilters } from "@/lib/api/strapiQueryBuilder";
import { useStrapi } from "./useStrapi";

/**
 * Hook unificado para todas las operaciones CRUD de órdenes
 * @param {Object} queryParams - Parámetros para la consulta GET
 * @param {string} [queryParams.sellerId] - ID del vendedor para filtrar el dashboard
 * @param {Object} options - Opciones del hook
 * @returns {Object} Estado y funciones del hook
 */
export function useDashboard(queryParams = {}, options = {}) {
  // Extraer sellerId si viene en los filtros o en la raíz
  const { filters = {}, sellerId, ...otherParams } = queryParams;
  const actualSellerId = sellerId || filters.sellerId;

  // Limpiar filtros para no enviar sellerId duplicado o incorrecto en filtros
  const cleanFilters = { ...filters };
  if (cleanFilters.sellerId) delete cleanFilters.sellerId;

  // Construir params finales
  const finalParams = {
    ...otherParams,
    filters: cleanFilters,
  };

  // Si tenemos sellerId, lo añadimos al root para que genere ?sellerId=X
  if (actualSellerId) {
    finalParams.sellerId = actualSellerId;
  }

  console.log("DEBUG: useDashboard - finalParams:", finalParams);

  return useStrapi("dashboard", finalParams, {
    ...options,
    singularName: "dashboard",
    pluralName: "dashboard",
    customNormalizer: normalizeFilters,
  });
}
