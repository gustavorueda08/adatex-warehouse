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
 * Dibuja una etiqueta individual en el PDF
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
  const margin = 20;
  const contentWidth = width - margin * 2;

  // Fondo blanco
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, width, height, "F");

  // Borde
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(1);
  pdf.rect(margin / 2, margin / 2, width - margin, height - margin);

  // Título del producto
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(51, 51, 51);

  const productName = truncateText(product.name, 40);
  const titleY = margin + 10;
  pdf.text(productName, width / 2, titleY, { align: "center" });

  // Generar código de barras
  const barcodeCanvas = document.createElement("canvas");
  try {
    JsBarcode(barcodeCanvas, item.barcode, {
      format: "CODE128",
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 12,
      margin: 0,
      background: "#ffffff",
      lineColor: "#000000",
    });

    // Agregar código de barras al PDF
    const barcodeImg = barcodeCanvas.toDataURL("image/png");
    const barcodeWidth = contentWidth * 0.8;
    const barcodeHeight = 60;
    const barcodeX = (width - barcodeWidth) / 2;
    const barcodeY = titleY + 20;

    pdf.addImage(
      barcodeImg,
      "PNG",
      barcodeX,
      barcodeY,
      barcodeWidth,
      barcodeHeight
    );

    // Información del item
    const infoY = barcodeY + barcodeHeight + 15;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");

    // Cantidad
    const quantityText = `Cantidad: ${format(item.quantity)} ${product.unit}`;
    pdf.text(quantityText, width / 2, infoY, { align: "center" });

    // ID del item (si existe)
    if (item.id) {
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`ID: ${item.id}`, width / 2, infoY + 15, { align: "center" });
    }

    // Contador de página
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 51, 51);
    const pageText = `Página ${pageNum} de ${totalPages}`;
    pdf.text(pageText, width - margin, height - margin + 5, { align: "right" });
  } catch (error) {
    console.error("Error generando código de barras:", error);

    // Fallback: mostrar el código como texto
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Código: ${item.barcode}`, width / 2, height / 2, {
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
