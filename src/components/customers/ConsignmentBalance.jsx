"use client";

import { useState } from "react";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import { useConsignmentBalance } from "@/lib/hooks/useConsignment";
import format from "@/lib/utils/format";
import { useRouter } from "next/navigation";

/**
 * Componente para mostrar el balance de remisión de un cliente
 * Muestra productos despachados vs facturados con opción de facturar
 */
export default function ConsignmentBalance({ customerId, customerName }) {
  const router = useRouter();
  const { balance, loading, error, refetch } = useConsignmentBalance(customerId, {
    enabled: !!customerId,
  });

  const [expandedProducts, setExpandedProducts] = useState(new Set());

  const toggleProductExpand = (productId) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  // Columnas para la tabla de productos
  const productColumns = [
    {
      key: "product",
      label: "Producto",
      render: (_, row) => (
        <div>
          <p className="font-medium">{row.product?.name || "-"}</p>
          <p className="text-sm text-zinc-400">{row.product?.code || ""}</p>
        </div>
      ),
    },
    {
      key: "totalDispatched",
      label: "Total Despachado",
      render: (_, row) => (
        <p className="font-medium">
          {format(row.totalDispatched)} {row.product?.unit || ""}
        </p>
      ),
    },
    {
      key: "totalInvoiced",
      label: "Total Facturado",
      render: (_, row) => (
        <p className="text-emerald-400">
          {format(row.totalInvoiced)} {row.product?.unit || ""}
        </p>
      ),
    },
    {
      key: "pendingBalance",
      label: "Pendiente por Facturar",
      render: (_, row) => (
        <p className={`font-bold ${row.pendingBalance > 0 ? "text-yellow-400" : "text-zinc-500"}`}>
          {format(row.pendingBalance)} {row.product?.unit || ""}
        </p>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      render: (_, row) => (
        <div className="flex gap-2">
          <Button
            variant="cyan"
            size="sm"
            onClick={() => toggleProductExpand(row.product?.id)}
            disabled={!row.orders || row.orders.length === 0}
          >
            {expandedProducts.has(row.product?.id) ? "Ocultar" : "Ver órdenes"}
          </Button>
          {row.pendingBalance > 0 && (
            <Button
              variant="yellow"
              size="sm"
              onClick={() => handleCreateInvoice(row)}
            >
              Facturar
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Columnas para la tabla de órdenes (expandida)
  const orderColumns = [
    {
      key: "orderCode",
      label: "Código",
      render: (code, row) => (
        <button
          onClick={() => router.push(`/sales/${row.orderId}`)}
          className="text-cyan-400 hover:underline"
        >
          {code}
        </button>
      ),
    },
    {
      key: "dispatchDate",
      label: "Fecha de Despacho",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      key: "dispatched",
      label: "Despachado",
      render: (qty) => format(qty),
    },
    {
      key: "invoicedQty",
      label: "Facturado",
      render: (qty) => format(qty),
    },
    {
      key: "pending",
      label: "Pendiente",
      render: (qty) => (
        <p className={`font-bold ${qty > 0 ? "text-yellow-400" : "text-zinc-500"}`}>
          {format(qty)}
        </p>
      ),
    },
    {
      key: "invoiced",
      label: "Estado",
      render: (invoiced) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            invoiced ? "bg-emerald-700" : "bg-yellow-500"
          }`}
        >
          {invoiced ? "Facturado" : "Pendiente"}
        </span>
      ),
    },
    {
      key: "orderId",
      label: "Acciones",
      render: (orderId, row) =>
        row.pending > 0 && (
          <Button
            variant="yellow"
            size="sm"
            onClick={() => router.push(`/sales/${orderId}/partial-invoice`)}
          >
            Facturar
          </Button>
        ),
    },
  ];

  const handleCreateInvoice = (productRow) => {
    // Buscar la primera orden con pendiente de este producto
    const orderWithPending = productRow.orders?.find((o) => o.pending > 0);
    if (orderWithPending) {
      router.push(`/sales/${orderWithPending.orderId}/partial-invoice`);
    }
  };

  const renderExpandedContent = (row) => {
    if (!expandedProducts.has(row.product?.id)) return null;

    return (
      <div className="p-4 bg-zinc-700 rounded-md">
        <h4 className="font-bold mb-3">Órdenes de {row.product?.name}</h4>
        <Table columns={orderColumns} data={row.orders || []} hiddenHeader={false} />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-zinc-400">Cargando balance de remisión...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500 rounded-md">
        <p className="text-red-400">Error al cargar balance: {error}</p>
        <Button variant="red" onClick={refetch} className="mt-2">
          Reintentar
        </Button>
      </div>
    );
  }

  if (!balance || !balance.products || balance.products.length === 0) {
    return (
      <div className="p-4 bg-zinc-700 rounded-md">
        <p className="text-zinc-400">
          No hay productos en remisión para este cliente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-700 rounded-md">
          <p className="text-sm text-zinc-400">Total Despachado</p>
          <p className="text-2xl font-bold">{format(balance.summary?.totalDispatched || 0)}</p>
        </div>
        <div className="p-4 bg-zinc-700 rounded-md">
          <p className="text-sm text-zinc-400">Total Facturado</p>
          <p className="text-2xl font-bold text-emerald-400">
            {format(balance.summary?.totalInvoiced || 0)}
          </p>
        </div>
        <div className="p-4 bg-zinc-700 rounded-md">
          <p className="text-sm text-zinc-400">Pendiente por Facturar</p>
          <p className="text-2xl font-bold text-yellow-400">
            {format(balance.summary?.totalPending || 0)}
          </p>
        </div>
      </div>

      {/* Tabla de Productos */}
      <div>
        <h3 className="text-xl font-bold mb-3">Detalle por Producto</h3>
        <Table
          columns={productColumns}
          data={balance.products || []}
          renderExpandedContent={renderExpandedContent}
          getRowId={(row) => row.product?.id}
        />
      </div>

      {/* Botón de Refrescar */}
      <div className="flex justify-end">
        <Button variant="zinc" onClick={refetch}>
          Actualizar balance
        </Button>
      </div>
    </div>
  );
}
