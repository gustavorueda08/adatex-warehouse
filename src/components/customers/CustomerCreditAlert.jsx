"use client";

import { useEffect, useState } from "react";
import { Chip, Skeleton } from "@heroui/react";
import { useCustomers } from "@/lib/hooks/useCustomers";

const COP = (v) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(v || 0);

/**
 * Banner that shows the credit/block status of a customer in the sale order flow.
 *
 * - isBlocked = true  → hard block, always shown immediately
 * - creditLimit = 0   → cash customer, no restriction
 * - creditLimit > 0   → fetches Siigo AR data to verify overdue invoices / balance
 */
export default function CustomerCreditAlert({ customer }) {
  const { getCustomerAccountsReceivable } = useCustomers(
    {},
    { enabled: false },
  );
  const [arData, setArData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [arError, setArError] = useState(null);

  useEffect(() => {
    setArData(null);
    setArError(null);

    if (!customer?.id || !customer?.creditLimit || customer.creditLimit <= 0)
      return;

    let cancelled = false;
    setLoading(true);

    getCustomerAccountsReceivable(customer.id)
      .then((result) => {
        if (!cancelled) setArData(result);
      })
      .catch((err) => {
        if (!cancelled) setArError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customer?.id, customer?.creditLimit, getCustomerAccountsReceivable]);

  if (!customer) return null;

  // ── Hard block ──────────────────────────────────────────────────────────────
  if (customer.isBlocked) {
    return (
      <Alert color="danger">
        <Chip color="danger" size="sm" variant="solid" className="self-center">
          Bloqueado
        </Chip>
        <span className="font-medium self-center">
          Este cliente está bloqueado y no puede recibir nuevas órdenes de
          venta.
        </span>
      </Alert>
    );
  }

  // ── Cash customer ────────────────────────────────────────────────────────────
  if (!customer.creditLimit || customer.creditLimit <= 0) {
    return (
      <Alert color="success">
        <Chip color="success" size="sm" variant="flat" className="self-center">
          Contado
        </Chip>
        <span className="self-center">
          Cliente de contado — sin restricción de cupo.
        </span>
      </Alert>
    );
  }

  // ── Has credit limit → show AR status ────────────────────────────────────────
  const saldoPendiente = arData?.balance?.saldo_final ?? null;
  const globalPaymentTerms = customer.paymentTerms || 0;
  const overdueInvoices =
    arData?.invoices?.filter((inv) => {
      const todayMs = Date.now();
      if (!inv.date) {
        return inv.due_date
          ? new Date(inv.due_date).getTime() < todayMs
          : false;
      }
      const invoiceDateMs = new Date(inv.date).getTime();
      const siigoDueDateMs = inv.due_date
        ? new Date(inv.due_date).getTime()
        : 0;
      const invoiceSpecificDays =
        siigoDueDateMs > invoiceDateMs
          ? Math.round((siigoDueDateMs - invoiceDateMs) / 86400000)
          : 0;
      const effectiveDays = Math.max(globalPaymentTerms, invoiceSpecificDays);
      return todayMs > invoiceDateMs + effectiveDays * 86400000;
    }) ?? [];
  const overdueCount = overdueInvoices.length;

  const isOverLimit =
    saldoPendiente !== null && saldoPendiente > customer.creditLimit;
  const hasOverdue = overdueCount > 0;
  const isSiigoBlocked = isOverLimit || hasOverdue;

  // While loading or before data arrives
  if (loading) {
    return (
      <Alert color="default">
        <Chip color="default" size="sm" variant="flat" className="self-center">
          Verificando cupo...
        </Chip>
        <span className="text-default-600 self-center">
          Cupo asignado: {COP(customer.creditLimit)}
        </span>
        <Skeleton className="h-4 w-32 rounded ml-2" />
      </Alert>
    );
  }

  // Siigo unavailable — allow creation, just warn
  if (arError) {
    return (
      <Alert color="warning">
        <Chip color="warning" size="sm" variant="flat" className="self-center">
          Sin datos Siigo
        </Chip>
        <span className="text-warning-700 self-center">
          Cupo: {COP(customer.creditLimit)} · No se pudo verificar el saldo en
          Siigo — se permitirá la orden.
        </span>
      </Alert>
    );
  }

  // Data loaded
  if (arData) {
    if (isSiigoBlocked) {
      return (
        <Alert color="danger">
          <Chip
            color="danger"
            size="sm"
            variant="solid"
            className="self-center"
          >
            Cupo Bloqueado
          </Chip>
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-danger-700 self-center">
              Cupo: {COP(customer.creditLimit)} · Saldo pendiente:{" "}
              {COP(saldoPendiente)}
            </span>
            {hasOverdue && (
              <span className="text-xs text-danger-600 self-center">
                {overdueCount} factura{overdueCount > 1 ? "s" : ""} vencida
                {overdueCount > 1 ? "s" : ""} — no se puede confirmar una nueva
                orden de venta.
              </span>
            )}
            {isOverLimit && !hasOverdue && (
              <span className="text-xs text-danger-600 self-center">
                El saldo supera el cupo asignado — no se puede confirmar una
                nueva orden de venta.
              </span>
            )}
          </div>
        </Alert>
      );
    }

    const disponible = customer.creditLimit - saldoPendiente;
    return (
      <Alert color="success">
        <Chip color="success" size="sm" variant="flat" className="self-center">
          Cupo Disponible
        </Chip>
        <span className="text-success-700 self-center">
          Cupo: {COP(customer.creditLimit)} · Saldo: {COP(saldoPendiente)} ·
          Disponible: {COP(disponible)}
        </span>
      </Alert>
    );
  }

  // No data yet and no loading (creditLimit > 0 but fetch not triggered — shouldn't happen)
  return null;
}

function Alert({ color, children }) {
  const classes = {
    danger: "border-danger-200 bg-danger-50",
    success: "border-success-200 bg-success-50",
    warning: "border-warning-200 bg-warning-50",
    default: "border-default-200 bg-default-50",
  };
  return (
    <div
      className={`rounded-xl border px-4 py-3 flex items-start gap-3 text-sm flex-wrap ${classes[color] ?? classes.default}`}
    >
      {children}
    </div>
  );
}
