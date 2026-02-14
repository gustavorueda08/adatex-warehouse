export const getDocumentLabel = (
  document,
  filters = {
    includeCode: false,
    includeContainerCode: true,
    includeInvoices: true,
  },
) => {
  if (!document) return "";

  const {
    includeCode = false,
    includeContainerCode = true,
    includeInvoices = true,
  } = filters || {};

  const parts = [];

  // 1. Add Code if requested and present
  if (includeCode && document.code) {
    parts.push(document.code);
  }

  // 2. Add Container Code if requested and present
  if (includeContainerCode && document.containerCode) {
    parts.push(document.containerCode);
  }

  // 3. Add Invoices if requested
  if (includeInvoices) {
    // Add Invoice Type A if present
    if (document.invoiceNumberTypeA) {
      parts.push(`ADTX-${document.invoiceNumberTypeA}`);
    }

    // Add Invoice Type B if present
    if (document.invoiceNumberTypeB) {
      parts.push(`AD-${document.invoiceNumberTypeB}`);
    }
  }

  // Join parts with the separator
  return parts.join(" | ");
};
