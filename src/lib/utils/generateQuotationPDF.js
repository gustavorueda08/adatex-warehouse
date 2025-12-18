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
        (t) => t.shouldAppear !== false
      ) || [];
    const products = document.orderProducts || [];

    // --- LÓGICA DE CÁLCULO (Replicada de DocumentDetail) ---

    // Helper para condiciones
    const checkThreshold = (value, threshold, condition = ">=") => {
      switch (condition) {
        case ">":
          return value > threshold;
        case ">=":
          return value >= threshold;
        case "<":
          return value < threshold;
        case "<=":
          return value <= threshold;
        case "==":
          return value === threshold;
        default:
          return value >= threshold;
      }
    };

    // 1. Filtrar productos válidos
    const validProducts = products.filter(
      (product) => product.product && product.quantity !== ""
    );

    // 2. Paso 1: Calcular Subtotal Preliminar
    // Se usa para evaluar condiciones de impuestos tipo 'product-depending-subtotal'
    let subtotalPreliminar = 0;

    validProducts.forEach((product) => {
      const invoicePercentage = Number(product.invoicePercentage || 100) / 100;

      let rawQty = 0;
      if (document.state === "draft") {
        rawQty = Number(product.requestedQuantity || 0);
      } else {
        rawQty = Number(product.confirmedQuantity || 0);
      }

      const quantity = rawQty * invoicePercentage;
      const price = Number(product.price || 0);

      let baseLinea = 0;
      if (product.ivaIncluded) {
        baseLinea = (price * quantity) / 1.19;
      } else {
        baseLinea = price * quantity;
      }
      subtotalPreliminar += baseLinea;
    });

    // 3. Paso 2: Identificar Impuestos Condicionales
    const conditionalTaxesMap = {};
    activeTaxes.forEach((tax) => {
      if (tax.applicationType === "product-depending-subtotal") {
        const threshold = Number(tax.treshold || 0);
        const applies = checkThreshold(
          subtotalPreliminar,
          threshold,
          tax.tresholdCondition
        );
        if (applies) {
          conditionalTaxesMap[tax.id] = true;
        }
      }
    });

    // 4. Paso 3: Calcular Detalle por Item y Acumular Impuestos
    let invoiceSubtotal = 0;
    const taxesAccumulated = {}; // taxId -> amount
    const itemsForTable = [];

    validProducts.forEach((product) => {
      const invoicePercentage = Number(product.invoicePercentage || 100) / 100;

      let rawQty = 0;
      if (document.state === "draft") {
        rawQty = Number(product.requestedQuantity || 0);
      } else {
        rawQty = Number(product.confirmedQuantity || 0);
      }

      const quantity = rawQty * invoicePercentage;
      const price = Number(product.price || 0);

      // Calcular Total Bruto esperado para el item
      const itemGrossTotal = price * quantity;

      // Calcular Base del Item (inicial)
      let baseItem = 0;
      let unitPriceBase = 0; // Precio unitario base para mostrar

      if (product.ivaIncluded) {
        baseItem = itemGrossTotal / 1.19;
        unitPriceBase = price / 1.19;
      } else {
        baseItem = itemGrossTotal;
        unitPriceBase = price;
      }

      // Calcular impuestos por item para acumular
      let itemTotalTaxAmount = 0;
      let totalApplicableTaxRate = 0;

      activeTaxes.forEach((tax) => {
        let applies = false;
        if (tax.applicationType === "product") applies = true;
        if (
          tax.applicationType === "product-depending-subtotal" &&
          conditionalTaxesMap[tax.id]
        )
          applies = true;

        if (applies) {
          let taxValue = baseItem * Number(tax.amount || 0);
          taxValue = Math.round(taxValue * 100) / 100;

          if (!taxesAccumulated[tax.id]) taxesAccumulated[tax.id] = 0;
          taxesAccumulated[tax.id] += taxValue;

          itemTotalTaxAmount += taxValue;
          totalApplicableTaxRate += Number(tax.amount || 0);
        }
      });

      // AJUSTE CRÍTICO DE REDONDEO:
      // Si el IVA está incluido (y es el único - 19%), ajustamos la base.
      // Si hay otros impuestos, respetamos la lógica de adición.
      if (
        product.ivaIncluded &&
        Math.abs(totalApplicableTaxRate - 0.19) < 0.01
      ) {
        baseItem = itemGrossTotal - itemTotalTaxAmount;
        // No ajustamos unitPriceBase para visualización, se mantiene aproximado
      }

      invoiceSubtotal += baseItem;

      itemsForTable.push({
        name: product.product?.name || product.name || "Producto",
        quantity: quantity, // Cantidad facturable
        unitPrice: unitPriceBase,
        totalBase: baseItem,
      });
    });

    // Redondear Subtotal final
    invoiceSubtotal = Math.round(invoiceSubtotal * 100) / 100;

    // 5. Paso 5: Calcular Retenciones (subtotal taxes)
    const retentionTaxes = [];
    activeTaxes.forEach((tax) => {
      if (tax.applicationType === "subtotal") {
        const threshold = Number(tax.treshold || 0);
        const applies = checkThreshold(
          invoiceSubtotal,
          threshold,
          tax.tresholdCondition
        );

        if (applies) {
          let val = invoiceSubtotal * Number(tax.amount || 0);
          val = Math.round(val * 100) / 100;
          retentionTaxes.push({
            ...tax,
            calculatedAmount: val,
          });
        }
      }
    });

    // 6. Paso 6: Total Final
    let total = invoiceSubtotal;
    const finalTaxList = [];

    // Agregar Product Taxes
    activeTaxes.forEach((tax) => {
      if (taxesAccumulated[tax.id]) {
        const amount = taxesAccumulated[tax.id];
        finalTaxList.push({
          id: tax.id,
          name: tax.name,
          amount: amount,
          use: tax.use,
        });

        if (tax.use === "decrement") {
          total -= amount;
        } else {
          total += amount;
        }
      }
    });

    // Agregar Retenciones
    retentionTaxes.forEach((ret) => {
      finalTaxList.push({
        id: ret.id,
        name: ret.name,
        amount: ret.calculatedAmount,
        use: ret.use,
      });

      if (ret.use === "decrement") {
        total -= ret.calculatedAmount;
      } else {
        total += ret.calculatedAmount;
      }
    });

    total = Math.round(total * 100) / 100;

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
        { align: "right" }
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
            logoHeight
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
