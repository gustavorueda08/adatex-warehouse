import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-timezone";
import format from "./format";

/**
 * Genera un PDF de cotización para una orden de venta.
 * Replica exactamente la lógica de cálculo de impuestos del backend/frontend (DocumentDetail).
 *
 * @param {Object} document - El documento de la orden (venta).
 */
export async function generateQuotationPDF(document) {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    // Configuración inicial
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const activeTaxes =
      document.customerForInvoice?.taxes?.filter(
        (t) =>
          t.shouldAppear !== false && t.applicationType !== "self-retention",
      ) || [];
    const products = document.orderProducts || [];

    // --- LÓGICA DE CÁLCULO (Adaptada de PInvoice) ---

    // Helper para condiciones
    const checkThreshold = (value, threshold, condition) => {
      switch (condition) {
        case "greaterThan":
          return value > threshold;
        case "greaterThanOrEqualTo":
          return value >= threshold;
        case "lessThan":
          return value < threshold;
        case "lessThanOrEqualTo":
          return value <= threshold;
        default:
          return value >= threshold;
      }
    };

    // 1. Filtrar productos válidos
    const validProducts =
      document?.orderProducts?.filter((p) => p.product) || [];

    // 2. Calcular Subtotal, Subtotal para impuestos y bases
    let subtotalForTaxes = 0;

    // Calcular subtotal acumulado y preparar items
    const subtotal = validProducts.reduce((acc, product) => {
      const { invoicePercentage = 0, ivaIncluded = false } = product;

      let quantity = 0;
      if (document.state === "draft") {
        quantity = Number(product.requestedQuantity || 0);
      } else {
        quantity = Number(product.confirmedQuantity || 0);
      }

      let price = Number(product.price) || 0;

      if (ivaIncluded) {
        price = price / (1 + 0.19 * (Number(invoicePercentage) / 100));
      }

      subtotalForTaxes +=
        price * Number(quantity) * (Number(invoicePercentage) / 100);

      return acc + price * Number(quantity);
    }, 0);

    let total = subtotal;

    // 3. Impuestos aplicados (Globales, no por item en este paso)
    const appliedTaxes = activeTaxes
      .filter(
        (t) =>
          t.applicationType !== "self-retention" &&
          checkThreshold(
            subtotalForTaxes,
            Number(t.treshold),
            t.tresholdCondition || t.tresholdContidion,
          ),
      )
      .map((t) => {
        const value = subtotalForTaxes * Number(t.amount);
        total = t.use === "increment" ? total + value : total - value;
        return {
          ...t,
          value,
        };
      });

    // 4. Preparar items para la tabla (con precios calculados/visuales)
    const itemsForTable = validProducts.map((p) => {
      const { invoicePercentage, ivaIncluded } = p;

      let quantity = 0;
      if (document.state === "draft") {
        quantity = Number(p.requestedQuantity || 0);
      } else {
        quantity = Number(p.confirmedQuantity || 0);
      }

      let price = Number(p.price);

      // La lógica de PInvoice recalcula price redondeado para visualización
      let calculatedPrice = price;

      if (ivaIncluded) {
        calculatedPrice =
          Math.round(
            (price / (1 + 0.19 * (Number(invoicePercentage) / 100))) * 100,
          ) / 100;
      }

      const calculatedBase = Math.round(calculatedPrice * quantity * 100) / 100;

      return {
        name: p.product?.name || p.name || "Producto",
        quantity: quantity,
        unitPrice: calculatedPrice,
        totalBase: calculatedBase,
      };
    });

    const invoiceSubtotal = Math.round(subtotal * 100) / 100;
    total = Math.round(total * 100) / 100;

    // 5. Preparar lista final de impuestos para mostrar
    // En PInvoice, appliedTaxes ya tiene el valor calculado correcto.
    const finalTaxList = appliedTaxes.map((t) => ({
      id: t.id,
      name: t.name,
      amount: t.value,
      use: t.use,
    }));

    // --- GENERACIÓN DEL PDF ---

    // 1. Logo
    await addLogoToPDF(doc, pageWidth, margin);

    // 2. Encabezado
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("COTIZACIÓN", margin, margin, { baseline: "top" });

    let currentY = margin + 15;

    // Info derecha
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const rightX = pageWidth - margin;
    doc.text(`FECHA: ${moment().format("DD/MM/YYYY")}`, rightX, currentY, {
      align: "right",
    });
    doc.text(`CÓDIGO: ${document.code || "N/A"}`, rightX, currentY + 5, {
      align: "right",
    });

    currentY += 15;

    // 3. Info Cliente
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENTE:", margin, currentY);
    doc.setFont("helvetica", "normal");

    const customerName = document.customer?.name
      ? `${document.customer.name} ${document.customer.lastName || ""}`
      : "N/A";
    const customerFullName = document.customer?.name
      ? `${document.customer.name} ${document.customer.lastName || ""}`.trim()
      : "Cliente";

    const customerPhone = document.customer?.phone || "";
    const customerAddress = document.customer?.address || "";

    // Reduced margin from +25 to +20
    doc.text(customerName, margin + 18, currentY);
    currentY += 5;
    if (customerPhone) {
      doc.text(`Tel: ${customerPhone}`, margin, currentY);
      currentY += 5;
    }
    if (customerAddress) {
      doc.text(`Dir: ${customerAddress}`, margin, currentY);
      currentY += 5;
    }

    // Info Facturar A
    if (
      document.customerForInvoice &&
      document.customerForInvoice.id !== document.customer?.id
    ) {
      currentY += 5;
      doc.setFont("helvetica", "bold");
      doc.text("FACTURAR A:", margin, currentY);
      doc.setFont("helvetica", "normal");
      const invoiceName = `${document.customerForInvoice.name} ${
        document.customerForInvoice.lastName || ""
      }`;
      doc.text(invoiceName, margin + 28, currentY);
      currentY += 5;
      if (document.customerForInvoice.nit) {
        doc.text(`NIT: ${document.customerForInvoice.nit}`, margin, currentY);
        currentY += 5;
      }
    }

    currentY += 10;

    // 4. Tabla de items
    const tableBody = itemsForTable.map((item) => [
      item.name,
      format(item.unitPrice, "$"),
      format(item.quantity),
      format(item.totalBase, "$"),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["Producto", "Precio", "Cantidad", "Total"]],
      body: tableBody,
      theme: "plain",
      styles: {
        halign: "left",
        cellPadding: 2,
        fontSize: 9,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        halign: "left", // All headers left aligned
      },
      columnStyles: {
        0: { halign: "left" },
      },
      margin: { left: margin, right: margin },
    });

    currentY = doc.lastAutoTable.finalY + 10;

    // 5. Totales
    // Calcular altura necesaria para el bloque de totales
    // Subtotal (6) + Impuestos (N * 6) + Linea (6) + Total (6) + Buffer (10)
    const neededHeight = (1 + finalTaxList.length + 1 + 1) * 6 + 10;

    // Evitar salto de pagina cortando totales si es posible, o agregar pagina
    if (currentY + neededHeight > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      currentY = margin;
    }

    const startX = pageWidth / 2 + 10;

    // Subtotal
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", startX, currentY);
    doc.text(format(invoiceSubtotal, "$"), pageWidth - margin, currentY, {
      align: "right",
    });
    currentY += 6;

    // Impuestos
    finalTaxList.forEach((tax) => {
      doc.text(`${tax.name}:`, startX, currentY);
      // Si es decrement, mostrar com negativo visualmente? No necesario si el label es claro,
      // pero normalmente en contabilidad se restan.
      // As standard convention:
      const sign = tax.use === "decrement" ? "-" : "";
      doc.text(
        `${sign}${format(tax.amount, "$")}`,
        pageWidth - margin,
        currentY,
        { align: "right" },
      );
      currentY += 6;
    });

    // Línea divisoria
    doc.setDrawColor(200);
    doc.line(startX, currentY, pageWidth - margin, currentY);
    currentY += 6;

    // Total
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL:", startX, currentY);
    doc.text(format(total, "$"), pageWidth - margin, currentY, {
      align: "right",
    });

    // Guardar
    // Format: [Codigo] - [Nombre cliente] [(fecha)].pdf
    const dateStr = moment().format("DD-MM-YYYY");
    const filename = `${
      document.code || "Order"
    } - ${customerFullName} (${dateStr}).pdf`;
    doc.save(filename);
  } catch (error) {
    console.error("Error generating quotation PDF:", error);
    throw error;
  }
}

/**
 * Agrega el logo al PDF si está disponible
 * @private
 */
async function addLogoToPDF(doc, pageWidth, margin) {
  try {
    const imageUrl = "/logo-gray.png";
    const response = await fetch(imageUrl);

    if (!response.ok) {
      // Fallback or ignore
      return;
    }

    const blob = await response.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const imgData = e.target.result;
          const logoWidth = 50;
          // Mantener aspect ratio aprox
          const logoHeight = 8;
          doc.addImage(
            imgData,
            "PNG",
            pageWidth - logoWidth - margin,
            margin,
            logoWidth,
            logoHeight,
          );
        } catch (error) {
          console.warn("Error agregando logo:", error);
        }
        resolve();
      };
      reader.onerror = resolve; // Continue even if error
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("No se pudo cargar el logo:", error);
  }
}
