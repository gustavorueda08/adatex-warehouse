export function generateOrderInvoiceCodeLabel(order) {
  if (!order) return "";
  const { invoiceNumberTypeA = null, invoiceNumberTypeB = null } = order;
  if (!invoiceNumberTypeA && !invoiceNumberTypeB) return "";
  let invoiceCodeLabel = "";
  if (invoiceNumberTypeA) {
    invoiceCodeLabel = `ADTX-${invoiceNumberTypeA}`;
  }
  if (invoiceNumberTypeB) {
    invoiceCodeLabel += ` | AD-${invoiceNumberTypeB}`;
  }
  return invoiceCodeLabel;
}
