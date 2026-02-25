import ExcelJS from "exceljs";

/**
 * Exports inventory to a styled Excel file.
 *
 * @param {Object} params
 * @param {Object} params.filters - Strapi filters to apply
 * @param {Array} params.columns - List of visible columns definitions
 * @param {Object} params.toast - Toast instance for notifications
 */
export async function exportInventoryToExcel({ filters, columns, toast }) {
  let loadingToast;
  try {
    loadingToast = toast.loading("Preparando exportación...");

    // 1. Fetch ALL data matching filters
    // We need to handle pagination to get EVERYTHING.
    const allProducts = [];
    const pageSize = 100;
    let page = 1;
    let pageCount = 1;

    // Helper to build query string same as in strapiQueryBuilder,
    // but we can just use the provided filters directly if we fetch via our API or generic logic?
    // We will use the direct API endpoint `/api/strapi/products` which likely accepts standard Strapi params.
    // We need to serialize the filters. Since we don't have usage of qs/query-builder here easily without importing,
    // let's assume we can fetch passing the structured filters if we use a helper,
    // OR we re-implement a simple serializer or import `buildStrapiQuery` if possible.
    // Importing `buildStrapiQuery` is best.

    // Dynamic import to avoid circular deps if any, or just standard import.
    // Note: relative path check.

    // 2. Create Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Inventario");

    // 3. Define Columns
    // ExcelJS columns structure: { header: 'Name', key: 'name', width: 30 }
    worksheet.columns = columns.map((col) => ({
      header: col.label,
      key: col.key,
      width: col.key === "name" ? 40 : 20, // Wider for name
    }));

    // 4. Branding & Header
    // Insert rows for branding
    // Rows 1-4: Logo Space
    // Row 5: Title
    // Row 6: Date
    // Row 7: Empty
    worksheet.insertRow(1, [""]);
    worksheet.insertRow(2, [""]);
    worksheet.insertRow(3, [""]);
    worksheet.insertRow(4, [""]);
    worksheet.insertRow(5, ["ADATEX WAREHOUSE - REPORTE DE INVENTARIO"]);
    worksheet.insertRow(6, [`Generado el: ${new Date().toLocaleString()}`]);
    worksheet.insertRow(7, [""]); // Spacing before table

    // Calculate merge range for title (Full Width)
    const titleEndCol = Math.max(1, columns.length);

    worksheet.mergeCells(5, 1, 5, titleEndCol); // Row 5, Col 1 to End
    worksheet.mergeCells(6, 1, 6, titleEndCol); // Row 6

    // Style Title
    const titleRow = worksheet.getRow(5);
    titleRow.height = 30; // Taller title row
    titleRow.getCell(1).font = {
      name: "Arial",
      size: 16,
      bold: true,
      color: { argb: "FFFFFFFF" },
    }; // White
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
    }; // Zinc 300
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

        // Place logo at top left, spanning first 4 rows
        // 4.28 inches * 96 DPI = 411 px
        // 0.66 inches * 96 DPI = 63 px
        worksheet.addImage(imageId, {
          tl: { col: 0.2, row: 0.5 }, // Padding left (0.2 col) and Centered vertical (0.5 row offset)
          ext: { width: 411, height: 63 },
          editAs: "absolute",
        });
      }
    } catch (e) {
      console.warn("Could not load logo for Excel", e);
    }

    // 6. Fetch Data
    const { buildStrapiQuery } = await import("@/lib/api/strapiQueryBuilder");

    do {
      // Construct params
      const params = {
        filters: filters || {},
        pagination: { page, pageSize },
        populate: ["collections"],
        sort: ["name:asc"],
      };

      const queryString = buildStrapiQuery(params);
      // Pass withInventory=true to Strapi to get actual computed stocks
      const res = await fetch(
        `/api/strapi/products/inventory?${queryString}&withInventory=true`,
      );

      if (!res.ok) throw new Error("Error fetching data");

      const data = await res.json();
      const products = data.data || [];
      const meta = data.meta;

      // Process Rows
      products.forEach((product) => {
        const rowData = {};
        columns.forEach((col) => {
          if (col.getValue) {
            rowData[col.key] = col.getValue(product);
          } else {
            // Check top level, then attributes, then inventory nested values.
            rowData[col.key] =
              product[col.key] ||
              product.attributes?.[col.key] ||
              product.inventory?.[col.key] ||
              0;
          }
        });
        worksheet.addRow(rowData);
      });

      pageCount = meta?.pagination?.pageCount || 1;
      page++;
    } while (page <= pageCount);

    // 7. Style Data Table
    // Headers are now at Row 8 (due to 7 inserted rows)
    worksheet.columns = [];

    const headerValues = columns.map((c) => c.label);
    const headerRow = worksheet.getRow(8);
    headerRow.values = headerValues;

    // Style Header - Zinc Theme
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF27272A" }, // Zinc 800 (slightly lighter than 950 for contrast)
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF3F3F46" } }, // Zinc 700
        left: { style: "thin", color: { argb: "FF3F3F46" } },
        bottom: { style: "thin", color: { argb: "FF3F3F46" } },
        right: { style: "thin", color: { argb: "FF3F3F46" } },
      };
    });

    // Re-map data loops to use explicit row adding since we cleared generic columns
    // (Actually the previous loop `worksheet.addRow(rowData)` relies on keys matching columns...
    // if we clear columns, addRow with object might fail or just append values in order?
    // `addRow(object)` needs columns defined with keys.
    // So we MUST define columns with keys, but maybe we can shift them down?
    // ExcelJS typically assumes headers are at the top.
    // Let's stick to: Define columns, BUT disable auto-header?
    // Or simpler: Assign columns, this sets headers at row 1. Then insert 4 rows at top. This shifts headers to row 5.

    // Redo Order:
    // 1. Define columns (Headers at R1)
    // 2. Insert 4 rows at R1 (Headers move to R5)
    // 3. Fill data (Appends after R5)
    // 4. Style R1-R4

    // Correct.

    // 8. Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Adatex-Inventario-${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.dismiss(loadingToast);
    toast.success("Excel generado exitosamente");
  } catch (error) {
    if (loadingToast) toast.dismiss(loadingToast);
    console.error("Export Error:", error);
    toast.error("Error al exportar inventario");
  }
}
