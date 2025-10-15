"use client";

import DocumentListPage from "@/components/documents/DocumentListPage";

export default function InflowsPage() {
  return (
    <DocumentListPage
      documentType="in"
      title="Ordenes de Entrada"
      relationField="customer"
      relationLabel="Cliente"
      getDetailPath={(order) => `/inflows/${order.id}`}
      showPricing={true}
      bulkActions={["confirm", "complete", "delete"]}
      createPath={"/new-inflow"}
      filterOptions={{
        dropdownOptions: [{ key: "in", value: "Entrada" }],
      }}
    />
  );
}
