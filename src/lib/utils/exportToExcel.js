import ExcelJS from "exceljs";
import moment from "moment-timezone";
import {
  prepareDocumentData,
  generateFileName,
  getDocumentTitle,
  transformToPackingListStructure,
  transposeArray,
  getTotalUnitString,
  getResumeItemsFromPackingList,
} from "./documentExportHelpers";
import format from "./format";

// Constantes de estilo para reutilización
const STYLES = {
  headerTitle: {
    font: { bold: true, size: 14 },
    alignment: { vertical: "middle", horizontal: "left" },
  },
  boldText: {
    font: { bold: true },
    alignment: { vertical: "middle", horizontal: "left", wrapText: true },
  },
  boldCentered: {
    font: { bold: true },
    alignment: { vertical: "middle", horizontal: "center", wrapText: true },
  },
  centeredText: {
    alignment: { vertical: "middle", horizontal: "center" },
  },
  borderMediumBottom: {
    bottom: { style: "medium" },
  },
  borderThin: {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  },
  borderMedium: {
    top: { style: "medium" },
    left: { style: "medium" },
    bottom: { style: "medium" },
    right: { style: "medium" },
  },
};

/**
 * Exporta un documento a formato Excel (.xlsx) con formato profesional usando ExcelJS
 * Compatible con todos los tipos de documentos
 * Genera dos hojas: "Lista de Empaque" (detallada) y "Resumen" (agrupada)
 *
 * @param {Object} document - Documento completo del sistema
 * @param {Object} _options - Opciones de exportación (reservado para futuras extensiones)
 * @param {boolean} _options.includeLot - Incluir columna de lote (default: false)
 * @param {boolean} _options.includeItemNumber - Incluir número de item (default: false)
 * @param {boolean} _options.includeBarcode - Incluir código de barras (default: false)
 */
export async function exportDocumentToExcel(document, _options = {}) {
  try {
    // Validación de entrada
    if (!document || !document.type) {
      throw new Error("Documento inválido o sin tipo especificado");
    }

    // Preparar datos normalizados
    const data = prepareDocumentData(document);
    const packingList = transformToPackingListStructure(document);

    // Crear workbook
    const workbook = new ExcelJS.Workbook();

    // Crear ambas hojas
    await createMainWorksheet(workbook, packingList, data);
    await createResumeWorksheet(workbook, packingList, data);

    // Generar el archivo Excel como un blob
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Crear un enlace de descarga dinámico
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = generateFileName(document, ".xlsx");
    link.click();
    URL.revokeObjectURL(url); // Limpieza de recursos

    return true;
  } catch (error) {
    console.error("Error al exportar el archivo Excel:", error);
    throw new Error(`No se pudo exportar el documento: ${error.message}`);
  }
}

/**
 * Crea la hoja principal "Lista de Empaque" con formato transpuesto
 * @private
 */
async function createMainWorksheet(workbook, packingList, data) {
  const worksheet = workbook.addWorksheet("Lista de Empaque", {
    views: [{ showGridLines: false }],
  });

  // Obtener datos transpuestos
  const keys = Object.keys(packingList);
  const namesRow = keys.map((key) => packingList[key].name);
  const quantitiesColumns = keys.map((key) => packingList[key].quantities);
  const quantitiesRows = transposeArray(quantitiesColumns);

  // Calcular totales
  const totalByColumn = keys.map((key) =>
    packingList[key].quantities.reduce((acc, q) => acc + Number(q || 0), 0)
  );
  const totalItems = quantitiesColumns.map((v) => v.length);
  const itemsCount = quantitiesColumns.flat().length;
  const totalQuantity = quantitiesColumns
    .flat()
    .reduce((acc, quantity) => acc + Number(quantity || 0), 0);

  const lastColumnLetter = getColumnLetter(namesRow.length);
  const hasMultipleProducts = namesRow.length > 2;

  // Espacios iniciales
  worksheet.addRows([[], [], [], []]);

  // Título
  const titleRow = worksheet.addRow([getDocumentTitle(data.type)]);
  applyCellStyle(titleRow, STYLES.headerTitle);

  worksheet.addRow([""]);

  // Fecha
  const dateRow = worksheet.addRow(
    hasMultipleProducts
      ? [`FECHA: ${moment(data.createdDate, "DD/MM/YYYY").format("DD/MM/YY")}`, ""]
      : [`FECHA: ${moment(data.createdDate, "DD/MM/YYYY").format("DD/MM/YY")}`]
  );
  worksheet.mergeCells("A7:B7");
  applyCellStyle(dateRow, { ...STYLES.boldText, border: STYLES.borderMediumBottom });

  worksheet.addRow([""]);

  // Cliente/Proveedor/Bodega
  const entityRow = worksheet.addRow([`${data.entityLabel}: ${data.entityName}`]);
  applyCellStyle(entityRow, { ...STYLES.boldText, border: STYLES.borderMediumBottom });

  // Dirección
  const addressRow = worksheet.addRow([`DIRECCIÓN: ${data.entityAddress}`]);
  applyCellStyle(addressRow, STYLES.boldText);

  // Código
  const codeRow = worksheet.addRow([`${data.type === "sale" ? "FACTURA" : "CÓDIGO"}: ${data.code}`]);
  applyCellStyle(codeRow, { ...STYLES.boldText, border: STYLES.borderMediumBottom });

  // Merge de celdas de encabezado
  if (hasMultipleProducts) {
    worksheet.mergeCells("A9:B9");
    worksheet.mergeCells("A10:B10");
    worksheet.mergeCells("A11:B11");
    worksheet.mergeCells(`C9:${lastColumnLetter}9`);

    // Sección de totales (solo si hay múltiples productos)
    const totalsHeaderCell = worksheet.getCell("D9");
    totalsHeaderCell.value = "TOTALES";
    Object.assign(totalsHeaderCell, {
      font: { bold: true },
      alignment: { vertical: "middle", horizontal: "center" },
      border: STYLES.borderMedium,
    });

    // Total unidades
    const unitStringCell = worksheet.getCell("C10");
    unitStringCell.value = getTotalUnitString(packingList, false);
    Object.assign(unitStringCell, {
      font: { bold: true },
      border: STYLES.borderThin,
    });

    const totalQtyCell = worksheet.getCell("D10");
    totalQtyCell.value = totalQuantity;
    Object.assign(totalQtyCell, {
      font: { bold: true },
      alignment: { vertical: "middle", horizontal: "center" },
      border: STYLES.borderThin,
    });
    worksheet.mergeCells(`D10:${lastColumnLetter}10`);

    // Total rollos/items
    const rollosLabelCell = worksheet.getCell("C11");
    rollosLabelCell.value = "ROLLOS";
    Object.assign(rollosLabelCell, {
      font: { bold: true },
      border: STYLES.borderThin,
    });

    const rollosTotalCell = worksheet.getCell("D11");
    rollosTotalCell.value = itemsCount;
    Object.assign(rollosTotalCell, {
      font: { bold: true },
      alignment: { vertical: "middle", horizontal: "center" },
      border: STYLES.borderThin,
    });
    worksheet.mergeCells(`D11:${lastColumnLetter}11`);
  } else {
    worksheet.mergeCells(`A9:${lastColumnLetter}9`);
    worksheet.mergeCells(`A10:${lastColumnLetter}10`);
    worksheet.mergeCells(`A11:${lastColumnLetter}11`);
  }

  // NIT en la parte superior derecha
  worksheet.mergeCells(`A5:${lastColumnLetter}5`);
  const nitCell = worksheet.getCell("A5");
  nitCell.value = "NIT: 901.738.541-1";
  nitCell.alignment = {
    horizontal: hasMultipleProducts ? "right" : "left",
    vertical: "middle",
  };

  // Espacios antes de la tabla
  worksheet.addRows([[], []]);

  // Encabezados de productos
  const headerRow = worksheet.addRow(namesRow);
  applyCellStyle(headerRow, { ...STYLES.boldCentered, border: STYLES.borderThin });

  // Agregar datos transpuestos
  quantitiesRows.forEach((rowData) => {
    const row = worksheet.addRow(rowData);
    row.eachCell((cell) => {
      cell.border = STYLES.borderThin;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
  });

  // Espacios antes de totales
  worksheet.addRows([[], []]);

  // Total por columna
  const totalLabelRow = worksheet.addRow([getTotalUnitString(packingList, true)]);
  applyCellStyle(totalLabelRow, STYLES.boldText);

  const totalValuesRow = worksheet.addRow(totalByColumn);
  totalValuesRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = STYLES.borderThin;
  });

  worksheet.addRow([]);

  // Total de rollos
  const rollosLabelRow = worksheet.addRow(["TOTALES ROLLOS"]);
  applyCellStyle(rollosLabelRow, STYLES.boldText);

  const rollosValuesRow = worksheet.addRow(totalItems);
  rollosValuesRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = STYLES.borderThin;
  });

  // Ajustar ancho de columnas
  worksheet.columns.forEach((column, colIndex) => {
    const maxWidth = Math.max(
      ...quantitiesRows.map((row) => String(row[colIndex] || "").length),
      String(namesRow[colIndex] || "").length
    );
    column.width = hasMultipleProducts ? maxWidth / 2 + 5 : maxWidth + 10;
  });

  // Intentar agregar logo si existe
  await addLogoToWorksheet(workbook, worksheet, hasMultipleProducts ? namesRow.length - 2 : 0);
}

/**
 * Crea la hoja de "Resumen" con totales agrupados
 * @private
 */
async function createResumeWorksheet(workbook, packingList, data) {
  const worksheet = workbook.addWorksheet("Resumen", {
    views: [{ showGridLines: false }],
  });

  // Espacios iniciales
  worksheet.addRows([[], [], [], []]);

  // Título
  const titleRow = worksheet.addRow([getDocumentTitle(data.type)]);
  applyCellStyle(titleRow, STYLES.headerTitle);

  worksheet.addRow([""]);

  // Fecha
  const dateRow = worksheet.addRow([`FECHA: ${moment(data.createdDate, "DD/MM/YYYY").format("DD/MM/YY")}`, "", ""]);
  applyCellStyle(dateRow, { ...STYLES.boldText, border: STYLES.borderMediumBottom });
  worksheet.mergeCells("A7:C7");

  // Cliente/Proveedor/Bodega
  const entityRow = worksheet.addRow([`${data.entityLabel}: ${data.entityName}`]);
  applyCellStyle(entityRow, { ...STYLES.boldText, border: STYLES.borderMediumBottom });
  worksheet.mergeCells("A8:C8");

  // Dirección
  const addressRow = worksheet.addRow([`DIRECCIÓN: ${data.entityAddress}`]);
  applyCellStyle(addressRow, STYLES.boldText);
  worksheet.mergeCells("A9:C9");

  // Código
  const codeRow = worksheet.addRow([`${data.type === "sale" ? "FACTURA" : "CÓDIGO"}: ${data.code}`]);
  applyCellStyle(codeRow, { ...STYLES.boldText, border: STYLES.borderMediumBottom });
  worksheet.mergeCells("A10:C10");

  // Encabezados de tabla
  worksheet.addRow(["", "", ""]);
  const headerRow = worksheet.addRow(["PRODUCTO", "CANTIDAD", "ROLLOS"]);
  applyCellStyle(headerRow, { ...STYLES.boldCentered, border: STYLES.borderThin });

  // Obtener resumen de productos
  const products = getResumeItemsFromPackingList(packingList);

  // Agregar filas de productos
  products.forEach((product) => {
    const row = worksheet.addRow([
      product.name,
      format(product.totalQuantity),
      product.count,
    ]);
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = STYLES.borderThin;
    });
  });

  // Fila de totales
  const totalRow = worksheet.addRow([
    "TOTALES",
    format(products.reduce((acc, p) => p.totalQuantity + acc, 0)),
    products.reduce((acc, p) => p.count + acc, 0),
  ]);
  applyCellStyle(totalRow, { ...STYLES.boldCentered, border: STYLES.borderThin });

  // Ajustar anchos de columna
  worksheet.getColumn(1).width = 40; // Producto
  worksheet.getColumn(2).width = 20; // Cantidad
  worksheet.getColumn(3).width = 15; // Rollos

  // Agregar logo
  await addLogoToWorksheet(workbook, worksheet, 0);
}

/**
 * Intenta agregar el logo al worksheet
 * @private
 */
async function addLogoToWorksheet(workbook, worksheet, colOffset = 0) {
  try {
    const imageUrl = "/logo-horizontal.png";
    const response = await fetch(imageUrl);

    if (!response.ok) {
      console.warn("Logo no encontrado, se omitirá");
      return;
    }

    const blobImage = await response.blob();
    const bufferImage = await blobImage.arrayBuffer();

    const imageId = workbook.addImage({
      buffer: bufferImage,
      extension: "png",
    });

    worksheet.addImage(imageId, {
      tl: { col: colOffset, row: 1 },
      ext: { width: 280, height: 40 },
    });
  } catch (error) {
    console.warn("No se pudo agregar el logo:", error.message);
    // Continuar sin logo
  }
}

/**
 * Aplica estilos a todas las celdas de una fila
 * @private
 */
function applyCellStyle(row, styles) {
  row.eachCell((cell) => {
    if (styles.font) cell.font = styles.font;
    if (styles.alignment) cell.alignment = styles.alignment;
    if (styles.border) cell.border = styles.border;
  });
}

/**
 * Obtiene la letra de columna de Excel dado un índice (1-indexed)
 * @private
 */
function getColumnLetter(columnNumber) {
  let letter = "";
  while (columnNumber > 0) {
    const remainder = (columnNumber - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    columnNumber = Math.floor((columnNumber - 1) / 26);
  }
  return letter;
}

/**
 * Exporta con estilos avanzados (alias para compatibilidad)
 * @deprecated Use exportDocumentToExcel instead
 */
export async function exportDocumentToExcelStyled(document, options = {}) {
  return exportDocumentToExcel(document, options);
}
