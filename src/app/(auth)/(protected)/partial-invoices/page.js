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
      createPath={null} // No se crean desde aquí, se crean desde sales
      customColumns={[
        {
          key: "parentOrder",
          label: "Orden Original",
          render: (parentOrder) =>
            parentOrder ? (
              <a
                href={`/sales/${parentOrder.id}`}
                className="text-cyan-400 hover:underline"
              >
                {parentOrder.code}
              </a>
            ) : (
              "-"
            ),
        },
        {
          key: "siigoId",
          label: "Estado Facturación",
          render: (siigoId, row) =>
            siigoId ? (
              <span className="bg-emerald-700 font-bold text-xs px-3 py-1 rounded-full">
                Facturado
              </span>
            ) : (
              <span className="bg-yellow-500 font-bold text-xs px-3 py-1 rounded-full">
                Pendiente
              </span>
            ),
        },
        {
          key: "invoiceNumber",
          label: "N° Factura",
          render: (invoiceNumber) => (
            <p className="font-mono text-sm">{invoiceNumber || "-"}</p>
          ),
        },
      ]}
      filterOptions={{
        linkLabel: "Nueva orden de venta",
        linkPath: "/new-sale",
      }}
    />
  );
}
