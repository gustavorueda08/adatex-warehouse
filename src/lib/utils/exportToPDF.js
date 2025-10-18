import jsPDF from "jspdf";
import "jspdf-autotable";
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
 * Exporta un documento a formato PDF
 * Compatible con todos los tipos de documentos
 * @param {Object} document - Documento completo del sistema
 * @param {Object} options - Opciones de exportación
 * @param {boolean} options.includeLot - Incluir columna de lote (default: false)
 * @param {boolean} options.includeItemNumber - Incluir número de item (default: false)
 * @param {boolean} options.includeBarcode - Incluir código de barras (default: false)
 */
export async function exportDocumentToPDF(document, options = {}) {
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

  // Crear documento PDF (A4)
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Colores del tema (zinc, emerald, cyan)
  const colors = {
    zinc800: [39, 39, 42], // #27272a
    zinc700: [63, 63, 70], // #3f3f46
    zinc600: [82, 82, 91], // #52525b
    emerald500: [16, 185, 129], // #10b981
    cyan500: [6, 182, 212], // #06b6d4
    white: [255, 255, 255],
    black: [0, 0, 0],
    gray400: [156, 163, 175], // #9ca3af
  };

  // ==================== LOGO PLACEHOLDER ====================
  // Espacio reservado para logo (50x50mm en esquina superior izquierda)
  pdf.setDrawColor(...colors.zinc600);
  pdf.setLineWidth(0.5);
  pdf.rect(margin, yPos, 50, 30);

  // Texto placeholder
  pdf.setFontSize(8);
  pdf.setTextColor(...colors.gray400);
  pdf.text("LOGO", margin + 25, yPos + 15, { align: "center" });
  pdf.text("(50x30mm)", margin + 25, yPos + 20, { align: "center" });

  // Información de la empresa a la derecha del logo
  pdf.setFontSize(10);
  pdf.setTextColor(...colors.black);
  pdf.setFont("helvetica", "normal");
  const companyX = margin + 55;
  pdf.text("Adatex Warehouse", companyX, yPos + 10);
  pdf.setFontSize(8);
  pdf.setTextColor(...colors.gray400);
  pdf.text("Sistema de Gestión de Inventario", companyX, yPos + 15);

  yPos += 40;

  // ==================== TÍTULO DEL DOCUMENTO ====================
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...colors.zinc800);
  pdf.text(title, margin, yPos);
  yPos += 10;

  // Línea separadora
  pdf.setDrawColor(...colors.emerald500);
  pdf.setLineWidth(0.8);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // ==================== INFORMACIÓN DE LA ORDEN ====================
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");

  // Crear tabla de información
  const headerRows = headers.map((h) => [h.label, h.value]);

  pdf.autoTable({
    startY: yPos,
    head: [],
    body: headerRows,
    theme: "plain",
    styles: {
      fontSize: 9,
      cellPadding: 2,
    },
    columnStyles: {
      0: {
        fontStyle: "bold",
        cellWidth: 50,
        textColor: colors.zinc700,
      },
      1: {
        textColor: colors.black,
      },
    },
    margin: { left: margin, right: margin },
  });

  yPos = pdf.lastAutoTable.finalY + 10;

  // ==================== LISTA DE EMPAQUE ====================
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...colors.zinc800);
  pdf.text("LISTA DE EMPAQUE", margin, yPos);
  yPos += 8;

  if (packingList.length > 0) {
    // Preparar columnas de la tabla
    const tableColumns = ["Producto", "Cantidad", "Unidad"];
    if (includeLot) tableColumns.push("Lote");
    if (includeItemNumber) tableColumns.push("Núm. Item");
    if (includeBarcode) tableColumns.push("Código Barras");

    // Preparar filas de datos
    const tableRows = packingList.map((row) => {
      const dataRow = [row.producto, row.cantidad, row.unidad];
      if (includeLot) dataRow.push(row.lote);
      if (includeItemNumber) dataRow.push(row.numeroItem);
      if (includeBarcode) dataRow.push(row.codigoBarras);
      return dataRow;
    });

    // Crear tabla con autoTable
    pdf.autoTable({
      startY: yPos,
      head: [tableColumns],
      body: tableRows,
      theme: "grid",
      headStyles: {
        fillColor: colors.emerald500,
        textColor: colors.white,
        fontSize: 9,
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: colors.black,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251], // Gris muy claro para filas alternas
      },
      columnStyles: {
        0: { cellWidth: "auto" }, // Producto
        1: { halign: "right", cellWidth: 25 }, // Cantidad
        2: { halign: "center", cellWidth: 20 }, // Unidad
        3: { cellWidth: "auto" }, // Lote
        4: { cellWidth: "auto" }, // Núm. Item
        5: { cellWidth: "auto" }, // Código Barras
      },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => {
        // Agregar número de página en el footer
        addPageFooter(pdf, pageWidth, pageHeight, margin);
      },
    });

    yPos = pdf.lastAutoTable.finalY + 10;
  } else {
    pdf.setFontSize(9);
    pdf.setTextColor(...colors.gray400);
    pdf.text("No hay productos en esta orden", margin, yPos);
    yPos += 10;
  }

  // Verificar si necesitamos nueva página para el resumen
  if (yPos > pageHeight - 60) {
    pdf.addPage();
    yPos = margin;
  }

  // ==================== RESUMEN ====================
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...colors.zinc800);
  pdf.text("RESUMEN", margin, yPos);
  yPos += 8;

  // Crear tabla de resumen
  const summaryRows = [];

  // Total de items
  summaryRows.push(["Total de Items", summary.totalItems.toString()]);

  // Total de cantidad (solo si las unidades son consistentes)
  if (summary.allUnitsConsistent && summary.totalQuantity !== null) {
    summaryRows.push([
      "Cantidad Total",
      `${format(summary.totalQuantity)} ${summary.unit}`,
    ]);
  } else {
    summaryRows.push([
      "Cantidad Total",
      "Unidades mixtas - ver detalle arriba",
    ]);
  }

  // Agregar espacio si hay totales monetarios
  if (summary.subtotal > 0) {
    summaryRows.push(["", ""]); // Fila vacía
    summaryRows.push(["Subtotal", format(summary.subtotal, "$")]);
    summaryRows.push(["IVA (19%)", format(summary.totalIVA, "$")]);
    summaryRows.push(["Total", format(summary.total, "$")]);
  }

  pdf.autoTable({
    startY: yPos,
    head: [],
    body: summaryRows,
    theme: "plain",
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    columnStyles: {
      0: {
        fontStyle: "bold",
        cellWidth: 50,
        textColor: colors.zinc700,
      },
      1: {
        halign: "right",
        textColor: colors.black,
      },
    },
    margin: { left: margin, right: margin },
    didDrawCell: (data) => {
      // Resaltar fila de Total
      if (
        data.row.index === summaryRows.length - 1 &&
        summary.subtotal > 0
      ) {
        pdf.setDrawColor(...colors.emerald500);
        pdf.setLineWidth(0.5);
        const cellY = data.cell.y;
        const cellHeight = data.cell.height;
        pdf.line(
          margin,
          cellY + cellHeight,
          pageWidth - margin,
          cellY + cellHeight
        );
      }
    },
  });

  // Agregar footer a la última página
  addPageFooter(pdf, pageWidth, pageHeight, margin);

  // Generar nombre de archivo
  const fileName = generateFileName(document, ".pdf");

  // Guardar PDF
  pdf.save(fileName);
}

/**
 * Agrega footer con número de página y fecha
 */
function addPageFooter(pdf, pageWidth, pageHeight, margin) {
  const pageNumber = pdf.internal.getNumberOfPages();
  const currentPage = pdf.internal.getCurrentPageInfo().pageNumber;

  pdf.setFontSize(8);
  pdf.setTextColor(156, 163, 175); // gray-400
  pdf.setFont("helvetica", "normal");

  // Número de página
  const pageText = `Página ${currentPage} de ${pageNumber}`;
  pdf.text(pageText, pageWidth - margin, pageHeight - 10, { align: "right" });

  // Fecha de generación
  const date = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  pdf.text(`Generado el ${date}`, margin, pageHeight - 10);
}
