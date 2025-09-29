export function toQS(params = {}) {
  const qs = new URLSearchParams();
  const append = (prefix, obj) => {
    Object.entries(obj ?? {}).forEach(([k, v]) => {
      if (v == null) return;
      if (typeof v === "object" && !Array.isArray(v))
        append(`${prefix}[${k}]`, v);
      else if (Array.isArray(v))
        v.forEach((val, i) => append(`${prefix}[${k}][${i}]`, val));
      else qs.append(`${prefix}[${k}]`, String(v));
    });
  };
  if (params.pagination) append("pagination", params.pagination);
  if (params.sort) qs.append("sort", params.sort);
  if (params.filters) append("filters", params.filters);
  if (params.populate) append("populate", params.populate);
  if (params.fields) append("fields", params.fields);
  if (params.search) qs.append("search", params.search);
  return qs.toString();
}
