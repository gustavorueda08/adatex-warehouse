"use client";

import DocumentListPage from "@/components/documents/DocumentListPage";

export default function TransformationsPage() {
  return (
    <DocumentListPage
      documentType="transform"
      title="Transformaciones"
      getDetailPath={(order) => `/transformations/${order.id}`}
      showPricing={false}
      bulkActions={[]}
      createPath="/new-transform"
    />
  );
}
