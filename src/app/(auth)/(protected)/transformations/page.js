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
      // Transformations typically don't have bulk actions like confirm/complete in the same way,
      // or they are auto-completed.
      bulkActions={["delete"]}
    />
  );
}
