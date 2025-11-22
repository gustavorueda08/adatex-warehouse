function getInvoiceNumberTypeA(order) {
  return (
    order.invoiceNumberTypeA ||
    order.invoiceNumber ||
    order.siigoIdTypeA ||
    order.siigoId ||
    null
  );
}

function getInvoiceNumberTypeB(order) {
  return order.invoiceNumberTypeB || order.siigoIdTypeB || null;
}

export function buildInvoiceLabel(order) {
  const invoiceA = getInvoiceNumberTypeA(order);
  const invoiceB = getInvoiceNumberTypeB(order);
  const parts = [];

  if (invoiceA) {
    parts.push(`ADTX-${invoiceA}`);
  }

  if (invoiceB) {
    parts.push(`AD-${invoiceB}`);
  }

  const code = order.code || `ORDER-${order.id}`;
  if (code) {
    parts.push(code);
  }

  return parts.join(" | ");
}
