import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";
import format from "./format";

/**
 * Genera etiquetas con código de barras en PDF
 * @param {Array} data - Array de productos con estructura: [{ id, name, items: [{ id, name, barcode, quantity }] }]
 * @param {Object} options - Opciones de configuración
 * @param {number} options.width - Ancho de la etiqueta en cm (default: 10)
 * @param {number} options.height - Alto de la etiqueta en cm (default: 5)
 * @param {boolean} options.separateFiles - Si true, genera un PDF por producto (default: false)
 */
export async function generateLabels(data, options = {}) {
  const { width = 10, height = 5, separateFiles = false } = options;

  // Convertir cm a puntos (1 cm = 28.35 puntos)
  const widthPt = width * 28.35;
  const heightPt = height * 28.35;

  if (separateFiles) {
    // Generar un PDF por cada producto
    for (const product of data) {
      await generateProductPDF(product, widthPt, heightPt);
    }
  } else {
    // Generar un solo PDF con todos los productos
    await generateSinglePDF(data, widthPt, heightPt);
  }
}

/**
 * Genera un PDF con todas las etiquetas
 */
async function generateSinglePDF(data, widthPt, heightPt) {
  const pdf = new jsPDF({
    orientation: widthPt > heightPt ? "landscape" : "portrait",
    unit: "pt",
    format: [widthPt, heightPt],
  });

  let isFirstPage = true;

  for (const product of data) {
    for (let i = 0; i < product.items.length; i++) {
      if (!isFirstPage) {
        pdf.addPage([widthPt, heightPt]);
      }
      isFirstPage = false;

      const item = product.items[i];
      await drawLabel(
        pdf,
        product,
        item,
        i + 1,
        product.items.length,
        widthPt,
        heightPt
      );
    }
  }

  pdf.save("etiquetas_completas.pdf");
}

/**
 * Genera un PDF por producto
 */
async function generateProductPDF(product, widthPt, heightPt) {
  const pdf = new jsPDF({
    orientation: widthPt > heightPt ? "landscape" : "portrait",
    unit: "pt",
    format: [widthPt, heightPt],
  });

  for (let i = 0; i < product.items.length; i++) {
    if (i > 0) {
      pdf.addPage([widthPt, heightPt]);
    }

    const item = product.items[i];
    await drawLabel(
      pdf,
      product,
      item,
      i + 1,
      product.items.length,
      widthPt,
      heightPt
    );
  }

  // Nombre de archivo sanitizado
  const filename = `etiquetas_${sanitizeFilename(product.name)}.pdf`;
  pdf.save(filename);
}

/**
 * Dibuja una etiqueta individual en el PDF con diseño moderno y limpio
 */
async function drawLabel(
  pdf,
  product,
  item,
  pageNum,
  totalPages,
  width,
  height
) {
  const margin = 15;
  const contentWidth = width - margin * 2;

  // Fondo blanco general
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, width, height, "F");

  // === HEADER LIMPIO ===
  const headerHeight = 35;

  // Línea separadora superior
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(2);
  pdf.line(margin, margin, width - margin, margin);

  // Título del producto
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);

  const productName = truncateText(product.name, 45);
  const titleY = margin + 20;
  pdf.text(productName, width / 2, titleY, { align: "center" });

  // === SECCIÓN CÓDIGO DE BARRAS ===
  const barcodeCanvas = document.createElement("canvas");
  try {
    JsBarcode(barcodeCanvas, item.barcode, {
      format: "CODE128",
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 14,
      margin: 0,
      background: "#ffffff",
      lineColor: "#000000",
    });

    // Agregar código de barras al PDF
    const barcodeSectionY = margin + headerHeight + 8;
    const barcodeImg = barcodeCanvas.toDataURL("image/png");
    const barcodeWidth = contentWidth * 0.85;
    const barcodeHeight = 65;
    const barcodeX = (width - barcodeWidth) / 2;
    const barcodeY = barcodeSectionY;

    pdf.addImage(
      barcodeImg,
      "PNG",
      barcodeX,
      barcodeY,
      barcodeWidth,
      barcodeHeight
    );

    // === LÍNEA SEPARADORA ===
    const dividerY = barcodeY + barcodeHeight + 12;
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(1);
    pdf.line(margin + 10, dividerY, width - margin - 10, dividerY);

    // === INFORMACIÓN DEL ITEM ===
    const infoStartY = dividerY + 16;

    // Nombre del item (si existe y es diferente del producto)
    let currentY = infoStartY;
    if (item.name && item.name !== product.name) {
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 0, 0);
      const itemName = truncateText(item.name, 50);
      pdf.text(itemName, width / 2, currentY, { align: "center" });
      currentY += 15;
    }

    // Cantidad del item usando currentQuantity
    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);

    const quantity = item.currentQuantity || item.quantity || 0;
    const quantityText = `Cantidad: ${format(quantity)} ${product.unit || ''}`;
    pdf.text(quantityText, width / 2, currentY, { align: "center" });

    // ID del item (si existe)
    if (item.id) {
      const idY = currentY + 15;

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0, 0, 0);
      pdf.text(`ID: ${item.id}`, width / 2, idY, { align: "center" });
    }

    // === CONTADOR DE PÁGINA ===
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    const pageText = `${pageNum}/${totalPages}`;
    pdf.text(pageText, width - margin, height - margin + 3, { align: "right" });

  } catch (error) {
    console.error("Error generando código de barras:", error);

    // Fallback: mostrar el código como texto
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("ERROR AL GENERAR CÓDIGO", width / 2, height / 2 - 10, {
      align: "center",
    });

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Código: ${item.barcode}`, width / 2, height / 2 + 5, {
      align: "center",
    });
  }
}

/**
 * Trunca el texto si excede el límite
 */
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Sanitiza el nombre del archivo
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .toLowerCase()
    .substring(0, 50);
}
