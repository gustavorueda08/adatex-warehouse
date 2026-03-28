"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Chip,
  Divider,
  Progress,
  Skeleton,
} from "@heroui/react";
import {
  ArrowUpIcon,
  TransferIcon,
  ChartIcon,
  UserIcon,
} from "@/components/ui/Icons";
import { useDashboard } from "@/lib/hooks/useDashboard";
import ActivityChart from "@/components/dashboard/ActivityChart";
import { useUser } from "@/lib/hooks/useUser";

const COP = (v) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(v || 0);

// ── KPI card reutilizable ────────────────────────────────────────────────────
function KpiCard({ label, value, trend, trendLabel, icon: Icon, iconColor, loading }) {
  return (
    <Card className="w-full" shadow="sm">
      <CardBody className="p-5 gap-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-default-400 uppercase tracking-widest leading-tight">
            {label}
          </p>
          {Icon && (
            <div className={`p-2 rounded-xl shrink-0 ${iconColor ?? "bg-default-100"}`}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        {loading ? (
          <Skeleton className="h-8 w-32 rounded-lg" />
        ) : (
          <p className="text-2xl font-bold text-default-900 leading-none">{value ?? "—"}</p>
        )}
        {loading ? (
          <Skeleton className="h-4 w-24 rounded-lg" />
        ) : trend != null ? (
          <div className="flex items-center gap-1 text-xs">
            <span
              className={
                trend === "up" ? "font-semibold text-success-600" : "font-semibold text-danger-600"
              }
            >
              {trendLabel}
            </span>
            <span className="text-default-400">vs mes anterior</span>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

// ── Fila de estado dentro de una card ────────────────────────────────────────
function StatusRow({ label, count, total, color, loading }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Chip size="sm" color={color} variant="dot" classNames={{ base: "border-0" }}>
            {label}
          </Chip>
        </div>
        {loading ? (
          <Skeleton className="h-4 w-10 rounded" />
        ) : (
          <span className="font-semibold text-default-700 tabular-nums">
            {count} <span className="text-default-400 font-normal text-xs">({pct}%)</span>
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-1.5 w-full rounded-full" />
      ) : (
        <Progress size="sm" value={pct} color={color} aria-label={label} className="max-w-full" />
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useUser();
  const sellerId = useMemo(() => {
    if (user?.type === "seller" && user?.seller?.id) return user.seller.id;
    return null;
  }, [user]);

  const { dashboard, loading } = useDashboard(
    { ...(sellerId ? { sellerId } : {}) },
    { enabled: true },
  );

  // ── Customer stats (global) ──────────────────────────────────────────────────
  const [customerStats, setCustomerStats] = useState({
    total: 0, active: 0, atRisk: 0, churned: 0, prospect: 0, loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    const sellerQs = sellerId ? `&filters[seller]=${sellerId}` : "";
    (async () => {
      try {
        let all = [];
        let page = 1;
        let totalPages = 1;
        do {
          const r = await fetch(
            `/api/strapi/customers?fields[0]=status&pagination[page]=${page}&pagination[pageSize]=200${sellerQs}`
          );
          if (!r.ok) break;
          const data = await r.json();
          all.push(...(data.data || []));
          totalPages = data.meta?.pagination?.pageCount || 1;
          page++;
        } while (page <= totalPages);
        if (cancelled) return;
        let active = 0, atRisk = 0, churned = 0, prospect = 0;
        for (const c of all) {
          if (c.status === "active") active++;
          else if (c.status === "at_risk") atRisk++;
          else if (c.status === "churned") churned++;
          else if (c.status === "prospect") prospect++;
        }
        setCustomerStats({ total: all.length, active, atRisk, churned, prospect, loading: false });
      } catch {
        if (!cancelled) setCustomerStats((p) => ({ ...p, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, [sellerId]);

  // ── Forecast stats (global) ──────────────────────────────────────────────────
  const [forecastStats, setForecastStats] = useState({
    deficit: 0, orderSoon: 0, sufficient: 0, total: 0, loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/forecast/purchase-suggestions?horizon_days=30")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        setForecastStats({
          deficit: data.filter((p) => p.status === "deficit").length,
          orderSoon: data.filter((p) => p.status === "order_soon").length,
          sufficient: data.filter((p) => p.status === "sufficient").length,
          total: data.length,
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) setForecastStats((p) => ({ ...p, loading: false }));
      });
    return () => { cancelled = true; };
  }, []);

  const dashboardData =
    Array.isArray(dashboard) && dashboard.length > 0 ? dashboard[0] : dashboard || {};
  const stats = dashboardData.stats || {};
  const recentSales = dashboardData.recentSales || [];
  const topProducts = dashboardData.topProducts || [];

  return (
    <div className="space-y-8 p-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold text-default-900">Dashboard</h1>
        <p className="text-default-500 mt-1">Bienvenido a tu panel de control</p>
      </div>

      {/* ── Sección 1: Actividad del mes ─────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ChartIcon className="h-4 w-4 text-default-400" />
          <h2 className="text-sm font-semibold text-default-500 uppercase tracking-widest">
            Actividad del Mes
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Ventas Facturadas"
            value={stats?.totalSales?.value}
            trend={stats?.totalSales?.trend}
            trendLabel={stats?.totalSales?.change}
            icon={ChartIcon}
            iconColor="bg-primary-50 text-primary-500"
            loading={loading}
          />
          <KpiCard
            label="Inventario Disponible"
            value={stats?.inventory?.value}
            trend={stats?.inventory?.trend}
            trendLabel={stats?.inventory?.change}
            icon={TransferIcon}
            iconColor="bg-secondary-50 text-secondary-500"
            loading={loading}
          />
          <KpiCard
            label="Órdenes en Proceso"
            value={stats?.pendingOrders?.value}
            trend={stats?.pendingOrders?.trend}
            trendLabel={stats?.pendingOrders?.change}
            icon={ArrowUpIcon}
            iconColor="bg-warning-50 text-warning-500"
            loading={loading}
          />
          <KpiCard
            label="Total Clientes"
            value={customerStats.loading ? null : String(customerStats.total)}
            trend={null}
            trendLabel={null}
            icon={UserIcon}
            iconColor="bg-success-50 text-success-500"
            loading={customerStats.loading}
          />
        </div>
      </section>

      {/* ── Sección 2: Salud de clientes + Reposición de inventario ──────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-default-400" />
          <h2 className="text-sm font-semibold text-default-500 uppercase tracking-widest">
            Salud del Negocio
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">

          {/* Salud de Clientes */}
          <Card shadow="sm">
            <CardHeader className="flex flex-col items-start gap-0.5 px-5 pt-5 pb-3">
              <p className="text-base font-semibold text-default-800">Salud de Clientes</p>
              <p className="text-xs text-default-400">
                Clasificación automática por actividad de compra · {customerStats.loading ? "…" : `${customerStats.total} clientes`}
              </p>
            </CardHeader>
            <Divider />
            <CardBody className="px-5 py-4 flex flex-col gap-4">
              <StatusRow
                label="Activos"
                count={customerStats.active}
                total={customerStats.total}
                color="success"
                loading={customerStats.loading}
              />
              <StatusRow
                label="En Riesgo"
                count={customerStats.atRisk}
                total={customerStats.total}
                color="warning"
                loading={customerStats.loading}
              />
              <StatusRow
                label="Inactivos"
                count={customerStats.churned}
                total={customerStats.total}
                color="danger"
                loading={customerStats.loading}
              />
              <StatusRow
                label="Prospectos"
                count={customerStats.prospect}
                total={customerStats.total}
                color="primary"
                loading={customerStats.loading}
              />
            </CardBody>
          </Card>

          {/* Reposición de Inventario */}
          <Card shadow="sm">
            <CardHeader className="flex flex-col items-start gap-0.5 px-5 pt-5 pb-3">
              <p className="text-base font-semibold text-default-800">Reposición de Inventario</p>
              <p className="text-xs text-default-400">
                Pronóstico de demanda próximos 30 días · {forecastStats.loading ? "…" : `${forecastStats.total} productos monitoreados`}
              </p>
            </CardHeader>
            <Divider />
            <CardBody className="px-5 py-4 flex flex-col gap-4">
              <StatusRow
                label="Déficit crítico — stock insuficiente para cubrir demanda"
                count={forecastStats.deficit}
                total={forecastStats.total}
                color="danger"
                loading={forecastStats.loading}
              />
              <StatusRow
                label="Pedir pronto — stock cubre menos del 150% de la demanda"
                count={forecastStats.orderSoon}
                total={forecastStats.total}
                color="warning"
                loading={forecastStats.loading}
              />
              <StatusRow
                label="Stock suficiente — cubre la demanda proyectada"
                count={forecastStats.sufficient}
                total={forecastStats.total}
                color="success"
                loading={forecastStats.loading}
              />
            </CardBody>
            <Divider />
            <CardFooter className="px-5 py-3">
              <p className="text-xs text-default-400">
                Fuente: adatex-forecast-api · Prophet + exponential smoothing
              </p>
            </CardFooter>
          </Card>

        </div>
      </section>

      {/* ── Sección 3: Ventas recientes + productos top ───────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ArrowUpIcon className="h-4 w-4 text-default-400" />
          <h2 className="text-sm font-semibold text-default-500 uppercase tracking-widest">
            Detalle de Ventas
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

          {/* Ventas Recientes */}
          <Card className="lg:col-span-4" shadow="sm">
            <CardHeader className="flex flex-col items-start px-6 pt-5 pb-3">
              <p className="text-base font-semibold text-default-800">Ventas Recientes</p>
              <p className="text-xs text-default-400">
                Últimas {recentSales.length} ventas facturadas
              </p>
            </CardHeader>
            <Divider />
            <CardBody className="px-6 py-4 gap-0">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-default-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <Skeleton className="rounded-full w-8 h-8 shrink-0" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-28 rounded" />
                          <Skeleton className="h-3 w-16 rounded" />
                        </div>
                      </div>
                      <Skeleton className="h-3.5 w-20 rounded" />
                    </div>
                  ))
                : recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between py-3 border-b border-default-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center text-white font-semibold text-xs shadow-sm">
                          {sale.customer.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-default-800 leading-tight">{sale.customer}</p>
                          <p className="text-xs text-default-400">{sale.date}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-default-800">{sale.amount}</span>
                    </div>
                  ))}
            </CardBody>
          </Card>

          {/* Productos Top */}
          <Card className="lg:col-span-3" shadow="sm">
            <CardHeader className="flex flex-col items-start px-6 pt-5 pb-3">
              <p className="text-base font-semibold text-default-800">Productos Top</p>
              <p className="text-xs text-default-400">Más vendidos del mes en curso</p>
            </CardHeader>
            <Divider />
            <CardBody className="px-6 py-4 gap-4">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-3.5 w-32 rounded" />
                        <Skeleton className="h-3.5 w-16 rounded" />
                      </div>
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                  ))
                : topProducts.map((product, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-default-700 truncate max-w-[60%]">{product.name}</span>
                        <span className="text-default-800 font-semibold shrink-0">{product.revenue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          size="sm"
                          value={(product.sales / (topProducts[0]?.sales || 1)) * 100}
                          color="primary"
                          aria-label={product.name}
                          className="flex-1"
                        />
                        <span className="text-xs text-default-400 w-10 text-right tabular-nums">
                          {product.sales}
                        </span>
                      </div>
                    </div>
                  ))}
            </CardBody>
          </Card>

        </div>
      </section>

      {/* ── Sección 4: Actividad de ventas (gráfico) ─────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ChartIcon className="h-4 w-4 text-default-400" />
          <h2 className="text-sm font-semibold text-default-500 uppercase tracking-widest">
            Evolución de Ventas
          </h2>
        </div>
        <Card shadow="sm">
          <CardHeader className="flex flex-col items-start px-6 pt-5 pb-3">
            <p className="text-base font-semibold text-default-800">Actividad de Ventas</p>
            <p className="text-xs text-default-400">Ventas facturadas por período (semanal · mensual · anual)</p>
          </CardHeader>
          <Divider />
          <CardBody className="px-6 py-4">
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-lg" />
            ) : (
              <ActivityChart data={dashboardData.salesChart} />
            )}
          </CardBody>
        </Card>
      </section>

    </div>
  );
}
