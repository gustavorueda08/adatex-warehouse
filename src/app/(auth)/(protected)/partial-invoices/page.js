"use client";

import DocumentListPage from "@/components/documents/DocumentListPage";

export default function PartialInvoicesPage() {
  return (
    <DocumentListPage
      documentType="partial-invoice"
      title="Facturas Parciales"
      relationField="customer"
      relationLabel="Cliente"
      getDetailPath={(order) => `/partial-invoices/${order.id}`}
      showPricing={false}
      bulkActions={[]}
      createPath="/new-partial-invoice"
      customColumns={[]}
    />
  );
}
