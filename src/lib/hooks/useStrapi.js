// src/lib/hooks/useCRUD.js
"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  buildStrapiQuery,
  normalizeFilters,
} from "@/lib/api/strapiQueryBuilder";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

/**
 * Hook genérico para operaciones CRUD con Strapi
 * @param {string} endpoint - Endpoint de la API (ej: 'orders', 'products', 'customers')
 * @param {Object} queryParams - Parámetros para la consulta GET
 * @param {Object} options - Opciones del hook
 */
export function useStrapi(endpoint, queryParams = {}, options = {}) {
  const {
    enabled = true,
    debounceDelay = 300,
    refetchOnWindowFocus = false,
    staleTime = 0,
    onSuccess,
    onError,
    onCreate,
    onUpdate,
    onDelete,
    // Configuraciones específicas del endpoint
    singularName, // ej: 'order', 'product', 'customer'
    pluralName, // ej: 'orders', 'products', 'customers'
    customNormalizer, // función personalizada para normalizar filtros
  } = options;

  // Nombres por defecto basados en el endpoint
  const defaultSingularName = endpoint.endsWith("s")
    ? endpoint.slice(0, -1)
    : endpoint;
  const defaultPluralName = endpoint.endsWith("s") ? endpoint : `${endpoint}s`;

  const entitySingular = singularName || defaultSingularName;
  const entityPlural = pluralName || defaultPluralName;

  // Debounce para búsqueda
  const debouncedSearchQuery = useDebouncedValue(queryParams.q, debounceDelay);

  // Estado del hook
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [lastSuccessTime, setLastSuccessTime] = useState(null);

  // Estados para operaciones CRUD
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [crudError, setCrudError] = useState(null);

  // Referencias
  const abortControllerRef = useRef(null);
  const lastSuccessRef = useRef(null);
  const currentUrlRef = useRef("");

  // Parámetros normalizados para la query
  const normalizedParams = useMemo(() => {
    const baseParams = { ...queryParams };

    if (queryParams.q !== undefined) {
      baseParams.q = debouncedSearchQuery;
    }

    if (queryParams.filters) {
      // Usar normalizador personalizado si existe, sino el genérico
      baseParams.filters = customNormalizer
        ? customNormalizer(queryParams.filters)
        : normalizeFilters(queryParams.filters);
    }

    return baseParams;
  }, [queryParams, debouncedSearchQuery, customNormalizer]);

  // URL de la API
  const apiUrl = useMemo(() => {
    const queryString = buildStrapiQuery(normalizedParams);
    const baseUrl = `/api/strapi/${endpoint}`;
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }, [normalizedParams, endpoint]);

  // Función genérica para realizar petición GET
  const fetchEntities = useCallback(
    async (showLoading = true) => {
      if (!enabled) return;
      console.log("🔄 fetchEntities iniciando para:", apiUrl);

      // Actualizar URL actual
      currentUrlRef.current = apiUrl;

      // Cancelar fetch anterior si existe
      if (abortControllerRef.current) {
        console.log("⚠️ Abortando fetch anterior");
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      console.log("🆕 Nuevo AbortController creado");

      try {
        if (showLoading) {
          setLoading(true);
        } else {
          setIsFetching(true);
        }

        setError(null);
        console.log("📡 Haciendo fetch a:", apiUrl);
        const response = await fetch(apiUrl, {
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        console.log("📬 Response recibida:", response.status, response.ok);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error?.message ||
              errorData.message ||
              `Error ${response.status}: ${response.statusText}`,
          );
        }
        const result = await response.json();

        if (!result || typeof result !== "object") {
          throw new Error("Respuesta inválida del servidor");
        }

        setData(result);
        const now = new Date();
        lastSuccessRef.current = now;
        setLastSuccessTime(now.getTime());

        if (onSuccess) onSuccess(result);
      } catch (err) {
        if (err.name === "AbortError") {
          console.log("🛑 Petición abortada (esperado):", apiUrl);
          // No hacer nada, es un comportamiento esperado
        } else {
          console.error(`❌ Error fetching ${entityPlural}:`, err);
          setError(err);
          if (onError) onError(err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setIsFetching(false);
        }
      }
    },
    [enabled, apiUrl, onSuccess, onError, entityPlural],
  );

  // Función genérica para crear entidad
  const createEntity = useCallback(
    async (entityData) => {
      if (!entityData) {
        const error = new Error(
          `Los datos del ${entitySingular} son requeridos`,
        );
        setCrudError(error);
        if (onError) onError(error);
        return { success: false, error };
      }

      setCreating(true);
      setCrudError(null);

      try {
        const response = await fetch(`/api/strapi/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: entityData }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error?.message ||
              result.message ||
              `Error ${response.status}: ${response.statusText}`,
          );
        }

        if (!result || !result.data) {
          throw new Error("Respuesta inválida del servidor");
        }

        // Refrescar la lista después de crear
        await fetchEntities(false);

        if (onCreate) onCreate(result.data, result);

        return { success: true, data: result.data, meta: result.meta };
      } catch (err) {
        console.error(`Error creating ${entitySingular}:`, err);
        setCrudError(err);
        if (onError) onError(err);
        return { success: false, error: err };
      } finally {
        setCreating(false);
      }
    },
    [fetchEntities, onCreate, onError, endpoint, entitySingular],
  );

  // Función genérica para actualizar entidad
  const updateEntity = useCallback(
    async (entityId, entityData) => {
      if (!entityId || !entityData) {
        const error = new Error(
          `ID y datos del ${entitySingular} son requeridos`,
        );
        setCrudError(error);
        if (onError) onError(error);
        return { success: false, error };
      }

      setUpdating(true);
      setCrudError(null);

      try {
        const response = await fetch(`/api/strapi/${endpoint}/${entityId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: entityData }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error?.message ||
              result.message ||
              `Error ${response.status}: ${response.statusText}`,
          );
        }

        if (!result || !result.data) {
          throw new Error("Respuesta inválida del servidor");
        }

        // Actualizar los datos localmente si es posible
        if (data?.data) {
          const updatedData = {
            ...data,
            data: data.data.map((entity) =>
              entity.id === entityId ? result.data : entity,
            ),
          };
          setData(updatedData);
        }

        if (onUpdate) onUpdate(result.data, result);
        return { success: true, data: result.data, meta: result.meta };
      } catch (err) {
        console.error(`Error updating ${entitySingular}:`, err);
        setCrudError(err);
        if (onError) onError(err);
        return { success: false, error: err };
      } finally {
        setUpdating(false);
      }
    },
    [data, onUpdate, onError, endpoint, entitySingular],
  );

  // Función genérica para eliminar entidad
  const deleteEntity = useCallback(
    async (entityId) => {
      if (!entityId) {
        const error = new Error(`ID del ${entitySingular} es requerido`);
        setCrudError(error);
        if (onError) onError(error);
        return { success: false, error };
      }

      setDeleting(true);
      setCrudError(null);

      try {
        const response = await fetch(`/api/strapi/${endpoint}/${entityId}`, {
          method: "DELETE",
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

        // Actualizar los datos localmente removiendo el elemento
        if (data?.data) {
          const updatedData = {
            ...data,
            data: data.data.filter((entity) => entity.id !== entityId),
            meta: {
              ...data.meta,
              pagination: data.meta.pagination
                ? {
                    ...data.meta.pagination,
                    total: data.meta.pagination.total - 1,
                  }
                : undefined,
            },
          };
          setData(updatedData);
        }

        if (onDelete) onDelete(result.data || { id: entityId }, result);

        return { success: true, data: result.data };
      } catch (err) {
        console.error(`Error deleting ${entitySingular}:`, err);
        setCrudError(err);
        if (onError) onError(err);
        return { success: false, error: err };
      } finally {
        setDeleting(false);
      }
    },
    [data, onDelete, onError, endpoint, entitySingular],
  );

  // Función para refetch
  const refetch = useCallback(() => {
    return fetchEntities(true);
  }, []);

  // Función para invalidar y refetch
  const invalidateAndRefetch = useCallback(() => {
    lastSuccessRef.current = null;
    setLastSuccessTime(null);
    return fetchEntities(true);
  }, [fetchEntities]);

  // Reset de errores CRUD
  const resetCrudError = useCallback(() => {
    setCrudError(null);
  }, []);

  // Verificar si los datos están obsoletos
  const isDataStale = useMemo(() => {
    if (staleTime === 0) return true;
    if (!lastSuccessTime) return true;
    return Date.now() - lastSuccessTime > staleTime;
  }, [staleTime, lastSuccessTime]);

  // Efecto principal para GET - Simplificado para evitar loops
  useEffect(() => {
    if (!enabled) return;

    // Detectar si la URL cambió
    const urlChanged = currentUrlRef.current !== apiUrl;
    // Solo hacer fetch si la URL cambió o es la primera carga (currentUrl vacío)
    if (urlChanged || currentUrlRef.current === "") {
      // Mostrar loading solo en primera carga (cuando no hay datos)
      const showLoading = !data;
      fetchEntities(showLoading);
    }
    // NO hacer cleanup aquí - fetchEntities ya maneja el abort de requests anteriores
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, enabled]);

  // Limpieza solo al desmontar el componente
  // NOTA: Comentado porque causa AbortErrors en desarrollo
  // El abort de peticiones anteriores ya se maneja en fetchEntities (líneas 98-100)
  // useEffect(() => {
  //   return () => {
  //     console.log("🗑️ Componente desmontándose, abortando fetch");
  //     if (abortControllerRef.current) {
  //       abortControllerRef.current.abort();
  //     }
  //   };
  // }, []);

  // Refetch en window focus
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isDataStale) {
        fetchEntities(false);
      }
    };

    const handleFocus = () => {
      if (isDataStale) {
        fetchEntities(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refetchOnWindowFocus, enabled, isDataStale, fetchEntities]);

  // Datos derivados - Maneja tanto arrays como objetos en data.data
  const rawData = data?.data;
  const entities = useMemo(() => {
    if (Array.isArray(rawData)) return rawData;
    if (rawData) return [rawData];
    return [];
  }, [rawData]);
  const meta = data?.meta ?? {};
  const pagination = meta.pagination ?? {};

  const isEmpty = entities.length === 0;
  const hasNextPage = pagination.page
    ? pagination.page < pagination.pageCount
    : false;
  const hasPreviousPage = pagination.page ? pagination.page > 1 : false;

  // Crear objeto de retorno dinámico
  const result = {
    // Datos principales
    entities,
    meta,
    pagination,

    // Estados GET
    loading,
    error,
    isFetching,
    isEmpty,

    // Estados CRUD
    creating,
    updating,
    deleting,
    crudError,

    // Estados de paginación
    hasNextPage,
    hasPreviousPage,

    // Funciones CRUD
    createEntity,
    updateEntity,
    deleteEntity,

    // Funciones GET
    refetch,
    invalidateAndRefetch,

    // Utilidades
    setData,
    resetCrudError,
    isStale: isDataStale,
    lastSuccess: lastSuccessRef.current,

    // Estados derivados
    isIdle: !loading && !isFetching && !creating && !updating && !deleting,
    isWorking: loading || isFetching || creating || updating || deleting,

    // Debug info
    ...(process.env.NODE_ENV === "development" && {
      url: apiUrl,
      params: normalizedParams,
    }),
  };

  // Agregar alias específicos del endpoint
  result[entityPlural] = entities;
  result[
    `create${entitySingular.charAt(0).toUpperCase()}${entitySingular.slice(1)}`
  ] = createEntity;
  result[
    `update${entitySingular.charAt(0).toUpperCase()}${entitySingular.slice(1)}`
  ] = updateEntity;
  result[
    `delete${entitySingular.charAt(0).toUpperCase()}${entitySingular.slice(1)}`
  ] = deleteEntity;

  return result;
}
