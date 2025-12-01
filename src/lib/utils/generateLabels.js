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
  const margin = 12;
  const contentWidth = width - margin * 2;

  // Fondo blanco simple
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, width, height, "F");

  // Producto (nombre)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(20, 24, 33);
  const productName = truncateText(product.name || "Producto", 70);
  const titleY = margin + 12;
  pdf.text(productName, margin, titleY, { align: "left" });

  // Cantidad
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(55, 65, 81);
  const qty = item.currentQuantity || item.quantity || 0;
  const unit = product.unit ? ` ${product.unit}` : "";
  const quantityY = titleY + 14;
  pdf.text(`Cantidad: ${format(qty)}${unit}`, margin, quantityY, {
    align: "left",
  });

  // Código de barras
  const barcodeCanvas = document.createElement("canvas");
  try {
    JsBarcode(barcodeCanvas, item.barcode, {
      format: "CODE128",
      width: 1.6,
      height: 55,
      displayValue: true,
      fontSize: 11,
      textMargin: 4,
      margin: 0,
      background: "#ffffff",
      lineColor: "#111827",
    });

    const barcodeImg = barcodeCanvas.toDataURL("image/png");
    const barcodeWidth = contentWidth * 0.92;
    const barcodeHeight = 60;
    const barcodeX = (width - barcodeWidth) / 2;
    const barcodeY = quantityY + 12;

    pdf.addImage(
      barcodeImg,
      "PNG",
      barcodeX,
      barcodeY,
      barcodeWidth,
      barcodeHeight
    );

    // Información adicional debajo del código
    let currentY = barcodeY + barcodeHeight + 10;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(30, 41, 59);
    if (item.name && item.name !== product.name) {
      pdf.text(truncateText(item.name, 70), margin, currentY, {
        align: "left",
      });
      currentY += 12;
    }

    const details = [];
    if (item.lotNumber || item.lot)
      details.push(`Lote: ${item.lotNumber || item.lot}`);
    if (item.itemNumber) details.push(`Item: ${item.itemNumber}`);

    if (details.length) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(71, 85, 105);
      pdf.text(details.join("   •   "), margin, currentY, { align: "left" });
      currentY += 10;
    }

    // Footer fijo al final
    const footerY = height - margin + 2;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(107, 114, 128);
    if (item.id) {
      pdf.text(`ID: ${item.id}`, margin, footerY, { align: "left" });
    }
    pdf.text(`${pageNum}/${totalPages}`, width - margin, footerY, {
      align: "right",
    });
  } catch (error) {
    console.error("Error generando código de barras:", error);
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
