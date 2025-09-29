const STRAPI_URL = process.env.STRAPI_URL;

export function strapiUrl(path, qs = "") {
  const base = `${STRAPI_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  return qs ? `${base}?${qs}` : base;
}

export function jsonHeaders(extra = {}) {
  return { "Content-Type": "application/json", ...extra };
}
