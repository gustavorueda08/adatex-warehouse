"use client";

import DocumentListPage from "@/components/documents/DocumentListPage";

export default function PurchasesPage() {
  return (
    <DocumentListPage
      documentType="purchase"
      title="Ordenes de Compra"
      relationField="supplier"
      relationLabel="Proveedor"
      getDetailPath={(order) => `/purchases/${order.id}`}
      showPricing={true}
      bulkActions={["confirm", "complete", "delete"]}
      createPath={"/new-purchase"}
      filterOptions={{
        dropdownOptions: [{ key: "purchase", value: "Compra" }],
      }}
    />
  );
}
