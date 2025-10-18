"use client";

import DocumentListPage from "@/components/documents/DocumentListPage";

export default function SalesPage() {
  return (
    <DocumentListPage
      documentType="sale"
      title="Ordenes de Venta"
      relationField="customer"
      relationLabel="Cliente"
      getDetailPath={(order) => `/sales/${order.id}`}
      showPricing={false}
      bulkActions={["confirm", "complete", "delete"]}
      createPath="/new-sale"
      customColumns={[
        {
          key: "siigoId",
          label: "Tipo",
          render: (siigoId, row) => {
            // Si está completada pero no tiene siigoId, es remisión
            if (row.state === "completed" && !siigoId) {
              return (
                <span className="bg-yellow-500 font-bold text-xs text-black px-3 py-1 rounded-full">
                  Remisión
                </span>
              );
            }
            // Si tiene siigoId, está facturada
            if (siigoId) {
              return (
                <span className="bg-emerald-700 font-bold text-xs px-3 py-1 rounded-full">
                  Facturada
                </span>
              );
            }
            // Si no está completada, es venta normal
            return (
              <span className="bg-zinc-600 font-bold text-xs px-3 py-1 rounded-full">
                Venta
              </span>
            );
          },
        },
        {
          key: "invoiceNumber",
          label: "N° Factura",
          render: (invoiceNumber) => (
            <p className="font-mono text-sm">{invoiceNumber || "-"}</p>
          ),
        },
      ]}
    />
  );
}
