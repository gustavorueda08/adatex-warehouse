import * as XLSX from "xlsx";
import {
  prepareDocumentData,
  formatDocumentHeader,
  formatPackingList,
  calculateSummary,
  generateFileName,
  getDocumentTitle,
} from "./documentExportHelpers";
import format from "./format";

/**
 * Exporta un documento a formato Excel (.xlsx)
 * Compatible con todos los tipos de documentos
 * @param {Object} document - Documento completo del sistema
 * @param {Object} options - Opciones de exportación
 * @param {boolean} options.includeLot - Incluir columna de lote (default: false)
 * @param {boolean} options.includeItemNumber - Incluir número de item (default: false)
 * @param {boolean} options.includeBarcode - Incluir código de barras (default: false)
 */
export async function exportDocumentToExcel(document, options = {}) {
  const {
    includeLot = false,
    includeItemNumber = false,
    includeBarcode = false,
  } = options;

  // Preparar datos normalizados
  const data = prepareDocumentData(document);
  const headers = formatDocumentHeader(data);
  const packingList = formatPackingList(data.products, {
    includeLot,
    includeItemNumber,
    includeBarcode,
  });
  const summary = calculateSummary(data.products);
  const title = getDocumentTitle(data.type);

  // Crear un nuevo workbook
  const wb = XLSX.utils.book_new();

  // Crear array de datos para la hoja
  const sheetData = [];

  // ==================== ENCABEZADO ====================
  // Espacio para logo (3 filas vacías con merge)
  sheetData.push(["LOGO"]);
  sheetData.push([]);
  sheetData.push([]);

  // Título del documento
  sheetData.push([title]);
  sheetData.push([]);

  // Información de la orden
  headers.forEach((header) => {
    sheetData.push([header.label, header.value]);
  });

  sheetData.push([]); // Espacio

  // ==================== LISTA DE EMPAQUE ====================
  sheetData.push(["LISTA DE EMPAQUE"]);
  sheetData.push([]);

  if (packingList.length > 0) {
    // Headers de la tabla
    const tableHeaders = ["Producto", "Cantidad", "Unidad"];
    if (includeLot) tableHeaders.push("Lote");
    if (includeItemNumber) tableHeaders.push("Número de Item");
    if (includeBarcode) tableHeaders.push("Código de Barras");

    sheetData.push(tableHeaders);

    // Filas de datos
    packingList.forEach((row) => {
      const dataRow = [row.producto, row.cantidad, row.unidad];
      if (includeLot) dataRow.push(row.lote);
      if (includeItemNumber) dataRow.push(row.numeroItem);
      if (includeBarcode) dataRow.push(row.codigoBarras);
      sheetData.push(dataRow);
    });
  } else {
    sheetData.push(["No hay productos en esta orden"]);
  }

  sheetData.push([]); // Espacio

  // ==================== RESUMEN ====================
  sheetData.push(["RESUMEN"]);
  sheetData.push([]);

  // Total de items
  sheetData.push(["Total de Items", summary.totalItems]);

  // Total de cantidad (solo si las unidades son consistentes)
  if (summary.allUnitsConsistent && summary.totalQuantity !== null) {
    sheetData.push([
      "Cantidad Total",
      `${format(summary.totalQuantity)} ${summary.unit}`,
    ]);
  } else {
    sheetData.push([
      "Cantidad Total",
      "Unidades mixtas - ver detalle arriba",
    ]);
  }

  // Totales monetarios (si hay precios)
  if (summary.subtotal > 0) {
    sheetData.push([]);
    sheetData.push(["Subtotal", format(summary.subtotal, "$")]);
    sheetData.push(["IVA (19%)", format(summary.totalIVA, "$")]);
    sheetData.push(["Total", format(summary.total, "$")]);
  }

  // Crear worksheet desde los datos
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // ==================== ESTILOS Y FORMATO ====================
  const range = XLSX.utils.decode_range(ws["!ref"]);

  // Ajustar ancho de columnas
  ws["!cols"] = [
    { wch: 30 }, // Columna A (Labels/Producto)
    { wch: 20 }, // Columna B (Values/Cantidad)
    { wch: 15 }, // Columna C (Unidad)
    { wch: 20 }, // Columna D (Lote o extra)
    { wch: 20 }, // Columna E (Número item o extra)
    { wch: 25 }, // Columna F (Barcode o extra)
  ];

  // Encontrar índices de filas importantes
  let currentRow = 0;

  // Logo area (filas 0-2)
  const logoRow = 0;

  // Título (fila después del logo)
  const titleRow = 3;

  // Headers info (después del título)
  const infoStartRow = titleRow + 2;
  const infoEndRow = infoStartRow + headers.length - 1;

  // Lista de empaque
  const packingTitleRow = infoEndRow + 2;
  const packingHeaderRow = packingTitleRow + 2;
  const packingDataStartRow = packingHeaderRow + 1;
  const packingDataEndRow = packingDataStartRow + packingList.length - 1;

  // Resumen
  const summaryTitleRow = packingDataEndRow + 2;

  // Aplicar estilos a celdas específicas
  applyCellStyles(ws, {
    logoRow,
    titleRow,
    infoStartRow,
    infoEndRow,
    packingTitleRow,
    packingHeaderRow,
    packingDataStartRow,
    packingDataEndRow,
    summaryTitleRow,
  });

  // Agregar hoja al workbook
  XLSX.utils.book_append_sheet(wb, ws, "Documento");

  // Generar nombre de archivo
  const fileName = generateFileName(document, ".xlsx");

  // Descargar archivo
  XLSX.writeFile(wb, fileName);
}

/**
 * Aplica estilos a las celdas del worksheet
 * Nota: XLSX no soporta estilos nativamente en la versión gratuita,
 * pero podemos preparar la estructura para una futura implementación
 * con xlsx-style o similar
 */
function applyCellStyles(ws, positions) {
  // Esta función prepara la estructura para futuros estilos
  // Por ahora, solo aseguramos que las celdas existen

  const {
    logoRow,
    titleRow,
    packingTitleRow,
    summaryTitleRow,
  } = positions;

  // Asegurar que las celdas de título existen
  const titleCell = XLSX.utils.encode_cell({ r: titleRow, c: 0 });
  if (ws[titleCell]) {
    ws[titleCell].s = {
      font: { bold: true, sz: 16 },
      alignment: { horizontal: "left" },
    };
  }

  // Preparar merge para logo
  if (!ws["!merges"]) ws["!merges"] = [];
  ws["!merges"].push({
    s: { r: logoRow, c: 0 },
    e: { r: logoRow + 2, c: 1 },
  });

  // Nota: Para aplicar colores y estilos completos, se requiere
  // usar una librería adicional como xlsx-populate o xlsx-style
  // Por ahora, el documento tendrá la estructura correcta
}

/**
 * Versión alternativa usando xlsx-populate (si se necesita en el futuro)
 * Esta permite estilos completos pero requiere instalación adicional
 */
export async function exportDocumentToExcelStyled(document, options = {}) {
  // TODO: Implementar con xlsx-populate si se requieren estilos avanzados
  // Por ahora, usar la versión básica
  return exportDocumentToExcel(document, options);
}
