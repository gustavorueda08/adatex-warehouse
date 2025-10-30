"use client";

import { useState } from "react";
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import { useConsignmentBalance } from "@/lib/hooks/useConsignment";
import format from "@/lib/utils/format";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

/**
 * Componente para mostrar el balance de remisión de un cliente
 * Muestra productos despachados vs facturados con opción de facturar
 */
export default function ConsignmentBalance({ customerId }) {
  const router = useRouter();
  const { balance, loading, error, refetch } = useConsignmentBalance(
    customerId,
    {
      enabled: !!customerId,
    }
  );

  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [isExpanded, setIsExpanded] = useState(false);

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
        <p
          className={`font-bold ${
            row.pendingBalance > 0 ? "text-yellow-400" : "text-zinc-500"
          }`}
        >
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
        <p
          className={`font-bold ${
            qty > 0 ? "text-yellow-400" : "text-zinc-500"
          }`}
        >
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
        <Table
          columns={orderColumns}
          data={row.orders || []}
          hiddenHeader={false}
        />
      </div>
    );
  };

  return (
    <Card>
      {/* Header con título y botón de expandir/colapsar */}
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Balance de Remisión</CardTitle>
            <CardDescription>
              Control de productos despachados vs facturados
            </CardDescription>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 transition-colors text-sm font-medium"
          >
            {isExpanded ? (
              <>
                <ChevronUpIcon className="w-4 h-4" />
                Ocultar
              </>
            ) : (
              <>
                <ChevronDownIcon className="w-4 h-4" />
                Mostrar
              </>
            )}
          </button>
        </div>
      </CardHeader>

      {/* Contenido expandible */}
      {isExpanded && (
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-zinc-400">Cargando balance de remisión...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-900/20 border border-red-500 rounded-md">
              <p className="text-red-400">Error al cargar balance: {error}</p>
              <Button variant="red" onClick={refetch} className="mt-2">
                Reintentar
              </Button>
            </div>
          ) : !balance || !balance.products || balance.products.length === 0 ? (
            <div className="p-4 bg-zinc-700/50 rounded-md text-center">
              <p className="text-zinc-400">
                No hay productos en remisión para este cliente.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Resumen General */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-zinc-700/50 rounded-lg border border-zinc-600">
                  <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium mb-1">
                    Total Despachado
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {format(balance.summary?.totalDispatched || 0)}
                  </p>
                </div>
                <div className="p-4 bg-emerald-900/20 rounded-lg border border-emerald-700">
                  <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium mb-1">
                    Total Facturado
                  </p>
                  <p className="text-3xl font-bold text-emerald-400">
                    {format(balance.summary?.totalInvoiced || 0)}
                  </p>
                </div>
                <div className="p-4 bg-yellow-900/20 rounded-lg border border-yellow-700">
                  <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium mb-1">
                    Pendiente por Facturar
                  </p>
                  <p className="text-3xl font-bold text-yellow-400">
                    {format(balance.summary?.totalPending || 0)}
                  </p>
                </div>
              </div>

              {/* Tabla de Productos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    Detalle por Producto
                  </h3>
                  <Button variant="zinc" size="sm" onClick={refetch}>
                    Actualizar
                  </Button>
                </div>
                <div className="rounded-lg overflow-hidden border border-zinc-700">
                  <Table
                    columns={productColumns}
                    data={balance.products || []}
                    renderExpandedContent={renderExpandedContent}
                    getRowId={(row) => row.product?.id}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
