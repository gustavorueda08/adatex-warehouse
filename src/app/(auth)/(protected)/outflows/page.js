"use client";

import DocumentListPage from "@/components/documents/DocumentListPage";

export default function OutflowsPage() {
  return (
    <DocumentListPage
      documentType="out"
      title="Ordenes de Salida"
      getDetailPath={(order) => `/outflows/${order.id}`}
      showPricing={true}
      bulkActions={["confirm", "complete", "delete"]}
      createPath={"/new-outflow"}
      filterOptions={{
        dropdownOptions: [{ key: "out", value: "Salida" }],
      }}
    />
  );
}
