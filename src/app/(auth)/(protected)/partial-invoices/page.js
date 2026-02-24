"use client";

import DocumentListPage from "@/components/documents/DocumentListPage";
import RoleGuard from "@/components/auth/RoleGuard";

function PartialInvoicesPageInner() {
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


export default function PartialInvoicesPage(params) {
  return (
    <RoleGuard forbiddenRoles={["seller"]} fallbackRoute="/">
      <PartialInvoicesPageInner {...params} />
    </RoleGuard>
  );
}
