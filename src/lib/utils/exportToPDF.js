import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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

/**
 * Exporta un documento a formato PDF con diseño profesional
 * Compatible con todos los tipos de documentos
 * Genera un PDF con lista de empaque transpuesta y resumen detallado
 *
 * @param {Object} document - Documento completo del sistema
 * @param {Object} _options - Opciones de exportación (reservado para futuras extensiones)
 * @returns {Promise<boolean>} - True si la exportación fue exitosa
 */
export async function exportDocumentToPDF(document, _options = {}) {
  try {
    // Validación de entrada
    if (!document || !document.type) {
      throw new Error("Documento inválido o sin tipo especificado");
    }

    // Preparar datos normalizados
    const data = prepareDocumentData(document);
    const packingList = transformToPackingListStructure(document);

    // Obtener datos procesados para la tabla transpuesta
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

    // Determinar orientación y configuración del documento
    const maxColumnsPerTable = 12;
    const needsMultipleTables = namesRow.length > maxColumnsPerTable;
    const isLandscape = namesRow.length > 3;
    const orientation = isLandscape ? "landscape" : "portrait";

    // Crear documento PDF
    const doc = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: "letter",
    });

    // Dimensiones y márgenes
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const usableWidth = pageWidth - margin * 2;

    // Cargar y agregar logo
    await addLogoToPDF(doc, pageWidth, margin);

    let currentY = margin + 15;

    // Título principal
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(getDocumentTitle(data.type).toUpperCase(), margin, currentY);
    currentY += 10;

    // NIT
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("NIT: 901.738.541-1", pageWidth - margin - 40, currentY);
    currentY += 8;

    // Información del documento
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");

    const documentInfo = [
      `FECHA: ${moment(data.createdDate, "DD/MM/YYYY").format("DD-MM-YY")}`,
      `${data.entityLabel.toUpperCase()}: ${data.entityName}`,
      `DIRECCIÓN: ${data.entityAddress}`,
      `${data.type === "sale" ? "FACTURA" : "CÓDIGO"}: ${data.code}`,
    ];

    documentInfo.forEach((info) => {
      doc.text(info, margin, currentY);
      currentY += 6;
    });

    currentY += 5;

    // Función interna para crear tablas
    function createTable(headers, data, totals, rollCounts, startY) {
      // Preparar datos con fila vacía inicial para etiquetas
      const tableData = data.map((row) => [
        "",
        ...row.map((cell) => (cell != null ? format.roundNumber(cell) : "")),
      ]);

      // Agregar fila de totales
      tableData.push([
        getTotalUnitString(packingList, true),
        ...totals.map((total) => format.roundNumber(total)),
      ]);

      // Agregar fila de conteo de rollos/items
      tableData.push([
        "TOTAL EMPAQUES",
        ...rollCounts.map((count) => count.toString()),
      ]);

      // Headers con columna vacía inicial
      const tableHeaders = ["", ...headers];

      // Configuración de tabla
      const tableConfig = {
        head: [tableHeaders],
        body: tableData,
        startY: startY,
        theme: "grid",
        styles: {
          fontSize: Math.max(6, Math.min(9, 100 / headers.length)),
          cellPadding: 1.5,
          halign: "center",
          valign: "middle",
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          fontSize: Math.max(7, Math.min(10, 105 / headers.length)),
        },
        columnStyles: {
          0: { cellWidth: 28, halign: "left", fontStyle: "bold" },
        },
        margin: { left: margin, right: margin },
        tableWidth: usableWidth,
        didParseCell: function (cellData) {
          const isLastRow = cellData.row.index === tableData.length - 1;
          const isSecondLastRow = cellData.row.index === tableData.length - 2;

          if (isLastRow || isSecondLastRow) {
            cellData.cell.styles.fontStyle = "bold";
            cellData.cell.styles.fillColor = [230, 230, 230];
          }
        },
      };

      // Distribuir ancho de columnas equitativamente
      const dataColumnCount = headers.length;
      const remainingWidth = usableWidth - 28;
      const dataColumnWidth = remainingWidth / dataColumnCount;

      for (let i = 1; i <= dataColumnCount; i++) {
        tableConfig.columnStyles[i] = { cellWidth: dataColumnWidth };
      }

      // Generar tabla
      autoTable(doc, tableConfig);

      return doc.lastAutoTable.finalY;
    }

    // Crear tabla(s) principal(es)
    if (needsMultipleTables) {
      // Dividir en múltiples tablas si hay muchos productos
      const chunks = chunkArray(namesRow, maxColumnsPerTable);
      const totalChunks = chunkArray(totalByColumn, maxColumnsPerTable);
      const rollCountChunks = chunkArray(totalItems, maxColumnsPerTable);

      let tableStartY = currentY;

      for (let i = 0; i < chunks.length; i++) {
        // Título de tabla
        if (chunks.length > 1) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(`TABLA ${i + 1} de ${chunks.length}`, margin, tableStartY);
          tableStartY += 8;
        }

        // Extraer datos correspondientes a este chunk
        const chunkData = quantitiesRows.map((row) =>
          row.slice(i * maxColumnsPerTable, (i + 1) * maxColumnsPerTable)
        );

        const finalY = createTable(
          chunks[i],
          chunkData,
          totalChunks[i],
          rollCountChunks[i],
          tableStartY
        );

        // Manejar paginación
        if (i < chunks.length - 1) {
          if (finalY + 50 > pageHeight) {
            doc.addPage();
            tableStartY = margin;
          } else {
            tableStartY = finalY + 15;
          }
        } else {
          currentY = finalY + 10;
        }
      }
    } else {
      // Una sola tabla
      currentY = createTable(
        namesRow,
        quantitiesRows,
        totalByColumn,
        totalItems,
        currentY
      );
    }

    // Resumen general (si hay espacio)
    if (currentY < pageHeight - 80) {
      currentY += 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RESUMEN GENERAL", margin, currentY);
      currentY += 8;

      const summaryData = [
        [
          getTotalUnitString(packingList, true),
          format.roundNumber(totalQuantity),
        ],
        ["TOTAL EMPAQUES", itemsCount.toString()],
      ];

      autoTable(doc, {
        body: summaryData,
        startY: currentY,
        theme: "grid",
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 55, fontStyle: "bold", halign: "left" },
          1: { cellWidth: 30, halign: "center", fontStyle: "bold" },
        },
        margin: { left: margin },
      });
    }

    // Agregar página de resumen detallado
    doc.addPage();
    await generateDetailedResumePDF(doc, packingList, data);

    // Generar nombre del archivo y descargar
    const fileName = generateFileName(document, ".pdf");
    doc.save(fileName);

    console.log("PDF generado exitosamente:", fileName);
    return true;
  } catch (error) {
    console.error("Error al exportar el archivo PDF:", error);
    throw new Error(`No se pudo exportar el documento a PDF: ${error.message}`);
  }
}

/**
 * Agrega el logo al PDF si está disponible
 * @private
 */
async function addLogoToPDF(doc, pageWidth, margin) {
  try {
    const imageUrl = "/logo-horizontal.png";
    const response = await fetch(imageUrl);

    if (!response.ok) {
      console.warn("Logo no encontrado, se omitirá");
      return;
    }

    const blob = await response.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const imgData = e.target.result;
          const logoWidth = 70;
          const logoHeight = 10;
          doc.addImage(
            imgData,
            "PNG",
            pageWidth - logoWidth - margin,
            margin,
            logoWidth,
            logoHeight
          );
        } catch (error) {
          console.warn("Error al agregar logo:", error);
        }
        resolve();
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("No se pudo cargar el logo:", error);
  }
}

/**
 * Genera la página de resumen detallado del PDF
 * @private
 */
async function generateDetailedResumePDF(doc, packingList, data) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let currentY = margin + 15;

  // Agregar logo en página de resumen
  await addLogoToPDF(doc, pageWidth, margin);

  // Título
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN DETALLADO", margin, currentY);
  currentY += 10;

  // NIT
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("NIT: 901.738.541-1", pageWidth - margin - 40, currentY);
  currentY += 8;

  // Información del documento
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");

  const documentInfo = [
    `FECHA: ${moment(data.createdDate, "DD/MM/YYYY").format("DD-MM-YY")}`,
    `${data.entityLabel.toUpperCase()}: ${data.entityName}`,
    `${data.type === "sale" ? "FACTURA" : "CÓDIGO"}: ${data.code}`,
  ];

  documentInfo.forEach((info) => {
    doc.text(info, margin, currentY);
    currentY += 6;
  });

  currentY += 10;

  // Obtener items del resumen
  const resumeItems = getResumeItemsFromPackingList(packingList);

  // Crear tabla de resumen
  const tableData = resumeItems.map((item) => [
    item.name,
    format.roundNumber(item.totalQuantity),
    item.count.toString(),
    item.unit,
  ]);

  // Agregar fila de totales
  const totalQuantity = resumeItems.reduce(
    (acc, item) => acc + Number(item.totalQuantity || 0),
    0
  );
  const totalCount = resumeItems.reduce(
    (acc, item) => acc + Number(item.count || 0),
    0
  );

  tableData.push([
    "TOTALES",
    format.roundNumber(totalQuantity),
    totalCount.toString(),
    "",
  ]);

  autoTable(doc, {
    head: [["PRODUCTO", "CANTIDAD", "EMPAQUES", "UNIDAD"]],
    body: tableData,
    startY: currentY,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 3,
      halign: "center",
      valign: "middle",
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: 80, halign: "left" },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
    },
    margin: { left: margin, right: margin },
    didParseCell: function (cellData) {
      // Destacar última fila (totales)
      if (cellData.row.index === tableData.length - 1) {
        cellData.cell.styles.fontStyle = "bold";
        cellData.cell.styles.fillColor = [230, 230, 230];
      }
    },
  });
}

/**
 * Divide un array en chunks de tamaño específico
 * @private
 */
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
