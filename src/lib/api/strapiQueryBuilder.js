// src/lib/api/strapiQueryBuilder.js

/**
 * Convierte un objeto de filtros a formato Strapi
 */
function buildFilters(filters) {
  if (!filters || typeof filters !== "object") return {};

  const result = {};

  function processFilter(key, value, prefix = "filters") {
    if (value === null || value === undefined) return;

    if (typeof value === "object" && !Array.isArray(value)) {
      // Verificar si es un operador de Strapi ($eq, $in, $contains, etc.)
      const operators = [
        "$eq",
        "$ne",
        "$in",
        "$notIn",
        "$lt",
        "$lte",
        "$gt",
        "$gte",
        "$between",
        "$contains",
        "$notContains",
        "$containsi",
        "$notContainsi",
        "$startsWith",
        "$endsWith",
        "$null",
        "$notNull",
      ];
      const hasOperator = Object.keys(value).some((k) => operators.includes(k));

      if (hasOperator) {
        // Es un operador, procesar directamente
        Object.entries(value).forEach(([operator, operatorValue]) => {
          if (Array.isArray(operatorValue)) {
            operatorValue.forEach((item, index) => {
              result[`${prefix}[${key}][${operator}][${index}]`] = String(item);
            });
          } else {
            result[`${prefix}[${key}][${operator}]`] = String(operatorValue);
          }
        });
      } else {
        // Es un objeto anidado, procesar recursivamente
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
          processFilter(nestedKey, nestedValue, `${prefix}[${key}]`);
        });
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        result[`${prefix}[${key}][${index}]`] = String(item);
      });
    } else {
      // Valor simple, usar $eq implícito
      result[`${prefix}[${key}]`] = String(value);
    }
  }

  Object.entries(filters).forEach(([key, value]) => {
    processFilter(key, value);
  });

  return result;
}

/**
 * Convierte configuración de populate a formato Strapi v4
 */
function buildPopulate(populate) {
  if (!populate || typeof populate !== "object") return {};

  const result = {};

  function processPopulate(config, basePath = "populate") {
    if (typeof config === "boolean") {
      result[basePath] = String(config);
      return;
    }

    if (typeof config === "string") {
      result[basePath] = config;
      return;
    }

    if (Array.isArray(config)) {
      config.forEach((item, index) => {
        result[`${basePath}[${index}]`] = String(item);
      });
      return;
    }

    if (typeof config === "object" && config !== null) {
      Object.entries(config).forEach(([relationKey, relationConfig]) => {
        const currentPath =
          basePath === "populate"
            ? `populate[${relationKey}]`
            : `${basePath}[${relationKey}]`;

        if (typeof relationConfig === "boolean") {
          result[currentPath] = String(relationConfig);
        } else if (typeof relationConfig === "string") {
          result[currentPath] = relationConfig;
        } else if (
          typeof relationConfig === "object" &&
          relationConfig !== null
        ) {
          // Procesar configuración de la relación
          Object.entries(relationConfig).forEach(([configKey, configValue]) => {
            if (configKey === "fields" && Array.isArray(configValue)) {
              // Campos específicos
              configValue.forEach((field, index) => {
                result[`${currentPath}[${configKey}][${index}]`] = field;
              });
            } else if (
              configKey === "populate" &&
              typeof configValue === "object"
            ) {
              // Populate anidado
              processPopulate(configValue, `${currentPath}[${configKey}]`);
            } else if (configKey === "sort" && Array.isArray(configValue)) {
              // Sort en populate
              configValue.forEach((sortItem, index) => {
                result[`${currentPath}[${configKey}][${index}]`] = sortItem;
              });
            } else if (
              configKey === "filters" &&
              typeof configValue === "object"
            ) {
              // Filtros en populate
              Object.entries(configValue).forEach(
                ([filterKey, filterValue]) => {
                  if (
                    typeof filterValue === "object" &&
                    !Array.isArray(filterValue)
                  ) {
                    Object.entries(filterValue).forEach(
                      ([operator, operatorValue]) => {
                        if (Array.isArray(operatorValue)) {
                          operatorValue.forEach((item, index) => {
                            result[
                              `${currentPath}[${configKey}][${filterKey}][${operator}][${index}]`
                            ] = String(item);
                          });
                        } else {
                          result[
                            `${currentPath}[${configKey}][${filterKey}][${operator}]`
                          ] = String(operatorValue);
                        }
                      }
                    );
                  } else {
                    result[`${currentPath}[${configKey}][${filterKey}]`] =
                      String(filterValue);
                  }
                }
              );
            } else {
              // Otras configuraciones
              result[`${currentPath}[${configKey}]`] = String(configValue);
            }
          });
        }
      });
    }
  }

  processPopulate(populate);
  return result;
}

/**
 * Convierte configuración de sort a formato Strapi
 */
function buildSort(sort) {
  if (!sort) return {};

  const result = {};

  if (Array.isArray(sort)) {
    sort.forEach((item, index) => {
      result[`sort[${index}]`] = item;
    });
  } else if (typeof sort === "string") {
    result["sort[0]"] = sort;
  }

  return result;
}

/**
 * Convierte configuración de paginación a formato Strapi
 */
function buildPagination(pagination) {
  if (!pagination || typeof pagination !== "object") return {};

  const result = {};

  if (pagination.page !== undefined) {
    result["pagination[page]"] = String(pagination.page);
  }

  if (pagination.pageSize !== undefined) {
    result["pagination[pageSize]"] = String(pagination.pageSize);
  }

  if (pagination.start !== undefined) {
    result["pagination[start]"] = String(pagination.start);
  }

  if (pagination.limit !== undefined) {
    result["pagination[limit]"] = String(pagination.limit);
  }

  return result;
}

/**
 * Construye una query string completa para Strapi
 */
export function buildStrapiQuery(params = {}) {
  const allParams = {};

  // Filtros
  if (params.filters) {
    Object.assign(allParams, buildFilters(params.filters));
  }

  // Populate
  if (params.populate) {
    Object.assign(allParams, buildPopulate(params.populate));
  }

  // Sort
  if (params.sort) {
    Object.assign(allParams, buildSort(params.sort));
  }

  // Paginación
  if (params.pagination) {
    Object.assign(allParams, buildPagination(params.pagination));
  }

  // Campos específicos
  if (params.fields && Array.isArray(params.fields)) {
    params.fields.forEach((field, index) => {
      allParams[`fields[${index}]`] = field;
    });
  }

  // Locale
  if (params.locale) {
    allParams.locale = params.locale;
  }

  // Publicación estado
  if (params.publicationState) {
    allParams.publicationState = params.publicationState;
  }

  // Parámetro de búsqueda
  if (params.q) {
    allParams.q = params.q;
  }

  // Convertir a query string SIN usar URLSearchParams para evitar doble encoding
  const queryString = Object.entries(allParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  return queryString;
}

/**
 * Normaliza los tipos de orden a formato válido
 */
export function normalizeOrderTypes(types) {
  const validTypes = [
    "sale",
    "purchase",
    "in",
    "out",
    "return",
    "transfer",
    "cut",
  ];

  if (Array.isArray(types)) {
    return types
      .map((type) => String(type).toLowerCase()) // Cambié a toLowerCase
      .filter((type) => validTypes.includes(type));
  }

  if (typeof types === "string") {
    const normalized = types.toLowerCase(); // Cambié a toLowerCase
    return validTypes.includes(normalized) ? normalized : undefined;
  }

  return types;
}

/**
 * Normaliza fechas al formato ISO esperado por Strapi
 */
export function normalizeDate(date) {
  if (!date || typeof date !== "string") return date;

  // Si ya es ISO, lo dejamos
  if (date.includes("T")) return date;

  // Si es formato YYYY-MM-DD, lo convertimos a ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(date + "T00:00:00.000Z").toISOString();
  }

  return date;
}

/**
 * Función de debug para ver la query generada
 */
export function debugStrapiQuery(params) {
  const query = buildStrapiQuery(params);
  console.log("🔍 Debug Strapi Query:");
  console.log("📝 Parámetros originales:", JSON.stringify(params, null, 2));
  console.log("🔗 Query generada:", query);
  console.log("🌐 URL completa:", `/api/strapi/orders?${query}`);
  console.log(
    "📋 URL decodificada:",
    decodeURIComponent(`/api/strapi/orders?${query}`)
  );
  return query;
}

/**
 * Normaliza los filtros antes de enviarlos a Strapi
 */
export function normalizeFilters(filters) {
  if (!filters || typeof filters !== "object") return filters;

  const normalized = structuredClone
    ? structuredClone(filters)
    : JSON.parse(JSON.stringify(filters));

  // Normalizar tipos de orden
  if (normalized.type) {
    if (normalized.type.$in) {
      const normalizedTypes = normalizeOrderTypes(normalized.type.$in);
      if (normalizedTypes && normalizedTypes.length > 0) {
        normalized.type.$in = normalizedTypes;
      } else {
        delete normalized.type.$in;
      }
    }

    if (normalized.type.$eq) {
      const normalizedType = normalizeOrderTypes([normalized.type.$eq])[0];
      if (normalizedType) {
        normalized.type.$eq = normalizedType;
      } else {
        delete normalized.type.$eq;
      }
    }
  }
}
