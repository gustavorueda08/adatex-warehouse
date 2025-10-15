"use client";

import DocumentListPage from "@/components/documents/DocumentListPage";

export default function ReturnsPage() {
  return (
    <DocumentListPage
      documentType="return"
      title="Devoluciones"
      relationField="sourceOrder"
      relationLabel="Orden original"
      getDetailPath={(order) => `/returns/${order.id}`}
      showPricing={false}
      bulkActions={[]}
      createPath="/new-return"
    />
  );
}
