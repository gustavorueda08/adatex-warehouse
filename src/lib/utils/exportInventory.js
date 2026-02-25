import * as XLSX from "xlsx";
import { buildStrapiQuery } from "@/lib/api/strapiQueryBuilder";
import format from "@/lib/utils/format";

/**
 * Column mapping: Excel header → export field.
 */
const EXPORT_COLUMNS = [
  { header: "CÓDIGO", key: "code" },
  { header: "NOMBRE", key: "name" },
  { header: "BARCODE", key: "barcode" },
  { header: "STOCK", key: "stock" },
  { header: "RESERVADO", key: "reserved" },
  { header: "DISPONIBLE", key: "available" },
  { header: "LLEGANDO", key: "arriving" },
  { header: "REQUERIDO", key: "required" },
  { header: "EN PRODUCCIÓN", key: "production" },
  { header: "EN TRÁNSITO", key: "transit" },
  { header: "DISPONIBLE NETO", key: "netAvailable" },
  { header: "UNIDAD", key: "unit" },
];

/**
 * Downloads inventory data to Excel.
 * Can export either the currently loaded (local) products or fetch ALL products using the active filters.
 *
 * @param {Object} options
 * @param {Array} options.localProducts - Products already loaded in frontend
 * @param {Object} options.filters - Current search/filters to apply if fetching all
 * @param {String} options.inventoryMode - standard, historical or projection
 * @param {String} options.dateParams - { date } or { fromDate, toDate }
 * @param {String} options.exportType - "current_page" or "all_results"
 * @param {Object} options.toast - Toast instance { success, error, loading, dismiss }
 */
export async function exportInventory({
  localProducts = [],
  filters = {},
  inventoryMode = "standard",
  dateParams = {},
  exportType = "current_page",
  toast,
} = {}) {
  let loadingToast;
  try {
    if (toast?.loading) {
      loadingToast = toast.loading(
        exportType === "all_results"
          ? "Descargando todo el inventario..."
          : "Generando reporte Excel...",
      );
    }

    let productsToExport = [];

    // 1. Gather products to export
    if (exportType === "current_page") {
      productsToExport = localProducts;
    } else {
      // Fetch all products across pages using current filters
      const pageSize = 100;
      let page = 1;
      let pageCount = 1;

      do {
        // We use the custom endpoint if we need inventory, or standard if standard is enough.
        // The ProductsPage hook internally calls `/api/strapi/products/inventory` if we need projection etc.
        // We replicate this backend query building:

        let endpoint = "/api/strapi/products/inventory";
        const queryOptions = {
          pagination: { page, pageSize },
          filters,
          sort: ["code:asc"],
          populate: ["collections", "hideFor"],
        };

        // If it requires complex inventory projection:
        const queryStr = buildStrapiQuery(queryOptions);

        // Append date/inventory params manually to match useProducts behavior
        const urlParams = new URLSearchParams();
        if (dateParams.date)
          urlParams.append("date", dateParams.date.toString());
        if (dateParams.fromDate)
          urlParams.append("fromDate", dateParams.fromDate.toString());
        if (dateParams.toDate)
          urlParams.append("toDate", dateParams.toDate.toString());

        const fullQueryStr = urlParams.toString()
          ? `${queryStr}&${urlParams.toString()}`
          : queryStr;

        const res = await fetch(`${endpoint}?${fullQueryStr}`);
        if (!res.ok) throw new Error(`Error fetching products (page ${page})`);

        const data = await res.json();
        const extractedProducts = data.data || [];
        const meta = data.meta;

        productsToExport.push(...extractedProducts);
        pageCount = meta?.pagination?.pageCount || 1;
        page++;
      } while (page <= pageCount);
    }

    if (productsToExport.length === 0) {
      if (loadingToast) toast.dismiss(loadingToast);
      toast?.error?.("No se encontraron productos para exportar");
      return;
    }

    // 2. Map products to rows
    const rows = productsToExport.map((product) => {
      const row = {};
      EXPORT_COLUMNS.forEach(({ header, key }) => {
        // Top level properties
        if (["code", "name", "barcode", "unit"].includes(key)) {
          row[header] = product[key] ?? "";
        } else {
          // Inventory properties
          row[header] = product.inventory?.[key] || 0;
        }
      });
      return row;
    });

    // 3. Build workbook
    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: EXPORT_COLUMNS.map((c) => c.header),
    });

    // Auto-size columns
    worksheet["!cols"] = EXPORT_COLUMNS.map(({ header }) => ({
      wch: Math.max(header.length + 2, 20),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");

    // 4. Download
    const prefix =
      inventoryMode === "projection"
        ? "Proyeccion"
        : inventoryMode === "historical"
          ? "Historico"
          : "Inventario";
    const today = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Adatex-${prefix}-${today}.xlsx`);

    if (loadingToast) toast.dismiss(loadingToast);
    toast?.success?.(
      `Inventario exportado con ${productsToExport.length} productos`,
    );
  } catch (error) {
    if (loadingToast) toast?.dismiss?.(loadingToast);
    console.error("Export Inventory Error:", error);
    toast?.error?.("Error al exportar inventario");
  }
}
