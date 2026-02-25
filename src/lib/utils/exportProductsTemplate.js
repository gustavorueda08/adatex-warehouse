import * as XLSX from "xlsx";
import { buildStrapiQuery } from "@/lib/api/strapiQueryBuilder";

/**
 * Column mapping: Excel header → product field.
 * Array fields (collections, hideFor) are serialised as semicolon-separated strings.
 * type: "array" → value is an array of objects that should be joined by semicolons.
 * type: "boolean" → value is true/false.
 */
const TEMPLATE_COLUMNS = [
  { header: "ID", key: "id" },
  { header: "CODIGO", key: "code" },
  { header: "NOMBRE", key: "name" },
  { header: "BARCODE", key: "barcode" },
  { header: "UNIDAD", key: "unit" },
  { header: "CATEGORIA", key: "category" },
  { header: "DESCRIPCION", key: "description" },
  { header: "UNIDADES_POR_PAQUETE", key: "unitsPerPackage" },
  { header: "ACTIVO", key: "isActive", type: "boolean" },
  { header: "CANTIDAD_VARIABLE", key: "hasVariableQuantity", type: "boolean" },
  { header: "SIIGO_ID", key: "siigoId" },
  {
    header: "COLECCIONES",
    key: "collections",
    type: "array",
    subKey: "name",
  },
  {
    header: "OCULTAR_PARA",
    key: "hideFor",
    type: "array",
    subKey: "username",
  },
  {
    header: "PRODUCTO_PADRE",
    key: "parentProduct",
    type: "object",
    subKey: "id",
  },
  {
    header: "FACTORES_TRANSFORMACION",
    key: "transformationFactor",
    type: "object",
    subKey: "id",
  },
  {
    header: "PRODUCTOS_PARA_CORTES",
    key: "productsForCuts",
    type: "array",
    subKey: "id",
  },
];

/**
 * Fetches ALL products from the database (paginated) and downloads them
 * as an Excel (.xlsx) template that can be modified and re-uploaded
 * through the bulk-upsert flow.
 *
 * @param {Object} options
 * @param {Object} options.toast - Toast instance { success, error, loading, dismiss }
 */
export async function exportProductsTemplate({ toast } = {}) {
  let loadingToast;
  try {
    if (toast?.loading) {
      loadingToast = toast.loading("Descargando todos los productos...");
    }

    // 1. Fetch all products in paginated batches
    const allProducts = [];
    const pageSize = 100;
    let page = 1;
    let pageCount = 1;

    do {
      const queryString = buildStrapiQuery({
        pagination: { page, pageSize },
        sort: ["code:asc"],
        populate: [
          "collections",
          "hideFor",
          "parentProduct",
          "transformationFactor",
          "productsForCuts",
        ],
      });

      const res = await fetch(`/api/strapi/products?${queryString}`);
      if (!res.ok) throw new Error(`Error fetching products (page ${page})`);

      const data = await res.json();
      const products = data.data || [];
      const meta = data.meta;

      allProducts.push(...products);
      pageCount = meta?.pagination?.pageCount || 1;
      page++;
    } while (page <= pageCount);

    if (allProducts.length === 0) {
      if (loadingToast) toast.dismiss(loadingToast);
      toast?.error?.("No se encontraron productos para exportar");
      return;
    }

    // 2. Map products to rows
    const rows = allProducts.map((product) => {
      const row = {};
      TEMPLATE_COLUMNS.forEach(({ header, key, type, subKey }) => {
        const value = product[key];
        if (type === "boolean") {
          row[header] = value === false ? "false" : "true";
        } else if (type === "array") {
          // Convert array of objects to semicolon-separated string
          if (Array.isArray(value) && value.length > 0) {
            row[header] = value.map((item) => item[subKey] || item).join(";");
          } else {
            row[header] = "";
          }
        } else if (type === "object") {
          // Extract a specific key from a single relation object
          if (value && typeof value === "object") {
            row[header] = value[subKey] || "";
          } else {
            row[header] = "";
          }
        } else {
          row[header] = value ?? "";
        }
      });
      return row;
    });

    // 3. Build workbook
    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: TEMPLATE_COLUMNS.map((c) => c.header),
    });

    // Auto-size columns
    worksheet["!cols"] = TEMPLATE_COLUMNS.map(({ header }) => ({
      wch: Math.max(header.length + 2, 20),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");

    // 4. Download
    const today = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Adatex-Productos-Plantilla-${today}.xlsx`);

    if (loadingToast) toast.dismiss(loadingToast);
    toast?.success?.(`Plantilla exportada con ${allProducts.length} productos`);
  } catch (error) {
    if (loadingToast) toast?.dismiss?.(loadingToast);
    console.error("Export Products Template Error:", error);
    toast?.error?.("Error al exportar la plantilla de productos");
  }
}
