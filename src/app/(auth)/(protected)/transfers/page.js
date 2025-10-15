"use client";

import DocumentListPage from "@/components/documents/DocumentListPage";

export default function TransformationsPage() {
  return (
    <DocumentListPage
      documentType="transfer"
      title="Transferencias entre Bodegas"
      relationField="customer"
      relationLabel="Cliente"
      getDetailPath={(order) => `/transfers/${order.id}`}
      showPricing={false}
      bulkActions={[]}
      createPath="/new-transfer"
    />
  );
}
