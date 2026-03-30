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
  CardHeader,
  CardBody,
  CardFooter,
  Divider,
  Chip,
  Progress,
  Tooltip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
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

// ── Formato numérico ──────────────────────────────────────────────────────────

const NUM = (v) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(v || 0);

// ── Configuraciones de UI ─────────────────────────────────────────────────────

const STATUS_CONFIG = {
  deficit:    { label: "Déficit",      color: "danger",  sortOrder: 0 },
  order_soon: { label: "Pedir pronto", color: "warning", sortOrder: 1 },
  sufficient: { label: "Suficiente",   color: "success", sortOrder: 2 },
};

const ABC_COLORS = { A: "danger", B: "warning", C: "default" };
const XYZ_COLORS = { X: "success", Y: "warning", Z: "danger" };

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

const CONFIDENCE_LABELS = { high: "Alta", medium: "Media", low: "Baja" };
const CONFIDENCE_COLORS = { high: "success", medium: "warning", low: "danger" };

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

// ── ForecastChart ─────────────────────────────────────────────────────────────

function ForecastChart({ product }) {
  const data = (product.forecast_periods || []).map((w) => ({
    sem:         moment(w.week_start).format("DD/MM"),
    "Predicción": parseFloat(w.forecast_qty?.toFixed(1) ?? 0),
    "IC inf.":    parseFloat(w.lower_95?.toFixed(1) ?? 0),
    "IC sup.":    parseFloat(w.upper_95?.toFixed(1) ?? 0),
  }));

  if (!data.length)
    return (
      <p className="text-sm text-default-400 text-center py-4">
        Sin períodos de predicción disponibles
      </p>
    );

  const gradId = `grad-df-${product.product_id}`;

  return (
    <div className="h-44">
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
          <YAxis tick={{ fontSize: 10 }} width={36} />
          <RechartsTooltip formatter={(v, name) => [NUM(v), name]} />
          <Area dataKey="IC sup."    stroke="none"    fill={`url(#${gradId})`} fillOpacity={1} legendType="none" />
          <Area dataKey="IC inf."    stroke="none"    fill="white"             fillOpacity={1} legendType="none" />
          <Area dataKey="Predicción" stroke="#7828C8" strokeWidth={2}          fill="none"     dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── KpiCard ───────────────────────────────────────────────────────────────────

function KpiCard({ label, value, subtitle, loading }) {
  return (
    <Card shadow="sm">
      <CardBody className="p-5 gap-3">
        <p className="text-xs font-semibold text-default-400 uppercase tracking-widest leading-tight">
          {label}
        </p>
        {loading ? (
          <div className="h-8 w-20 bg-default-200 rounded-lg animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-default-900 leading-none">{value}</p>
        )}
        {subtitle && (
          <p className="text-xs text-default-400">{subtitle}</p>
        )}
      </CardBody>
    </Card>
  );
}

// ── DetailPanel ───────────────────────────────────────────────────────────────

function DetailPanel({ p }) {
  const ss  = p.safety_stock_info || {};
  const cv  = ss.coefficient_of_variation || 0;
  const cvColor =
    cv < 0.5 ? "text-success-600" : cv < 1 ? "text-warning-600" : "text-danger-600";
  const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.sufficient;

  const stats = [
    { label: "Stock actual",      value: `${NUM(p.current_stock)} ${p.product_unit}` },
    { label: "En tránsito",       value: `${NUM(p.incoming_stock)} ${p.product_unit}`, color: p.incoming_stock > 0 ? "text-primary-600 font-semibold" : undefined },
    { label: "Stock seguridad",   value: `${NUM(ss.safety_stock)} ${p.product_unit}` },
    { label: "Punto de reorden",  value: `${NUM(ss.reorder_point)} ${p.product_unit}` },
    { label: "Demanda/semana",    value: `${NUM(ss.avg_demand_per_period)} ${p.product_unit}` },
    { label: "Desv. estándar",    value: `${NUM(ss.demand_std)} ${p.product_unit}` },
    { label: "Coef. variación",   value: `${(cv * 100).toFixed(1)}%`, color: cvColor },
    { label: "Nivel de servicio", value: `${((ss.service_level || 0) * 100).toFixed(0)}%` },
  ];

  return (
    <Card shadow="sm" className="h-full">
      <CardHeader className="flex flex-col items-start gap-1.5 px-5 pt-5 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip size="sm" color={sc.color} variant="flat">{sc.label}</Chip>
          {p.abc_xyz?.category && (
            <>
              <Chip size="sm" color={ABC_COLORS[p.abc_xyz.abc]} variant="flat">
                {p.abc_xyz.abc}
              </Chip>
              <Chip size="sm" color={XYZ_COLORS[p.abc_xyz.xyz]} variant="flat">
                {p.abc_xyz.xyz}
              </Chip>
            </>
          )}
          <Chip size="sm" color={METHOD_COLORS[p.forecast_method]} variant="flat">
            {METHOD_LABELS[p.forecast_method]}
          </Chip>
          <Chip size="sm" color={CONFIDENCE_COLORS[p.forecast_confidence]} variant="flat">
            Conf. {CONFIDENCE_LABELS[p.forecast_confidence]}
          </Chip>
        </div>
        <p className="text-base font-semibold text-default-800 leading-snug">{p.product_name}</p>
        <p className="text-xs text-default-400">
          {p.product_code} · {p.product_category} · {p.customer_count} cliente
          {p.customer_count !== 1 ? "s" : ""}
        </p>
        {p.abc_xyz?.strategy && (
          <p className="text-xs text-default-500">
            <span className="font-semibold">Estrategia: </span>{p.abc_xyz.strategy}
          </p>
        )}
      </CardHeader>
      <Divider />
      <CardBody className="flex flex-col gap-4 px-5 py-4 overflow-y-auto">
        {/* Métricas */}
        <div className="grid grid-cols-2 gap-2">
          {stats.map(({ label, value, color }) => (
            <div
              key={label}
              className="flex flex-col gap-0.5 p-2.5 rounded-xl bg-default-50"
            >
              <span className="text-[10px] font-semibold text-default-400 uppercase tracking-widest">{label}</span>
              <span className={`font-bold text-sm ${color || "text-default-900"}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Gráfico de predicción */}
        <div>
          <p className="text-xs font-semibold text-default-400 uppercase tracking-widest mb-2">
            Predicción semanal · {p.forecast_periods?.length || 0} semanas · IC 95%
          </p>
          <ForecastChart product={p} />
        </div>
      </CardBody>
      {p.incoming_stock > 0 && p.earliest_arrival && (
        <>
          <Divider />
          <CardFooter className="px-5 py-3">
            <p className="text-xs text-primary-600 font-medium">
              📦 {NUM(p.incoming_stock)} {p.product_unit} esperados ~
              {moment(p.earliest_arrival).format("DD MMM YYYY")}
            </p>
          </CardFooter>
        </>
      )}
    </Card>
  );
}

// ── AbcXyzMatrix ──────────────────────────────────────────────────────────────

function AbcXyzMatrix({ abcData, loading }) {
  const cells = useMemo(() => {
    const map = {};
    for (const p of abcData || []) {
      const key = `${p.abc}${p.xyz}`;
      (map[key] = map[key] || []).push(p);
    }
    return map;
  }, [abcData]);

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Calculando ABC-XYZ..." />
      </div>
    );

  if (!abcData?.length)
    return (
      <p className="text-center py-12 text-default-400">
        No hay datos. Verifica que adatex-forecast-api esté corriendo.
      </p>
    );

  const ABCS = ["A", "B", "C"];
  const XYZS = ["X", "Y", "Z"];
  const XYZ_NAMES = { X: "Consistente", Y: "Variable", Z: "Errática" };

  return (
    <div className="flex flex-col gap-6 mt-2">
      {/* Heatmap */}
      <Card shadow="sm">
        <CardHeader className="flex flex-col items-start px-5 pt-5 pb-3">
          <p className="text-base font-semibold text-default-800">Matriz ABC-XYZ</p>
          <p className="text-xs text-default-400">Prioridad por valor de ingresos × variabilidad de demanda</p>
        </CardHeader>
        <Divider />
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
                    const key   = `${abc}${xyz}`;
                    const prods = cells[key] || [];
                    const s     = CELL_STYLE[key];
                    return (
                      <td key={xyz} className={`p-3 border ${s.border} ${s.bg} align-top`}>
                        <div className="flex flex-col gap-1.5 min-h-[90px]">
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-bold ${s.text}`}>{key}</span>
                            <span className={`ml-auto text-xl font-black ${s.text}`}>
                              {prods.length}
                            </span>
                          </div>
                          <span className="text-xs text-default-500">{s.strategy}</span>
                          {prods.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {prods.slice(0, 3).map((p) => (
                                <Tooltip key={p.product_id} content={p.product_name}>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono border cursor-help ${s.bg} ${s.text} ${s.border}`}
                                  >
                                    {p.product_code}
                                  </span>
                                </Tooltip>
                              ))}
                              {prods.length > 3 && (
                                <span className="text-[10px] text-default-400">
                                  +{prods.length - 3}
                                </span>
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

      {/* Leyendas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card shadow="sm">
          <CardHeader className="px-5 pt-4 pb-2">
            <p className="text-xs font-semibold text-default-400 uppercase tracking-widest">
              Clasificación ABC (por ingresos)
            </p>
          </CardHeader>
          <Divider />
          <CardBody className="px-5 py-4 flex flex-col gap-2">
            {ABCS.map((abc) => (
              <div key={abc} className="flex items-center gap-2">
                <Chip size="sm" color={ABC_COLORS[abc]} variant="flat" className="w-8 shrink-0">
                  {abc}
                </Chip>
                <span className="text-sm text-default-600">{ABC_DESC[abc]}</span>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card shadow="sm">
          <CardHeader className="px-5 pt-4 pb-2">
            <p className="text-xs font-semibold text-default-400 uppercase tracking-widest">
              Clasificación XYZ (por variabilidad)
            </p>
          </CardHeader>
          <Divider />
          <CardBody className="px-5 py-4 flex flex-col gap-2">
            {XYZS.map((xyz) => (
              <div key={xyz} className="flex items-center gap-2">
                <Chip size="sm" color={XYZ_COLORS[xyz]} variant="flat" className="w-8 shrink-0">
                  {xyz}
                </Chip>
                <span className="text-sm text-default-600">{XYZ_DESC[xyz]}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Lista completa */}
      <Table
        aria-label="Clasificación ABC-XYZ completa"
        classNames={{
          wrapper: "shadow-sm rounded-xl",
          th: "bg-default-50 text-default-400 text-xs font-semibold uppercase tracking-widest",
        }}
      >
        <TableHeader>
          <TableColumn>Producto</TableColumn>
          <TableColumn>Código</TableColumn>
          <TableColumn align="center">ABC</TableColumn>
          <TableColumn align="center">XYZ</TableColumn>
          <TableColumn>Estrategia recomendada</TableColumn>
        </TableHeader>
        <TableBody items={abcData}>
          {(p) => (
            <TableRow key={p.product_id}>
              <TableCell className="font-medium">{p.product_name}</TableCell>
              <TableCell>
                <span className="font-mono text-xs text-default-500">{p.product_code}</span>
              </TableCell>
              <TableCell>
                <Chip size="sm" color={ABC_COLORS[p.abc]} variant="flat">{p.abc}</Chip>
              </TableCell>
              <TableCell>
                <Chip size="sm" color={XYZ_COLORS[p.xyz]} variant="flat">{p.xyz}</Chip>
              </TableCell>
              <TableCell className="text-xs text-default-600">{p.strategy}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Columnas de la tabla de sugerencias ───────────────────────────────────────

const SUGGESTION_COLUMNS = [
  { key: "status",   label: "Estado",           width: "w-28" },
  { key: "product",  label: "Producto" },
  { key: "abcxyz",   label: "ABC-XYZ",          width: "w-24" },
  { key: "coverage", label: "Cobertura de Stock" },
  { key: "demand",   label: "Demanda predicha",  width: "w-36" },
  { key: "deficit",  label: "Déficit",           width: "w-32" },
  { key: "method",   label: "Modelo",            width: "w-32" },
];

// ── Página principal ──────────────────────────────────────────────────────────

function DemandForecastPageInner() {
  const [suggestions, setSuggestions]     = useState([]);
  const [abcData,     setAbcData]         = useState([]);
  const [loading,     setLoading]         = useState(true);
  const [abcLoading,  setAbcLoading]      = useState(false);
  const [abcLoaded,   setAbcLoaded]       = useState(false);
  const [refreshing,  setRefreshing]      = useState(false);
  const [unavailable, setUnavailable]     = useState(false);
  const [search,      setSearch]          = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [abcFilter,   setAbcFilter]       = useState("all");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeTab,   setActiveTab]       = useState("suggestions");
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onOpenChange: onDetailOpenChange } = useDisclosure();

  // ── Carga de datos ──────────────────────────────────────────────────────────

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setUnavailable(false);
    try {
      const res = await fetch("/api/forecast/purchase-suggestions?horizon_days=120");
      if (res.status === 503) { setUnavailable(true); return; }
      if (!res.ok) throw new Error("Error cargando sugerencias");
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
  useEffect(() => {
    if (activeTab === "abc") fetchAbcXyz();
  }, [activeTab, fetchAbcXyz]);

  // ── Recalcular cache ────────────────────────────────────────────────────────

  const refreshCache = async () => {
    setRefreshing(true);
    const t = toast.loading("Recalculando con Prophet ML...");
    try {
      await fetch("/api/forecast/refresh-cache", { method: "POST" });
      toast.dismiss(t);
      setAbcLoaded(false);
      setSelectedProduct(null);
      await fetchSuggestions();
      toast.success("Predicciones actualizadas");
    } catch {
      toast.dismiss(t);
      toast.error("Error al recalcular");
    } finally {
      setRefreshing(false);
    }
  };

  // ── Filtros y KPIs ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let r = suggestions;
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(
        (p) =>
          p.product_name?.toLowerCase().includes(s) ||
          p.product_code?.toLowerCase().includes(s) ||
          p.product_category?.toLowerCase().includes(s),
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

  // ── Acciones de fila ────────────────────────────────────────────────────────

  const handleRowAction = useCallback((key) => {
    const product = filtered.find((p) => String(p.product_id) === String(key));
    if (!product) return;
    // Mismo producto: deseleccionar
    if (selectedProduct?.product_id === product.product_id) {
      setSelectedProduct(null);
      return;
    }
    setSelectedProduct(product);
    // En móvil abrir modal
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      onDetailOpen();
    }
  }, [filtered, selectedProduct, onDetailOpen]);

  // ── Render de celdas ────────────────────────────────────────────────────────

  const stockCoverage = (p) => {
    const rp = p.safety_stock_info?.reorder_point || 0;
    if (!rp) return 100;
    return Math.min(
      Math.round(((p.current_stock || 0) + (p.incoming_stock || 0)) / rp * 100),
      200,
    );
  };

  const renderCell = useCallback((p, columnKey) => {
    const sc       = STATUS_CONFIG[p.status] || STATUS_CONFIG.sufficient;
    const coverage = stockCoverage(p);

    switch (columnKey) {
      case "status":
        return <Chip size="sm" color={sc.color} variant="flat">{sc.label}</Chip>;

      case "product":
        return (
          <div className="flex flex-col">
            <span className="font-medium text-default-900 leading-snug">{p.product_name}</span>
            <span className="text-xs text-default-400">
              {p.product_code} · {p.product_category}
              {p.customer_count > 0 && ` · ${p.customer_count} cliente${p.customer_count !== 1 ? "s" : ""}`}
            </span>
          </div>
        );

      case "abcxyz":
        return p.abc_xyz?.category ? (
          <Tooltip content={`${p.abc_xyz.category}: ${p.abc_xyz.strategy}`}>
            <div className="flex gap-1 cursor-help">
              <Chip size="sm" color={ABC_COLORS[p.abc_xyz.abc]} variant="flat">
                {p.abc_xyz.abc}
              </Chip>
              <Chip size="sm" color={XYZ_COLORS[p.abc_xyz.xyz]} variant="flat">
                {p.abc_xyz.xyz}
              </Chip>
            </div>
          </Tooltip>
        ) : (
          <span className="text-default-300">—</span>
        );

      case "coverage":
        return (
          <div className="flex flex-col gap-1 min-w-[140px]">
            <div className="flex justify-between text-xs text-default-500">
              <span>{NUM(p.current_stock)} {p.product_unit}</span>
              <span>/ {NUM(p.safety_stock_info?.reorder_point)}</span>
            </div>
            <Progress
              size="sm"
              value={coverage}
              maxValue={200}
              color={coverage < 100 ? "danger" : coverage < 150 ? "warning" : "success"}
            />
            {p.incoming_stock > 0 ? (
              <span className="text-xs text-primary-600 font-medium">
                +{NUM(p.incoming_stock)} en tránsito
              </span>
            ) : (
              <span className="text-xs text-default-400">{coverage}% del ROP</span>
            )}
          </div>
        );

      case "demand":
        return (
          <span className="font-semibold text-default-900 whitespace-nowrap">
            {NUM(p.total_forecast_qty)} {p.product_unit}
          </span>
        );

      case "deficit":
        return (
          <span
            className={`font-semibold whitespace-nowrap ${p.deficit > 0 ? "text-danger-600" : "text-success-600"}`}
          >
            {p.deficit > 0
              ? `−${NUM(p.deficit)}`
              : `+${NUM(Math.abs(p.deficit))}`}{" "}
            {p.product_unit}
          </span>
        );

      case "method":
        return (
          <Chip size="sm" color={METHOD_COLORS[p.forecast_method]} variant="flat">
            {METHOD_LABELS[p.forecast_method]}
          </Chip>
        );

      default:
        return null;
    }
  }, []);

  // ── Exportar Excel ──────────────────────────────────────────────────────────

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
      "En tránsito":        p.incoming_stock || 0,
      "Stock de seguridad": p.safety_stock_info?.safety_stock || 0,
      "Punto de reorden":   p.safety_stock_info?.reorder_point || 0,
      "Déficit":            p.deficit || 0,
      "# Clientes":         p.customer_count || 0,
      Método:               METHOD_LABELS[p.forecast_method] || "",
      Confianza:            CONFIDENCE_LABELS[p.forecast_confidence] || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0] || {}).map((h) => ({
      wch: Math.max(h.length + 2, 16),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Predicción Demanda");
    XLSX.writeFile(wb, `Prediccion-Demanda-${moment().format("YYYY-MM-DD")}.xlsx`);
    toast.success("Excel exportado");
  };

  // ── Pantalla: servicio no disponible ────────────────────────────────────────

  if (unavailable) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-bold text-xl lg:text-3xl">Predicción de Demanda</h1>
        <Card className="bg-warning-50" shadow="sm">
          <CardBody className="p-6 flex flex-col gap-3">
            <p className="text-warning-800 font-semibold text-base">
              Servicio de predicción no disponible
            </p>
            <p className="text-warning-700 text-sm">
              El servicio{" "}
              <code className="bg-warning-100 px-1 rounded">adatex-forecast-api</code> no está
              corriendo. Inicia el servidor Python para ver las predicciones de demanda basadas
              en Prophet ML.
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

  // ── Render principal ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-bold text-xl lg:text-3xl">Predicción de Demanda</h1>
            <Chip size="sm" color="secondary" variant="flat">Prophet ML</Chip>
          </div>
          <p className="text-sm text-default-500 mt-0.5">
            Horizonte 120 días · Lead time 70 días · IC 95% · ABC-XYZ
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            color="secondary"
            variant="flat"
            size="sm"
            onPress={refreshCache}
            isDisabled={refreshing || loading}
            isLoading={refreshing}
          >
            Recalcular
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

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Déficit"
          value={kpi.deficit}
          subtitle="Reponer urgente"
          loading={loading}
        />
        <KpiCard
          label="Pedir pronto"
          value={kpi.orderSoon}
          subtitle="Bajo el punto de reorden"
          loading={loading}
        />
        <KpiCard
          label="Prophet ML"
          value={kpi.prophetCount}
          subtitle={`de ${kpi.total} productos`}
          loading={loading}
        />
        <KpiCard
          label="Total productos"
          value={kpi.total}
          subtitle="Con historial de ventas"
          loading={loading}
        />
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(k) => {
          setActiveTab(k);
          setSelectedProduct(null);
        }}
        variant="underlined"
        color="secondary"
      >

        {/* ─── Tab 1: Sugerencias de Reposición ──────────────────────────── */}
        <Tab key="suggestions" title="Sugerencias de Reposición">
          <div className="flex flex-col gap-4 mt-2">

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <Input
                placeholder="Buscar producto, código o categoría..."
                value={search}
                onValueChange={(v) => { setSearch(v); setSelectedProduct(null); }}
                className="max-w-xs"
                size="sm"
                isClearable
                onClear={() => setSearch("")}
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
                <SelectItem key="A">A — Alto valor</SelectItem>
                <SelectItem key="B">B — Valor medio</SelectItem>
                <SelectItem key="C">C — Bajo valor</SelectItem>
              </Select>
            </div>

            {/* Vista dividida: tabla (izq) + panel de detalle (der) */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">

              {/* Tabla */}
              <div className="lg:col-span-3">
                <Table
                  aria-label="Sugerencias de compras"
                  selectionMode="single"
                  selectedKeys={
                    selectedProduct
                      ? new Set([String(selectedProduct.product_id)])
                      : new Set()
                  }
                  onRowAction={handleRowAction}
                  classNames={{
                    wrapper: "shadow-sm rounded-xl",
                    th: "bg-default-50 text-default-400 text-xs font-semibold uppercase tracking-widest",
                    tr: "cursor-pointer",
                  }}
                >
                  <TableHeader columns={SUGGESTION_COLUMNS}>
                    {(col) => (
                      <TableColumn key={col.key} className={col.width}>
                        {col.key === "coverage" ? (
                          <Tooltip content="Stock actual como porcentaje del punto de reorden.">
                            <span className="cursor-help underline decoration-dotted">
                              {col.label}
                            </span>
                          </Tooltip>
                        ) : col.key === "deficit" ? (
                          <Tooltip content="Unidades que faltan para cubrir la demanda predicha + stock de seguridad.">
                            <span className="cursor-help underline decoration-dotted">
                              {col.label}
                            </span>
                          </Tooltip>
                        ) : (
                          col.label
                        )}
                      </TableColumn>
                    )}
                  </TableHeader>
                  <TableBody
                    items={filtered}
                    isLoading={loading}
                    loadingContent={
                      <Spinner label="Calculando predicciones..." color="secondary" />
                    }
                    emptyContent={
                      <p className="text-default-400 text-sm py-8 text-center">
                        {loading ? "" : "No hay productos con los filtros seleccionados."}
                      </p>
                    }
                  >
                    {(item) => (
                      <TableRow key={String(item.product_id)}>
                        {(columnKey) => (
                          <TableCell>{renderCell(item, columnKey)}</TableCell>
                        )}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {filtered.length > 0 && (
                  <p className="text-xs text-default-400 mt-2 text-right">
                    {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
                    {filtered.length !== suggestions.length && ` (de ${suggestions.length})`}
                  </p>
                )}
              </div>

              {/* Panel de detalle — solo visible en lg+ */}
              <div className="hidden lg:block lg:col-span-2 lg:sticky lg:top-4">
                {selectedProduct ? (
                  <DetailPanel p={selectedProduct} />
                ) : (
                  <Card shadow="sm" className="border-2 border-dashed border-default-200">
                    <CardBody className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                      <span className="text-3xl">📊</span>
                      <p className="text-default-500 text-sm">
                        Selecciona un producto de la tabla para ver el pronóstico detallado
                      </p>
                    </CardBody>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </Tab>

        {/* ─── Tab 2: Matriz ABC-XYZ ──────────────────────────────────────── */}
        <Tab key="abc" title="Matriz ABC-XYZ">
          <AbcXyzMatrix abcData={abcData} loading={abcLoading} />
        </Tab>
      </Tabs>

      {/* Modal de detalle para móvil */}
      <Modal
        isOpen={isDetailOpen}
        onOpenChange={onDetailOpenChange}
        size="full"
        scrollBehavior="inside"
        classNames={{ base: "m-0 rounded-none sm:rounded-xl sm:m-4", wrapper: "items-end sm:items-center" }}
      >
        <ModalContent>
          {(onClose) =>
            selectedProduct && (
              <>
                <ModalHeader className="flex flex-col gap-0.5 pb-2">
                  <span className="font-bold text-default-900 leading-snug">
                    {selectedProduct.product_name}
                  </span>
                  <span className="text-xs font-normal text-default-400">
                    {selectedProduct.product_code}
                  </span>
                </ModalHeader>
                <ModalBody className="p-0 pb-4">
                  <DetailPanel p={selectedProduct} />
                </ModalBody>
              </>
            )
          }
        </ModalContent>
      </Modal>
    </div>
  );
}

// ── Export con RoleGuard ──────────────────────────────────────────────────────

export default function DemandForecastPage() {
  return (
    <RoleGuard allowedRoles={["admin", "warehouseKeeper"]}>
      <DemandForecastPageInner />
    </RoleGuard>
  );
}
