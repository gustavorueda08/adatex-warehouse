"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Button,
  Spinner,
  Input,
  Select,
  SelectItem,
  Card,
  CardBody,
  Chip,
  Progress,
  Tooltip,
  Divider,
} from "@heroui/react";
import RoleGuard from "@/components/auth/RoleGuard";
import moment from "moment-timezone";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

const NUM = (v) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(v || 0);

// ── Configuración de UI ───────────────────────────────────────────────────────

const STATUS_CONFIG = {
  deficit:    { label: "Déficit",      color: "danger",  description: "No hay suficiente stock para cubrir la demanda. Comprar de inmediato." },
  order_soon: { label: "Pedir Pronto", color: "warning", description: "El stock está cerca del punto de reorden. Planificar compra esta semana." },
  sufficient: { label: "Suficiente",   color: "success", description: "Stock cubre la demanda predicha con margen de seguridad." },
};

const ABC_COLORS = { A: "danger", B: "warning", C: "default" };
const XYZ_COLORS = { X: "success", Y: "warning", Z: "danger" };

const METHOD_LABELS = {
  prophet:               "Prophet ML",
  exponential_smoothing: "Suavizado Exp.",
  holt_smoothing:        "Holt",
  no_data:               "Sin datos",
};
const METHOD_COLORS = {
  prophet:               "secondary",
  exponential_smoothing: "default",
  holt_smoothing:        "primary",
  no_data:               "danger",
};

const CONFIDENCE_LABELS = { high: "Alta", medium: "Media", low: "Baja" };
const CONFIDENCE_COLORS = { high: "success", medium: "warning", low: "danger" };
const CONFIDENCE_TEXT   = { high: "text-success-600", medium: "text-warning-600", low: "text-danger-600" };

// ── Mini chart de predicción ──────────────────────────────────────────────────

function ForecastChart({ product }) {
  const data = (product.forecast_periods || []).map((w) => ({
    sem:         moment(w.week_start).format("DD/MM"),
    "Predicción": parseFloat(w.forecast_qty?.toFixed(1) ?? 0),
    "IC inf.":    parseFloat(w.lower_95?.toFixed(1)     ?? 0),
    "IC sup.":    parseFloat(w.upper_95?.toFixed(1)     ?? 0),
  }));

  if (!data.length)
    return <p className="text-xs text-default-400 text-center py-3">Sin datos de predicción disponibles</p>;

  const gradId = `grad-ps-${product.product_id}`;
  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#7828C8" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#7828C8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="sem" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} width={36} />
          <RechartsTooltip formatter={(v, name) => [NUM(v), name]} />
          <Area dataKey="IC sup."    stroke="none"    fill={`url(#${gradId})`} fillOpacity={1} legendType="none" />
          <Area dataKey="IC inf."    stroke="none"    fill="white"              fillOpacity={1} legendType="none" />
          <Area dataKey="Predicción" stroke="#7828C8" strokeWidth={2}           fill="none"    dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── KpiCard ───────────────────────────────────────────────────────────────────

function KpiCard({ label, action, value, subtitle, accentColor }) {
  return (
    <Card shadow="none" className={`border border-default-200 border-l-4 ${accentColor}`}>
      <CardBody className="py-3 px-4">
        <span className="text-xs font-medium text-default-500 uppercase tracking-wider">{label}</span>
        {action && <span className="text-xs text-default-400 block">{action}</span>}
        <span className="text-2xl font-bold text-default-900 block mt-1">{value}</span>
        {subtitle && <span className="text-xs text-default-400 mt-0.5 block">{subtitle}</span>}
      </CardBody>
    </Card>
  );
}

// ── Fila expandida ────────────────────────────────────────────────────────────

function ExpandedRow({ p }) {
  const ss = p.safety_stock_info || {};
  const cv = ss.coefficient_of_variation || 0;
  const cvColor = cv < 0.5 ? "text-success-600" : cv < 1 ? "text-warning-600" : "text-danger-600";

  return (
    <div className="px-5 py-5 flex flex-col gap-5 bg-default-50/60 border-b border-default-200">
      {/* Estrategia + badge */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {p.abc_xyz && (
          <div className="flex items-center gap-1.5">
            <Chip size="sm" color={ABC_COLORS[p.abc_xyz.abc]} variant="flat">{p.abc_xyz.abc}</Chip>
            <Chip size="sm" color={XYZ_COLORS[p.abc_xyz.xyz]} variant="flat">{p.abc_xyz.xyz}</Chip>
            <span className="text-xs text-default-400">— {p.abc_xyz.category}</span>
          </div>
        )}
        {p.abc_xyz?.strategy && (
          <p className="text-sm text-default-700">
            <span className="font-semibold">Estrategia: </span>{p.abc_xyz.strategy}
          </p>
        )}
      </div>

      <Divider />

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Stock Actual",       value: `${NUM(p.current_stock)} ${p.product_unit}`,              cls: "text-default-900",
            tip: "Cantidad disponible en inventario actualmente (solo lo que está en bodega)" },
          ...(p.incoming_stock > 0 ? [{
            label: "En Tránsito",
            value: `${NUM(p.incoming_stock)} ${p.product_unit}`,
            cls: "text-primary-700",
            tip: `Stock en órdenes de compra confirmadas o en proceso. Llegada estimada: ${p.earliest_arrival ? moment(p.earliest_arrival).format("DD/MM/YYYY") : "sin fecha definida"}`,
          }] : []),
          { label: "Stock de Seguridad", value: `${NUM(ss.safety_stock)} ${p.product_unit}`,               cls: "text-warning-700",
            tip: "Buffer mínimo para absorber variaciones en la demanda o el tiempo de entrega" },
          { label: "Punto de Reorden",   value: `${NUM(ss.reorder_point)} ${p.product_unit}`,              cls: "text-default-900",
            tip: "Cuando el stock baja a este nivel, hay que hacer el pedido para no quedarse sin producto" },
          { label: "Demanda / semana",   value: `${NUM(ss.avg_demand_per_period)} ${p.product_unit}`,      cls: "text-default-900",
            tip: "Promedio de unidades vendidas por semana según el historial" },
          { label: "Desv. estándar",     value: `${NUM(ss.demand_std)} ${p.product_unit}`,                 cls: "text-default-900",
            tip: "Variabilidad de la demanda semana a semana. Más alto = más impredecible" },
          { label: "Coef. variación",    value: `${(cv * 100).toFixed(1)}%`,                               cls: cvColor,
            tip: "Relación entre desviación y media. < 50% = estable, 50–100% = variable, > 100% = errática" },
        ].map(({ label, value, cls, tip }) => (
          <Tooltip key={label} content={tip} placement="top">
            <div className="flex flex-col gap-0.5 p-3 rounded-xl border border-default-200 bg-white cursor-help">
              <span className="text-[10px] text-default-400 uppercase tracking-wide">{label}</span>
              <span className={`font-bold text-sm ${cls}`}>{value}</span>
            </div>
          </Tooltip>
        ))}
      </div>

      {/* Chart */}
      <div>
        <p className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-2">
          Predicción semanal · {p.forecast_periods?.length || 0} semanas · IC 95%
        </p>
        <ForecastChart product={p} />
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

function PurchaseSuggestionsInner() {
  const [suggestions,  setSuggestions]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [unavailable,  setUnavailable]  = useState(false);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [abcFilter,    setAbcFilter]    = useState("all");
  const [expandedRow,  setExpandedRow]  = useState(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    setUnavailable(false);
    try {
      // horizon_days=120 covers the 70-day import lead time with sufficient planning margin
      const res = await fetch("/api/forecast/purchase-suggestions?horizon_days=120");
      if (res.status === 503) { setUnavailable(true); return; }
      if (!res.ok) throw new Error("Error fetching");
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Error cargando sugerencias de compra");
    } finally {
      setLoading(false);
    }
  };

  const refreshCache = async () => {
    setRefreshing(true);
    const t = toast.loading("Recalculando predicciones con Prophet...");
    try {
      await fetch("/api/forecast/refresh-cache", { method: "POST" });
      toast.dismiss(t);
      await fetchSuggestions();
      toast.success("Predicciones actualizadas");
    } catch {
      toast.dismiss(t);
      toast.error("Error al recalcular");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchSuggestions(); }, []);

  const filtered = useMemo(() => {
    let r = suggestions;
    if (search) {
      const s = search.toLowerCase();
      r = r.filter((p) =>
        p.product_name?.toLowerCase().includes(s) ||
        p.product_code?.toLowerCase().includes(s) ||
        p.product_category?.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== "all") r = r.filter((p) => p.status === statusFilter);
    if (abcFilter    !== "all") r = r.filter((p) => p.abc_xyz?.abc === abcFilter);
    return r;
  }, [suggestions, search, statusFilter, abcFilter]);

  const kpi = useMemo(() => {
    let deficit = 0, orderSoon = 0, sufficient = 0, prophetCount = 0;
    for (const s of suggestions) {
      if (s.status === "deficit")    deficit++;
      if (s.status === "order_soon") orderSoon++;
      if (s.status === "sufficient") sufficient++;
      if (s.forecast_method === "prophet") prophetCount++;
    }
    return { deficit, orderSoon, sufficient, prophetCount, total: suggestions.length };
  }, [suggestions]);

  const stockCoverage = (p, effective) => {
    const rp = p.safety_stock_info?.reorder_point || 0;
    if (!rp) return 100;
    const stock = effective ?? ((p.current_stock || 0) + (p.incoming_stock || 0));
    return Math.min(Math.round((stock / rp) * 100), 200);
  };

  const exportToExcel = () => {
    const rows = filtered.map((p) => ({
      Estado:               STATUS_CONFIG[p.status]?.label || p.status,
      Producto:             p.product_name  || "",
      Código:               p.product_code  || "",
      Unidad:               p.product_unit  || "",
      Categoría:            p.product_category || "",
      "ABC-XYZ":            p.abc_xyz?.category || "",
      Estrategia:           p.abc_xyz?.strategy || "",
      "Demanda predicha":   p.total_forecast_qty || 0,
      "Stock actual":       p.current_stock || 0,
      "Stock de seguridad": p.safety_stock_info?.safety_stock || 0,
      "Punto de reorden":   p.safety_stock_info?.reorder_point || 0,
      "Déficit / a comprar": p.deficit || 0,
      "# Clientes":         p.customer_count || 0,
      Método:               METHOD_LABELS[p.forecast_method] || "",
      Confianza:            CONFIDENCE_LABELS[p.forecast_confidence] || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0] || {}).map((h) => ({ wch: Math.max(h.length + 2, 16) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compras Sugeridas");
    XLSX.writeFile(wb, `Compras-Sugeridas-${moment().format("YYYY-MM-DD")}.xlsx`);
    toast.success("Excel exportado");
  };

  if (unavailable) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-bold text-xl lg:text-3xl">Compras Sugeridas</h1>
        <Card className="border border-warning-200 bg-warning-50" shadow="none">
          <CardBody className="p-6 flex flex-col gap-3">
            <p className="text-warning-800 font-semibold">Servicio de predicción no disponible</p>
            <p className="text-warning-700 text-sm">
              El servicio <code className="bg-warning-100 px-1 rounded">adatex-forecast-api</code> no está corriendo.
              Las sugerencias de compra se calculan con Prophet ML y requieren este servicio.
            </p>
            <div>
              <Button size="sm" color="warning" variant="flat" onPress={fetchSuggestions}>
                Reintentar conexión
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-bold text-xl lg:text-3xl">Compras Sugeridas</h1>
          <p className="text-sm text-default-500 mt-0.5">
            ¿Qué pedir esta semana? · Lead time: 70 días (35 fab. + 30 tránsito + 5 nac.) · Solo productos de línea
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button color="secondary" variant="flat" size="sm" onPress={refreshCache} isDisabled={refreshing || loading}>
            {refreshing ? "Recalculando..." : "Recalcular"}
          </Button>
          <Button color="success" variant="flat" size="sm" onPress={exportToExcel} isDisabled={loading || filtered.length === 0}>
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i} shadow="none" className="border border-default-200">
              <CardBody className="py-3 px-4 gap-2">
                <div className="h-3 w-24 bg-default-200 rounded animate-pulse" />
                <div className="h-7 w-10 bg-default-300 rounded animate-pulse" />
                <div className="h-2.5 w-28 bg-default-100 rounded animate-pulse" />
              </CardBody>
            </Card>
          ))
        ) : (
          <>
            <KpiCard
              label="Comprar Hoy"
              action="Stock insuficiente"
              value={kpi.deficit}
              subtitle={`producto${kpi.deficit !== 1 ? "s" : ""} en déficit`}
              accentColor="border-l-danger-500"
            />
            <KpiCard
              label="Planificar Esta Semana"
              action="Stock bajo el punto de reorden"
              value={kpi.orderSoon}
              subtitle={`producto${kpi.orderSoon !== 1 ? "s" : ""} próximos a agotarse`}
              accentColor="border-l-warning-400"
            />
            <KpiCard
              label="Stock Suficiente"
              action="Sin acción inmediata"
              value={kpi.sufficient}
              subtitle={`de ${kpi.total} productos analizados`}
              accentColor="border-l-success-400"
            />
            <KpiCard
              label="Precisión del Modelo"
              action={`${kpi.prophetCount} con Prophet ML`}
              value={`${kpi.total ? Math.round((kpi.prophetCount / kpi.total) * 100) : 0}%`}
              subtitle="de predicciones usan Prophet"
              accentColor="border-l-secondary-400"
            />
          </>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Buscar producto, código o categoría..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setExpandedRow(null); }}
          className="max-w-sm"
          size="sm"
        />
        <Select
          label="Estado de stock"
          selectedKeys={[statusFilter]}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="max-w-[180px]"
          size="sm"
        >
          <SelectItem key="all">Todos los estados</SelectItem>
          <SelectItem key="deficit">🔴 Déficit — Comprar hoy</SelectItem>
          <SelectItem key="order_soon">🟡 Pedir pronto</SelectItem>
          <SelectItem key="sufficient">🟢 Suficiente</SelectItem>
        </Select>
        <Select
          label="Prioridad ABC"
          selectedKeys={[abcFilter]}
          onChange={(e) => setAbcFilter(e.target.value)}
          className="max-w-[180px]"
          size="sm"
        >
          <SelectItem key="all">Todas las prioridades</SelectItem>
          <SelectItem key="A">A — Alto valor (70–80% ingresos)</SelectItem>
          <SelectItem key="B">B — Valor medio</SelectItem>
          <SelectItem key="C">C — Bajo valor</SelectItem>
        </Select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Calculando qué comprar..." />
        </div>
      ) : (
        <Card shadow="none" className="border border-default-200 overflow-hidden">
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-default-50 border-b border-default-200">
                <tr>
                  <th className="px-3 py-3 text-center font-semibold text-default-600 text-xs uppercase tracking-wide w-32">Estado</th>
                  <th className="px-3 py-3 text-left font-semibold text-default-600 text-xs uppercase tracking-wide">Producto</th>
                  <th className="px-3 py-3 text-center font-semibold text-default-600 text-xs uppercase tracking-wide w-20">
                    <Tooltip content="ABC = prioridad por valor de ingresos. XYZ = variabilidad de la demanda.">
                      <span className="cursor-help underline decoration-dotted">ABC-XYZ</span>
                    </Tooltip>
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-default-600 text-xs uppercase tracking-wide min-w-[170px]">
                    <Tooltip content="Stock actual como % del punto de reorden. Por debajo de 100% = hay que pedir.">
                      <span className="cursor-help underline decoration-dotted">Cobertura</span>
                    </Tooltip>
                  </th>
                  <th className="px-3 py-3 text-right font-semibold text-default-600 text-xs uppercase tracking-wide">
                    <Tooltip content="Cantidad sugerida para reponer: diferencia entre el punto de reorden (demanda durante 70 días de lead time + stock de seguridad) y el stock actual.">
                      <span className="cursor-help underline decoration-dotted">A Comprar</span>
                    </Tooltip>
                  </th>
                  <th className="px-3 py-3 text-right font-semibold text-default-600 text-xs uppercase tracking-wide">
                    <Tooltip content="Total de unidades que se prevé vender en el horizonte configurado (90 días por defecto).">
                      <span className="cursor-help underline decoration-dotted">Demanda Predicha</span>
                    </Tooltip>
                  </th>
                  <th className="px-3 py-3 text-center font-semibold text-default-600 text-xs uppercase tracking-wide w-28">
                    <Tooltip content="Modelo estadístico usado para la predicción y su nivel de confianza.">
                      <span className="cursor-help underline decoration-dotted">Modelo</span>
                    </Tooltip>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {filtered.map((p, idx) => {
                  const sc           = STATUS_CONFIG[p.status] || STATUS_CONFIG.sufficient;
                  const isExp        = expandedRow === idx;
                  const rop          = p.safety_stock_info?.reorder_point ?? 0;
                  const effectiveStock = (p.current_stock || 0) + (p.incoming_stock || 0);
                  const coverage     = stockCoverage(p, effectiveStock);
                  const toBuy        = Math.max(0, Math.round((rop - effectiveStock) * 10) / 10);

                  return [
                    <tr
                      key={`r-${idx}`}
                      className="hover:bg-default-50/80 transition-colors cursor-pointer"
                      onClick={() => setExpandedRow(isExp ? null : idx)}
                    >
                      <td className="px-3 py-3 text-center">
                        <Tooltip content={sc.description}>
                          <span className="cursor-help">
                            <Chip size="sm" color={sc.color} variant="flat">{sc.label}</Chip>
                          </span>
                        </Tooltip>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-default-900">{p.product_name}</span>
                          <span className="text-xs text-default-400">
                            {p.product_code} · {p.product_category} · {p.customer_count} cliente{p.customer_count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {p.abc_xyz?.category ? (
                          <Tooltip content={`${p.abc_xyz.category}: ${p.abc_xyz.strategy}`}>
                            <span className="inline-flex gap-1 cursor-help">
                              <Chip size="sm" color={ABC_COLORS[p.abc_xyz.abc]} variant="flat">{p.abc_xyz.abc}</Chip>
                              <Chip size="sm" color={XYZ_COLORS[p.abc_xyz.xyz]} variant="flat">{p.abc_xyz.xyz}</Chip>
                            </span>
                          </Tooltip>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-3 min-w-[180px]">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs text-default-500">
                            <span>Efectivo: {NUM(effectiveStock)}</span>
                            <span>Reorden: {NUM(p.safety_stock_info?.reorder_point)} {p.product_unit}</span>
                          </div>
                          <Progress
                            size="sm"
                            value={coverage}
                            maxValue={200}
                            color={coverage < 100 ? "danger" : coverage < 150 ? "warning" : "success"}
                          />
                          <span className="text-xs font-medium text-default-600">{coverage}% del punto de reorden</span>
                          {p.incoming_stock > 0 && (
                            <span className="text-xs text-primary-600 font-medium">
                              📦 +{NUM(p.incoming_stock)} {p.product_unit} en tránsito
                              {p.earliest_arrival ? ` · llega ~${moment(p.earliest_arrival).format("DD/MM/YY")}` : ""}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {toBuy > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-danger-600 text-base">{NUM(toBuy)}</span>
                            <span className="text-xs text-default-400">{p.product_unit}</span>
                          </div>
                        ) : (
                          <span className="text-success-600 font-medium text-sm">— Sin déficit</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="font-semibold text-default-900">{NUM(p.total_forecast_qty)}</span>
                        <span className="text-xs text-default-400 ml-1">{p.product_unit}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Chip size="sm" color={METHOD_COLORS[p.forecast_method]} variant="flat">
                            {METHOD_LABELS[p.forecast_method]}
                          </Chip>
                          <span className={`text-xs ${CONFIDENCE_TEXT[p.forecast_confidence] || "text-default-400"}`}>
                            Confianza {CONFIDENCE_LABELS[p.forecast_confidence] || "—"}
                          </span>
                        </div>
                      </td>
                    </tr>,
                    isExp && (
                      <tr key={`exp-${idx}`}>
                        <td colSpan={7} className="p-0">
                          <ExpandedRow p={p} />
                        </td>
                      </tr>
                    ),
                  ];
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-default-400">
                      {suggestions.length === 0
                        ? "No hay sugerencias. Verifica que adatex-forecast-api esté corriendo."
                        : "Ningún producto coincide con los filtros seleccionados."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default function PurchaseSuggestionsPage() {
  return (
    <RoleGuard forbiddenRoles={[]} fallbackRoute="/">
      <PurchaseSuggestionsInner />
    </RoleGuard>
  );
}
