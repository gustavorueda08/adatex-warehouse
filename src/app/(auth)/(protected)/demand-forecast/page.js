"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Button,
  Spinner,
  Input,
  Select,
  SelectItem,
  Tabs,
  Tab,
  Card,
  CardBody,
  Chip,
  Progress,
  Tooltip,
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

// ── Configuraciones de UI ─────────────────────────────────────────────────────

const STATUS_CONFIG = {
  deficit:    { label: "Déficit",      color: "danger",  dot: "🔴" },
  order_soon: { label: "Pedir pronto", color: "warning", dot: "🟡" },
  sufficient: { label: "Suficiente",   color: "success", dot: "🟢" },
};

const ABC_COLORS  = { A: "danger", B: "warning", C: "default" };
const XYZ_COLORS  = { X: "success", Y: "warning", Z: "danger" };

const ABC_DESC = {
  A: "Alto valor — genera el 70–80% de los ingresos",
  B: "Valor medio — genera el 15–25% de los ingresos",
  C: "Bajo valor — genera el ~5% de los ingresos",
};
const XYZ_DESC = {
  X: "Demanda consistente — baja variabilidad (CV < 0.5)",
  Y: "Demanda variable — variabilidad media (0.5 ≤ CV < 1.0)",
  Z: "Demanda errática — alta variabilidad (CV ≥ 1.0)",
};

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

const CONFIDENCE_LABELS = { high: "Alta",  medium: "Media", low: "Baja" };
const CONFIDENCE_COLORS = { high: "success", medium: "warning", low: "danger" };
const CONFIDENCE_TEXT   = { high: "text-success-600", medium: "text-warning-600", low: "text-danger-600" };

// abc+xyz → color + estrategia para el heatmap
const CELL_STYLE = {
  AX: { bg: "bg-danger-100",   text: "text-danger-800",   border: "border-danger-200",   strategy: "Reposición continua, stock mínimo" },
  AY: { bg: "bg-warning-100",  text: "text-warning-800",  border: "border-warning-200",  strategy: "Revisión frecuente, buffer moderado" },
  AZ: { bg: "bg-danger-50",    text: "text-danger-700",   border: "border-danger-100",   strategy: "Revisión periódica, pedidos bajo demanda" },
  BX: { bg: "bg-warning-50",   text: "text-warning-700",  border: "border-warning-100",  strategy: "Reposición regular, stock estándar" },
  BY: { bg: "bg-default-100",  text: "text-default-700",  border: "border-default-200",  strategy: "Revisión periódica, stock moderado" },
  BZ: { bg: "bg-default-50",   text: "text-default-600",  border: "border-default-100",  strategy: "Revisión mensual, stock bajo" },
  CX: { bg: "bg-success-50",   text: "text-success-700",  border: "border-success-100",  strategy: "Automatizar, mínimo control" },
  CY: { bg: "bg-default-50",   text: "text-default-500",  border: "border-default-100",  strategy: "Revisión trimestral" },
  CZ: { bg: "bg-default-50",   text: "text-default-400",  border: "border-default-50",   strategy: "Eliminar o gestionar por pedido" },
};

// ── ForecastChart (Recharts) ──────────────────────────────────────────────────

function ForecastChart({ product }) {
  const data = (product.forecast_periods || []).map((w) => ({
    sem: moment(w.week_start).format("DD/MM"),
    "Predicción": parseFloat(w.forecast_qty?.toFixed(1) ?? 0),
    "IC inf.":    parseFloat(w.lower_95?.toFixed(1) ?? 0),
    "IC sup.":    parseFloat(w.upper_95?.toFixed(1) ?? 0),
  }));

  if (!data.length)
    return <p className="text-sm text-default-400 text-center py-4">Sin períodos de predicción disponibles</p>;

  const gradId = `grad-df-${product.product_id}`;

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#7828C8" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#7828C8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="sem" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} width={38} />
          <RechartsTooltip formatter={(v, name) => [NUM(v), name]} />
          <Area dataKey="IC sup."    stroke="none"     fill={`url(#${gradId})`} fillOpacity={1} legendType="none" />
          <Area dataKey="IC inf."    stroke="none"     fill="white"              fillOpacity={1} legendType="none" />
          <Area dataKey="Predicción" stroke="#7828C8"  strokeWidth={2}           fill="none"    dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── KpiCard ───────────────────────────────────────────────────────────────────

function KpiCard({ label, value, subtitle, accentColor }) {
  return (
    <Card shadow="none" className={`border border-default-200 border-l-4 ${accentColor}`}>
      <CardBody className="py-3 px-4">
        <span className="text-xs font-medium text-default-500 uppercase tracking-wider">{label}</span>
        <span className="text-2xl font-bold text-default-900 block mt-0.5">{value}</span>
        {subtitle && <span className="text-xs text-default-400 mt-0.5 block">{subtitle}</span>}
      </CardBody>
    </Card>
  );
}

// ── ExpandedRow (detalle de predicción) ───────────────────────────────────────

function ExpandedRow({ p }) {
  const ss = p.safety_stock_info || {};
  const cv = ss.coefficient_of_variation || 0;
  const cvColor = cv < 0.5 ? "text-success-600" : cv < 1 ? "text-warning-600" : "text-danger-600";

  return (
    <div className="px-5 py-5 flex flex-col gap-4 bg-default-50/60 border-b border-default-200">
      {p.abc_xyz?.strategy && (
        <p className="text-sm text-default-700">
          <span className="font-semibold text-default-500">Estrategia recomendada: </span>
          {p.abc_xyz.strategy}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Demanda / semana",   value: `${NUM(ss.avg_demand_per_period)} ${p.product_unit}`, cls: "text-default-900" },
          { label: "Desv. estándar",     value: `${NUM(ss.demand_std)} ${p.product_unit}`,            cls: "text-default-900" },
          { label: "Coef. variación",    value: `${(cv * 100).toFixed(1)}%`,                          cls: cvColor },
          { label: "Nivel de servicio",  value: `${((ss.service_level || 0) * 100).toFixed(0)}%`,     cls: "text-default-900" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="flex flex-col gap-0.5 p-3 rounded-xl border border-default-200 bg-white">
            <span className="text-[10px] text-default-400 uppercase tracking-wide">{label}</span>
            <span className={`font-bold text-sm ${cls}`}>{value}</span>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-2">
          Predicción semanal · {p.forecast_periods?.length || 0} semanas · IC 95%
        </p>
        <ForecastChart product={p} />
      </div>
    </div>
  );
}

// ── AbcXyzMatrix ──────────────────────────────────────────────────────────────

function AbcXyzMatrix({ abcData, loading }) {
  const cells = useMemo(() => {
    const map = {};
    for (const p of (abcData || [])) {
      const key = `${p.abc}${p.xyz}`;
      (map[key] = map[key] || []).push(p);
    }
    return map;
  }, [abcData]);

  if (loading)
    return <div className="flex justify-center py-16"><Spinner size="lg" label="Calculando ABC-XYZ..." /></div>;

  if (!abcData?.length)
    return <p className="text-center py-12 text-default-400">No hay datos. Verifica que adatex-forecast-api esté corriendo.</p>;

  const ABCS = ["A", "B", "C"];
  const XYZS = ["X", "Y", "Z"];
  const XYZ_NAMES = { X: "Consistente", Y: "Variable", Z: "Errática" };

  return (
    <div className="flex flex-col gap-6">
      {/* Heatmap */}
      <Card shadow="none" className="border border-default-200">
        <CardBody className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="w-28" />
                {XYZS.map((xyz) => (
                  <th key={xyz} className="text-center p-3 min-w-[160px]">
                    <div className="flex flex-col items-center gap-1">
                      <Chip size="sm" color={XYZ_COLORS[xyz]} variant="flat">{xyz}</Chip>
                      <span className="text-xs text-default-500 font-normal">{XYZ_NAMES[xyz]}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ABCS.map((abc) => (
                <tr key={abc}>
                  <td className="p-2 text-right pr-4">
                    <div className="flex flex-col items-end gap-1">
                      <Chip size="sm" color={ABC_COLORS[abc]} variant="flat">{abc}</Chip>
                      <span className="text-xs text-default-500">
                        {abc === "A" ? "Alto valor" : abc === "B" ? "Valor medio" : "Bajo valor"}
                      </span>
                    </div>
                  </td>
                  {XYZS.map((xyz) => {
                    const key  = `${abc}${xyz}`;
                    const prods = cells[key] || [];
                    const s    = CELL_STYLE[key];
                    return (
                      <td key={xyz} className={`p-3 border ${s.border} ${s.bg} align-top`}>
                        <div className="flex flex-col gap-1.5 min-h-[90px]">
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-bold ${s.text}`}>{key}</span>
                            <span className={`ml-auto text-xl font-black ${s.text}`}>{prods.length}</span>
                          </div>
                          <span className="text-xs text-default-500">{s.strategy}</span>
                          {prods.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {prods.slice(0, 3).map((p) => (
                                <Tooltip key={p.product_id} content={p.product_name}>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border cursor-help ${s.bg} ${s.text} ${s.border}`}>
                                    {p.product_code}
                                  </span>
                                </Tooltip>
                              ))}
                              {prods.length > 3 && (
                                <span className="text-[10px] text-default-400">+{prods.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Leyenda */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card shadow="none" className="border border-default-200">
          <CardBody className="p-4">
            <p className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-3">Clasificación ABC (por ingresos)</p>
            <div className="flex flex-col gap-2">
              {ABCS.map((abc) => (
                <div key={abc} className="flex items-center gap-2">
                  <Chip size="sm" color={ABC_COLORS[abc]} variant="flat" className="w-8 shrink-0">{abc}</Chip>
                  <span className="text-sm text-default-600">{ABC_DESC[abc]}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
        <Card shadow="none" className="border border-default-200">
          <CardBody className="p-4">
            <p className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-3">Clasificación XYZ (por variabilidad)</p>
            <div className="flex flex-col gap-2">
              {XYZS.map((xyz) => (
                <div key={xyz} className="flex items-center gap-2">
                  <Chip size="sm" color={XYZ_COLORS[xyz]} variant="flat" className="w-8 shrink-0">{xyz}</Chip>
                  <span className="text-sm text-default-600">{XYZ_DESC[xyz]}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Lista completa */}
      <Card shadow="none" className="border border-default-200">
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-default-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-default-600 text-xs uppercase tracking-wide">Producto</th>
                <th className="px-4 py-3 text-left font-semibold text-default-600 text-xs uppercase tracking-wide">Código</th>
                <th className="px-4 py-3 text-center font-semibold text-default-600 text-xs uppercase tracking-wide">ABC</th>
                <th className="px-4 py-3 text-center font-semibold text-default-600 text-xs uppercase tracking-wide">XYZ</th>
                <th className="px-4 py-3 text-left font-semibold text-default-600 text-xs uppercase tracking-wide">Estrategia recomendada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default-100">
              {abcData.map((p) => (
                <tr key={p.product_id} className="hover:bg-default-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-default-900">{p.product_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-default-500">{p.product_code}</td>
                  <td className="px-4 py-3 text-center">
                    <Chip size="sm" color={ABC_COLORS[p.abc]} variant="flat">{p.abc}</Chip>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Chip size="sm" color={XYZ_COLORS[p.xyz]} variant="flat">{p.xyz}</Chip>
                  </td>
                  <td className="px-4 py-3 text-xs text-default-600">{p.strategy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

function DemandForecastPageInner() {
  const [suggestions, setSuggestions]   = useState([]);
  const [abcData,     setAbcData]       = useState([]);
  const [loading,     setLoading]       = useState(true);
  const [abcLoading,  setAbcLoading]    = useState(false);
  const [abcLoaded,   setAbcLoaded]     = useState(false);
  const [refreshing,  setRefreshing]    = useState(false);
  const [unavailable, setUnavailable]   = useState(false);
  const [search,      setSearch]        = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [abcFilter,   setAbcFilter]     = useState("all");
  const [expandedRow, setExpandedRow]   = useState(null);
  const [activeTab,   setActiveTab]     = useState("suggestions");

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setUnavailable(false);
    try {
      const res = await fetch("/api/forecast/purchase-suggestions");
      if (res.status === 503) { setUnavailable(true); return; }
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Error cargando predicciones de demanda");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAbcXyz = useCallback(async () => {
    if (abcLoaded) return;
    setAbcLoading(true);
    try {
      const res = await fetch("/api/forecast/abc-xyz");
      if (!res.ok) throw new Error("Error");
      setAbcData(await res.json());
      setAbcLoaded(true);
    } catch {
      toast.error("Error cargando clasificación ABC-XYZ");
    } finally {
      setAbcLoading(false);
    }
  }, [abcLoaded]);

  useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);
  useEffect(() => { if (activeTab === "abc") fetchAbcXyz(); }, [activeTab, fetchAbcXyz]);

  const refreshCache = async () => {
    setRefreshing(true);
    const t = toast.loading("Recalculando con Prophet ML...");
    try {
      await fetch("/api/forecast/refresh-cache", { method: "POST" });
      toast.dismiss(t);
      setAbcLoaded(false);
      await fetchSuggestions();
      toast.success("Predicciones actualizadas");
    } catch {
      toast.dismiss(t);
      toast.error("Error al recalcular");
    } finally {
      setRefreshing(false);
    }
  };

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
    if (abcFilter   !== "all") r = r.filter((p) => p.abc_xyz?.abc === abcFilter);
    return r;
  }, [suggestions, search, statusFilter, abcFilter]);

  const kpi = useMemo(() => {
    let deficit = 0, orderSoon = 0, prophetCount = 0;
    for (const s of suggestions) {
      if (s.status === "deficit")    deficit++;
      if (s.status === "order_soon") orderSoon++;
      if (s.forecast_method === "prophet") prophetCount++;
    }
    return { deficit, orderSoon, prophetCount, total: suggestions.length };
  }, [suggestions]);

  const stockCoverage = (p) => {
    const rp = p.safety_stock_info?.reorder_point || 0;
    if (!rp) return 100;
    return Math.min(Math.round((p.current_stock / rp) * 100), 200);
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
      "Déficit":            p.deficit || 0,
      "# Clientes":         p.customer_count || 0,
      Método:               METHOD_LABELS[p.forecast_method] || "",
      Confianza:            CONFIDENCE_LABELS[p.forecast_confidence] || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0] || {}).map((h) => ({ wch: Math.max(h.length + 2, 16) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Predicción Demanda");
    XLSX.writeFile(wb, `Prediccion-Demanda-${moment().format("YYYY-MM-DD")}.xlsx`);
    toast.success("Excel exportado");
  };

  if (unavailable) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-bold text-xl lg:text-3xl">Pronóstico de Demanda</h1>
        <Card className="border border-warning-200 bg-warning-50" shadow="none">
          <CardBody className="p-6 flex flex-col gap-3">
            <p className="text-warning-800 font-semibold text-base">Servicio de predicción no disponible</p>
            <p className="text-warning-700 text-sm">
              El servicio <code className="bg-warning-100 px-1 rounded">adatex-forecast-api</code> no está corriendo.
              Inicia el servidor Python para ver las predicciones de demanda basadas en Prophet ML.
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
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-xl lg:text-3xl">Pronóstico de Demanda</h1>
            <Chip size="sm" color="secondary" variant="flat">Prophet ML</Chip>
          </div>
          <p className="text-sm text-default-500 mt-0.5">
            Predicciones semanales con intervalos de confianza 95% · Stock de seguridad estadístico · ABC-XYZ
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            color="secondary"
            variant="flat"
            size="sm"
            onPress={refreshCache}
            isDisabled={refreshing || loading}
          >
            {refreshing ? "Recalculando..." : "Recalcular"}
          </Button>
          <Button
            color="success"
            variant="flat"
            size="sm"
            onPress={exportToExcel}
            isDisabled={loading || filtered.length === 0}
          >
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
            <KpiCard label="Productos en Déficit"      value={kpi.deficit}      subtitle="Reponer urgente"                   accentColor="border-l-danger-400" />
            <KpiCard label="Pedir Pronto"              value={kpi.orderSoon}    subtitle="Stock bajo el punto de reorden"    accentColor="border-l-warning-400" />
            <KpiCard label="Predichos con Prophet"     value={kpi.prophetCount} subtitle={`de ${kpi.total} productos`}      accentColor="border-l-secondary-400" />
            <KpiCard label="Total Productos"           value={kpi.total}        subtitle="Con historial de ventas"           accentColor="border-l-default-300" />
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(k) => { setActiveTab(k); setExpandedRow(null); }}
        variant="underlined"
        color="secondary"
      >
        {/* ── Tab 1: Sugerencias ─────────────────────────────── */}
        <Tab key="suggestions" title="Sugerencias de Reposición">
          <div className="flex flex-col gap-4 mt-2">
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
                <SelectItem key="deficit">🔴 Déficit</SelectItem>
                <SelectItem key="order_soon">🟡 Pedir Pronto</SelectItem>
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
                <SelectItem key="A">A — Alto valor</SelectItem>
                <SelectItem key="B">B — Valor medio</SelectItem>
                <SelectItem key="C">C — Bajo valor</SelectItem>
              </Select>
            </div>

            {/* Tabla */}
            {loading ? (
              <div className="flex justify-center py-16">
                <Spinner size="lg" label="Calculando predicciones de demanda..." />
              </div>
            ) : (
              <Card shadow="none" className="border border-default-200 overflow-hidden">
                <CardBody className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-default-50 border-b border-default-200">
                      <tr>
                        <th className="px-3 py-3 text-center font-semibold text-default-600 text-xs uppercase tracking-wide w-32">Estado</th>
                        <th className="px-3 py-3 text-left font-semibold text-default-600 text-xs uppercase tracking-wide">Producto</th>
                        <th className="px-3 py-3 text-center font-semibold text-default-600 text-xs uppercase tracking-wide w-24">
                          <Tooltip content="ABC = prioridad por valor de ingresos · XYZ = variabilidad de la demanda">
                            <span className="cursor-help underline decoration-dotted">ABC-XYZ</span>
                          </Tooltip>
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-default-600 text-xs uppercase tracking-wide min-w-[160px]">
                          <Tooltip content="Stock actual como porcentaje del punto de reorden. Menos del 100% significa que hay que pedir.">
                            <span className="cursor-help underline decoration-dotted">Cobertura de Stock</span>
                          </Tooltip>
                        </th>
                        <th className="px-3 py-3 text-right font-semibold text-default-600 text-xs uppercase tracking-wide">
                          <Tooltip content="Cantidad total que se prevé vender en el horizonte configurado (90 días por defecto)">
                            <span className="cursor-help underline decoration-dotted">Demanda Predicha</span>
                          </Tooltip>
                        </th>
                        <th className="px-3 py-3 text-right font-semibold text-default-600 text-xs uppercase tracking-wide">
                          <Tooltip content="Cantidad que falta para cubrir la demanda predicha más el stock de seguridad. Negativo = hay margen.">
                            <span className="cursor-help underline decoration-dotted">Déficit</span>
                          </Tooltip>
                        </th>
                        <th className="px-3 py-3 text-center font-semibold text-default-600 text-xs uppercase tracking-wide w-32">Modelo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-default-100">
                      {filtered.map((p, idx) => {
                        const sc       = STATUS_CONFIG[p.status] || STATUS_CONFIG.sufficient;
                        const coverage = stockCoverage(p);
                        const isExp    = expandedRow === idx;
                        return [
                          <tr
                            key={`r-${idx}`}
                            className="hover:bg-default-50/80 transition-colors cursor-pointer"
                            onClick={() => setExpandedRow(isExp ? null : idx)}
                          >
                            <td className="px-3 py-3 text-center">
                              <Chip size="sm" color={sc.color} variant="flat">{sc.label}</Chip>
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
                            <td className="px-3 py-3 min-w-[160px]">
                              <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-xs text-default-500">
                                  <span>{NUM(p.current_stock)} {p.product_unit}</span>
                                  <span>/ {NUM(p.safety_stock_info?.reorder_point)} {p.product_unit}</span>
                                </div>
                                <Progress
                                  size="sm"
                                  value={coverage}
                                  maxValue={200}
                                  color={coverage < 100 ? "danger" : coverage < 150 ? "warning" : "success"}
                                />
                                <span className="text-xs font-medium text-default-600">{coverage}% del punto de reorden</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right font-semibold text-default-900">
                              {NUM(p.total_forecast_qty)} {p.product_unit}
                            </td>
                            <td className={`px-3 py-3 text-right font-semibold ${p.deficit > 0 ? "text-danger-600" : "text-success-600"}`}>
                              {p.deficit > 0 ? `−${NUM(p.deficit)}` : `+${NUM(Math.abs(p.deficit))}`} {p.product_unit}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <Chip size="sm" color={METHOD_COLORS[p.forecast_method]} variant="flat">
                                  {METHOD_LABELS[p.forecast_method]}
                                </Chip>
                                <span className={`text-xs font-medium ${CONFIDENCE_TEXT[p.forecast_confidence] || "text-default-400"}`}>
                                  {CONFIDENCE_LABELS[p.forecast_confidence] || "—"}
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
                              ? "No hay datos de predicción. Verifica que adatex-forecast-api esté corriendo."
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
        </Tab>

        {/* ── Tab 2: ABC-XYZ ─────────────────────────────────── */}
        <Tab key="abc" title="Clasificación ABC-XYZ">
          <div className="mt-2">
            <AbcXyzMatrix abcData={abcData} loading={abcLoading} />
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}

export default function DemandForecastPage() {
  return (
    <RoleGuard forbiddenRoles={[]} fallbackRoute="/">
      <DemandForecastPageInner />
    </RoleGuard>
  );
}
