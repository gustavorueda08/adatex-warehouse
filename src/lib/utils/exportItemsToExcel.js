import ExcelJS from "exceljs";
import format from "@/lib/utils/format";

export const AVAILABLE_ITEM_COLUMNS = [
  { header: "ID", key: "id", width: 10, label: "ID" },
  { header: "Código", key: "code", width: 15, label: "Código" },
  { header: "Barcode", key: "barcode", width: 20, label: "Barcode" },
  { header: "Producto", key: "name", width: 40, label: "Producto" },
  { header: "Estado", key: "state", width: 15, label: "Estado" },
  { header: "Unidad", key: "unit", width: 10, label: "Unidad" },
  { header: "Cantidad", key: "quantity", width: 15, label: "Cantidad" },
  { header: "Bodega", key: "warehouse", width: 25, label: "Bodega" },
  {
    header: "Fecha Creación",
    key: "createdAt",
    width: 20,
    label: "Fecha Creación",
  },
  { header: "Lote", key: "lotNumber", width: 15, label: "Lote" },
  { header: "Número", key: "itemNumber", width: 15, label: "Número" },
];

/**
 * Exports detailed items (inventory units) to a styled Excel file.
 *
 * @param {Object} params
 * @param {Object} params.filters - Strapi filters applied to PRODUCTS
 * @param {Array} params.columns - Optional custom columns array
 * @param {Object} params.toast - Toast instance
 */
export async function exportItemsToExcel({
  filters,
  items,
  product,
  columns = AVAILABLE_ITEM_COLUMNS,
  toast,
}) {
  let loadingToast;
  try {
    loadingToast = toast.loading("Preparando exportación de detalles...");

    const allRows = [];

    // Mapping for State translations
    const stateMap = {
      available: "Disponible",
      reserved: "Reservado",
      defective: "Defectuoso",
      production: "En Producción",
      transit: "En Tránsito",
      expired: "Vencido",
    };

    if (items && Array.isArray(items)) {
      // Use provided items (Client-side filtered)
      items.forEach((item) => {
        const warehouse = item.warehouse || {};
        // If product is passed, use it. If not, try to find it in item (unlikely structure here but safe fallback)
        const prod = product || item.product || {};

        allRows.push({
          id: item.id || "-",
          code: prod.code || "-",
          barcode: item.barcode || item.attributes?.barcode || "-",
          name: prod.name || "-",
          state:
            stateMap[item.status || item.state] ||
            item.status ||
            item.state ||
            "Disponible",
          unit: prod.unit || "-",
          quantity: item.currentQuantity ?? 0,
          warehouse: warehouse.name || "-",
          createdAt: item.createdAt
            ? new Date(item.createdAt).toLocaleDateString()
            : "-",
          lotNumber: item.lotNumber || item.attributes?.lotNumber || "-",
          itemNumber: item.itemNumber || item.attributes?.itemNumber || "-",
        });
      });
    } else {
      // Fetch from Strapi (Server-side filtered)
      const { buildStrapiQuery } = await import("@/lib/api/strapiQueryBuilder");
      const pageSize = 100;
      let page = 1;
      let pageCount = 1;

      do {
        const params = {
          filters: filters || {},
          pagination: { page, pageSize },
          populate: ["collections"],
          sort: ["name:asc"],
          includeItems: true,
        };

        const queryString = buildStrapiQuery(params);
        const res = await fetch(
          `/api/strapi/products/inventory?${queryString}`
        );

        if (!res.ok) throw new Error("Error fetching data");

        const data = await res.json();
        const products = data.data || [];
        const meta = data.meta;

        products.forEach((p) => {
          const pItems = p.items || [];

          pItems.forEach((item) => {
            const warehouse = item.warehouse || {};

            if (warehouse && warehouse.name) {
              allRows.push({
                id: item.id || "-",
                code: p.code || "-",
                barcode: item.barcode || item.attributes?.barcode || "-",
                name: p.name || "-",
                state:
                  stateMap[item.status || item.state] ||
                  item.status ||
                  item.state ||
                  "Disponible",
                unit: p.unit || "-",
                quantity: item.currentQuantity ?? 0,
                warehouse: warehouse.name || "-",
                createdAt: item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString()
                  : "-",
                lotNumber: item.lotNumber || item.attributes?.lotNumber || "-",
                itemNumber:
                  item.itemNumber || item.attributes?.itemNumber || "-",
              });
            }
          });
        });

        pageCount = meta?.pagination?.pageCount || 1;
        page++;
      } while (page <= pageCount);
    }

    if (allRows.length === 0) {
      if (loadingToast) toast.dismiss(loadingToast);
      toast.error("No se encontraron items con bodega para exportar");
      return;
    }

    // 2. Create Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Detalle de Items");

    // 3. Set Columns
    worksheet.columns = columns;

    // 4. Header & Branding
    worksheet.insertRow(1, [""]);
    worksheet.insertRow(2, [""]);
    worksheet.insertRow(3, [""]);
    worksheet.insertRow(4, [""]);
    worksheet.insertRow(5, ["ADATEX WAREHOUSE - REPORTE DETALLADO DE ITEMS"]);
    worksheet.insertRow(6, [`Generado el: ${new Date().toLocaleString()}`]);
    worksheet.insertRow(7, [""]); // Spacing before table

    const titleEndCol = Math.max(1, columns.length);

    worksheet.mergeCells(5, 1, 5, titleEndCol);
    worksheet.mergeCells(6, 1, 6, titleEndCol);

    // Style Title
    const titleRow = worksheet.getRow(5);
    titleRow.height = 30;
    titleRow.getCell(1).font = {
      name: "Arial",
      size: 16,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    titleRow.getCell(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    titleRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF18181B" }, // Zinc 950
    };

    const dateRow = worksheet.getRow(6);
    dateRow.getCell(1).font = {
      name: "Arial",
      size: 10,
      italic: true,
      color: { argb: "FFD4D4D8" },
    };
    dateRow.getCell(1).alignment = { horizontal: "center" };
    dateRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF18181B" }, // Zinc 950
    };

    // 5. Add Image
    try {
      const logoResponse = await fetch("/logo-gray.png");
      if (logoResponse.ok) {
        const logoBlob = await logoResponse.blob();
        const logoBuffer = await logoBlob.arrayBuffer();
        const imageId = workbook.addImage({
          buffer: logoBuffer,
          extension: "png",
        });

        // 4.28 inches * 96 DPI = 411 px
        // 0.66 inches * 96 DPI = 63 px
        worksheet.addImage(imageId, {
          tl: { col: 0.2, row: 0.5 },
          ext: { width: 411, height: 63 },
          editAs: "absolute",
        });
      }
    } catch (e) {
      console.warn("Could not load logo for Excel", e);
    }

    // 6. Fill Data
    allRows.forEach((row) => {
      worksheet.addRow(row);
    });

    // 7. Style Headers (Row 8)
    const headerRow = worksheet.getRow(8);
    headerRow.values = columns.map((c) => c.header);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF27272A" }, // Zinc 800
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF3F3F46" } },
        left: { style: "thin", color: { argb: "FF3F3F46" } },
        bottom: { style: "thin", color: { argb: "FF3F3F46" } },
        right: { style: "thin", color: { argb: "FF3F3F46" } },
      };
    });

    // 8. Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Adatex-Detalle-Items-${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);

    if (loadingToast) toast.dismiss(loadingToast);
    toast.success("Detalle exportado exitosamente");
  } catch (error) {
    if (loadingToast) toast.dismiss(loadingToast);
    console.error("Export Items Error:", error);
    toast.error("Error al exportar detalle");
  }
}
