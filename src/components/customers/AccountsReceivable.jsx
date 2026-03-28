"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Chip, Skeleton, Tooltip } from "@heroui/react";
import { useCustomers } from "@/lib/hooks/useCustomers";
import toast from "react-hot-toast";

const COP = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value || 0);

function BalanceSummaryCard({ label, value, color = "default", loading }) {
  const colorClass = {
    default: "bg-default-50 border-default-200",
    primary: "bg-primary-50 border-primary-200",
    danger: "bg-danger-50 border-danger-200",
    success: "bg-success-50 border-success-200",
  }[color] ?? "bg-default-50 border-default-200";

  return (
    <div className={`flex flex-col gap-1 p-4 rounded-xl border ${colorClass}`}>
      <span className="text-xs font-medium text-default-500 uppercase tracking-wider">{label}</span>
      {loading ? (
        <Skeleton className="h-6 w-3/4 rounded-lg mt-1" />
      ) : (
        <span className="text-lg font-bold text-default-900">{COP(value)}</span>
      )}
    </div>
  );
}

/**
 * Sección de Cuentas por Cobrar para el CustomerDetailPage.
 * Carga el balance contable + facturas pendientes desde Siigo bajo demanda.
 */
export default function AccountsReceivable({ customerId }) {
  const { getCustomerAccountsReceivable, downloadCustomerAccountsReceivable } = useCustomers();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCustomerAccountsReceivable(customerId);
      setData(result);
      setLoaded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [customerId, getCustomerAccountsReceivable]);

  const handleDownload = async (format) => {
    setDownloading(true);
    const toastId = toast.loading(`Generando ${format === "pdf" ? "PDF" : "Excel"}...`);
    try {
      await downloadCustomerAccountsReceivable(customerId, { format });
      toast.success("Descarga lista", { id: toastId });
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  // Número de días desde la fecha de vencimiento
  function daysOverdue(due_date) {
    if (!due_date) return null;
    const diff = Math.floor((Date.now() - new Date(due_date).getTime()) / 86400000);
    return diff;
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {!loaded && !loading && (
        <div className="flex flex-col items-center gap-3 py-6">
          <p className="text-default-500 text-sm">
            Consulta el saldo pendiente en Siigo (cuenta 1305 — Clientes Nacionales).
          </p>
          <Button color="primary" variant="flat" size="sm" onPress={loadData}>
            Cargar Cuentas por Cobrar
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-40 rounded-xl" />
        </div>
      )}

      {error && (
        <div className="flex flex-col gap-2">
          <p className="text-danger-600 text-sm">{error}</p>
          <Button size="sm" variant="flat" color="danger" onPress={loadData}>
            Reintentar
          </Button>
        </div>
      )}

      {loaded && data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <BalanceSummaryCard label="Saldo Inicial" value={data.balance.saldo_inicial} color="default" />
            <BalanceSummaryCard label="Débito (Facturas)" value={data.balance.debito} color="primary" />
            <BalanceSummaryCard label="Crédito (Pagos)" value={data.balance.credito} color="success" />
            <BalanceSummaryCard
              label="Saldo Pendiente"
              value={data.balance.saldo_final}
              color={data.balance.saldo_final > 0 ? "danger" : "success"}
            />
          </div>

          {/* Invoices table */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-default-700">
                Facturas Pendientes ({data.invoices.length})
              </h4>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  isLoading={downloading}
                  isDisabled={downloading}
                  onPress={() => handleDownload("excel")}
                >
                  Excel
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  color="danger"
                  isLoading={downloading}
                  isDisabled={downloading}
                  onPress={() => handleDownload("pdf")}
                >
                  PDF
                </Button>
                <Button size="sm" variant="light" onPress={loadData} isDisabled={loading}>
                  Actualizar
                </Button>
              </div>
            </div>

            {data.invoices.length === 0 ? (
              <div className="text-center py-8 text-default-400 text-sm border rounded-xl">
                No hay facturas pendientes. El cliente está al día.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-default-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-default-100 text-default-600 text-xs uppercase">
                      <th className="text-left px-4 py-3 font-medium">Factura</th>
                      <th className="text-left px-4 py-3 font-medium">Fecha</th>
                      <th className="text-left px-4 py-3 font-medium">Vencimiento</th>
                      <th className="text-right px-4 py-3 font-medium">Total</th>
                      <th className="text-right px-4 py-3 font-medium">Saldo Pendiente</th>
                      <th className="text-center px-4 py-3 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((inv, idx) => {
                      const overdue = daysOverdue(inv.due_date);
                      const isOverdue = overdue !== null && overdue > 0;
                      return (
                        <tr
                          key={inv.id || idx}
                          className="border-t border-default-100 hover:bg-default-50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            {inv.public_url ? (
                              <a
                                href={inv.public_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:underline font-medium"
                              >
                                {inv.name}
                              </a>
                            ) : (
                              <span className="font-medium">{inv.name}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-default-600">{inv.date}</td>
                          <td className="px-4 py-3">
                            {inv.due_date ? (
                              <Tooltip content={isOverdue ? `Vencida hace ${overdue}d` : `Vence en ${-overdue}d`}>
                                <span className={isOverdue ? "text-danger-600 font-medium" : "text-default-600"}>
                                  {inv.due_date}
                                </span>
                              </Tooltip>
                            ) : (
                              <span className="text-default-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-default-700">{COP(inv.total)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-danger-600">
                            {COP(inv.balance)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isOverdue ? (
                              <Chip size="sm" color="danger" variant="flat">
                                Vencida {overdue}d
                              </Chip>
                            ) : (
                              <Chip size="sm" color="warning" variant="flat">
                                Pendiente
                              </Chip>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-xs text-default-400">
            Período: {data.period.year} · Meses {data.period.month_start}–{data.period.month_end} · Cuenta contable 1305
          </p>
        </>
      )}
    </div>
  );
}
