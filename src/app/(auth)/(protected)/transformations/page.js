"use client";

import DocumentListPage from "@/components/documents/DocumentListPage";
import { transformListConfig } from "@/lib/config/transformDocumentConfigs";

export default function TransformationsPage() {
  return (
    <DocumentListPage
      documentType={transformListConfig.documentType}
      title={transformListConfig.title}
      createPath={transformListConfig.createPath}
      filterOptions={transformListConfig.filterOptions}
      customColumns={transformListConfig.columns}
      getDetailPath={(order) => `/transformations/${order.id}`}
      bulkActions={["delete"]}
    />
  );
}
