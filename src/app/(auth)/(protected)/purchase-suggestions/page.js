"use client";

import { useEffect, useState, useMemo } from "react";
import { Button, Spinner, Input, Select, SelectItem, Tooltip } from "@heroui/react";
import RoleGuard from "@/components/auth/RoleGuard";
import moment from "moment-timezone";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

const NUM = (v) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(v || 0);

const statusConfig = {
  deficit: { label: "Déficit", bg: "bg-danger-100 text-danger-700", dot: "🔴" },
  order_soon: { label: "Pedir Pronto", bg: "bg-warning-100 text-warning-700", dot: "🟡" },
  sufficient: { label: "Suficiente", bg: "bg-success-100 text-success-700", dot: "🟢" },
};

const abcColors = { A: "bg-danger-100 text-danger-700", B: "bg-warning-100 text-warning-700", C: "bg-default-100 text-default-600" };
const xyzColors = { X: "bg-success-100 text-success-700", Y: "bg-warning-100 text-warning-700", Z: "bg-danger-100 text-danger-700" };
const methodLabels = { prophet: "Prophet", exponential_smoothing: "Suavizado", no_data: "Sin datos" };
const methodColors = { prophet: "text-primary-600", exponential_smoothing: "text-default-500", no_data: "text-danger-400" };
const confidenceColors = { high: "text-success-600", medium: "text-warning-600", low: "text-danger-600" };
const confidenceLabels = { high: "Alta", medium: "Media", low: "Baja" };

function StatCard({ label, value, subtitle, color = "default" }) {
  const bg = {
    default: "bg-default-50 border-default-200",
    success: "bg-success-50 border-success-200",
    warning: "bg-warning-50 border-warning-200",
    danger: "bg-danger-50 border-danger-200",
    primary: "bg-primary-50 border-primary-200",
  };
  return (
    <div className={`flex flex-col gap-1 p-4 rounded-xl border ${bg[color]}`}>
      <span className="text-xs font-medium text-default-500 uppercase tracking-wider">{label}</span>
      <span className="text-xl lg:text-2xl font-bold text-default-900">{value}</span>
      {subtitle && <span className="text-xs text-default-400">{subtitle}</span>}
    </div>
  );
}

function PurchaseSuggestionsInner() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [abcFilter, setAbcFilter] = useState("all");
  const [expandedRow, setExpandedRow] = useState(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/forecast/purchase-suggestions");
      if (!res.ok) {
        // Forecast API not available — fall back to Strapi basic endpoint
        if (res.status === 503) {
          toast.error("El servicio de predicción avanzada no está disponible. Verifica que adatex-forecast-api esté corriendo.");
          return;
        }
        throw new Error("Error fetching");
      }
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
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
    if (abcFilter !== "all") r = r.filter((p) => p.abc_xyz?.abc === abcFilter);
    return r;
  }, [suggestions, search, statusFilter, abcFilter]);

  const summary = useMemo(() => {
    let deficitCount = 0, orderSoonCount = 0, prophetCount = 0;
    for (const s of filtered) {
      if (s.status === "deficit") deficitCount++;
      if (s.status === "order_soon") orderSoonCount++;
      if (s.forecast_method === "prophet") prophetCount++;
    }
    return { deficitCount, orderSoonCount, prophetCount, total: filtered.length };
  }, [filtered]);

  const exportToExcel = () => {
    const data = filtered.map((p) => ({
      Producto: p.product_name || "",
      Código: p.product_code || "",
      Unidad: p.product_unit || "",
      Categoría: p.product_category || "",
      "ABC-XYZ": p.abc_xyz?.category || "",
      Estrategia: p.abc_xyz?.strategy || "",
      "Demanda Predicha (90d)": p.total_forecast_qty || 0,
      "Stock Actual": p.current_stock || 0,
      Déficit: p.deficit || 0,
      "Stock Seguridad": p.safety_stock_info?.safety_stock || 0,
      "Punto de Reorden": p.safety_stock_info?.reorder_point || 0,
      "CV Demanda": p.safety_stock_info?.coefficient_of_variation || 0,
      "# Clientes": p.customer_count || 0,
      Estado: statusConfig[p.status]?.label || p.status,
      Modelo: methodLabels[p.forecast_method] || p.forecast_method,
      Confianza: confidenceLabels[p.forecast_confidence] || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = Object.keys(data[0] || {}).map((h) => ({ wch: Math.max(h.length + 2, 16) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compras Sugeridas");
    XLSX.writeFile(wb, `Compras-Sugeridas-${moment().format("YYYY-MM-DD")}.xlsx`);
    toast.success("Excel exportado");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-bold text-xl lg:text-3xl">Compras Sugeridas</h1>
          <p className="text-sm text-default-500 mt-1">Powered by Prophet ML — intervalos de confianza 95%, stock de seguridad estadístico y clasificación ABC-XYZ</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button color="primary" variant="flat" onPress={refreshCache} isDisabled={refreshing || loading}>
            {refreshing ? "Recalculando..." : "Recalcular"}
          </Button>
          <Button color="success" variant="flat" onPress={exportToExcel} isDisabled={loading || filtered.length === 0}>
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Productos en Déficit" value={summary.deficitCount} subtitle="Requieren reposición urgente" color="danger" />
        <StatCard label="Pedir Pronto" value={summary.orderSoonCount} subtitle="Stock < 150% de la demanda" color="warning" />
        <StatCard label="Predichos con Prophet" value={summary.prophetCount} subtitle={`de ${summary.total} productos`} color="primary" />
        <StatCard label="Total Productos" value={summary.total} subtitle="Con historial de ventas" color="default" />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <Input
          placeholder="Buscar producto o categoría..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select
          label="Estado"
          selectedKeys={[statusFilter]}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="max-w-[160px]"
        >
          <SelectItem key="all">Todos</SelectItem>
          <SelectItem key="deficit">Déficit</SelectItem>
          <SelectItem key="order_soon">Pedir Pronto</SelectItem>
          <SelectItem key="sufficient">Suficiente</SelectItem>
        </Select>
        <Select
          label="Clasificación ABC"
          selectedKeys={[abcFilter]}
          onChange={(e) => setAbcFilter(e.target.value)}
          className="max-w-[160px]"
        >
          <SelectItem key="all">Todas</SelectItem>
          <SelectItem key="A">A — Alto valor</SelectItem>
          <SelectItem key="B">B — Valor medio</SelectItem>
          <SelectItem key="C">C — Bajo valor</SelectItem>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-default-200">
          <table className="w-full text-sm">
            <thead className="bg-default-100">
              <tr>
                <th className="px-3 py-3 text-center font-semibold text-default-700 w-28">Estado</th>
                <th className="px-3 py-3 text-left font-semibold text-default-700">Producto</th>
                <th className="px-3 py-3 text-center font-semibold text-default-700">ABC-XYZ</th>
                <th className="px-3 py-3 text-right font-semibold text-default-700">Demanda 90d</th>
                <th className="px-3 py-3 text-right font-semibold text-default-700">Stock Actual</th>
                <th className="px-3 py-3 text-right font-semibold text-default-700">Stock Seguridad</th>
                <th className="px-3 py-3 text-right font-semibold text-default-700">Pto. Reorden</th>
                <th className="px-3 py-3 text-right font-semibold text-default-700">Déficit</th>
                <th className="px-3 py-3 text-center font-semibold text-default-700">Modelo</th>
                <th className="px-3 py-3 text-center font-semibold text-default-700">Confianza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default-100">
              {filtered.map((p, idx) => {
                const sc = statusConfig[p.status] || statusConfig.sufficient;
                const isExpanded = expandedRow === idx;
                return [
                  <tr
                    key={`row-${idx}`}
                    className="hover:bg-default-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedRow(isExpanded ? null : idx)}
                  >
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${sc.bg}`}>
                        {sc.dot} {sc.label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-default-900">{p.product_name || "-"}</span>
                        <span className="text-xs text-default-400">{p.product_code} · {p.product_category} · {p.customer_count} cliente(s)</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {p.abc_xyz?.category ? (
                        <Tooltip content={p.abc_xyz.strategy} placement="top">
                          <span className="inline-flex gap-1 cursor-help">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${abcColors[p.abc_xyz.abc]}`}>{p.abc_xyz.abc}</span>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${xyzColors[p.abc_xyz.xyz]}`}>{p.abc_xyz.xyz}</span>
                          </span>
                        </Tooltip>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-default-900">
                      {NUM(p.total_forecast_qty)} {p.product_unit}
                    </td>
                    <td className="px-3 py-3 text-right text-default-700">
                      {NUM(p.current_stock)} {p.product_unit}
                    </td>
                    <td className="px-3 py-3 text-right text-default-700">
                      {NUM(p.safety_stock_info?.safety_stock)} {p.product_unit}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-default-800">
                      {NUM(p.safety_stock_info?.reorder_point)} {p.product_unit}
                    </td>
                    <td className={`px-3 py-3 text-right font-semibold ${p.deficit > 0 ? "text-danger-600" : "text-success-600"}`}>
                      {p.deficit > 0 ? `−${NUM(p.deficit)}` : NUM(p.deficit)} {p.product_unit}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs font-medium ${methodColors[p.forecast_method]}`}>
                        {methodLabels[p.forecast_method]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs font-semibold ${confidenceColors[p.forecast_confidence]}`}>
                        {confidenceLabels[p.forecast_confidence]}
                      </span>
                    </td>
                  </tr>,
                  isExpanded && (
                    <tr key={`expanded-${idx}`} className="bg-default-50">
                      <td colSpan={10} className="px-6 py-4">
                        <div className="flex flex-col gap-3">
                          {/* Strategy */}
                          {p.abc_xyz?.strategy && (
                            <div className="text-sm text-default-700">
                              <span className="font-semibold">Estrategia recomendada:</span> {p.abc_xyz.strategy}
                            </div>
                          )}
                          {/* Stats row */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div className="flex flex-col gap-0.5 p-3 rounded-lg border border-default-200 bg-white">
                              <span className="text-default-500 uppercase tracking-wide">Demanda prom / semana</span>
                              <span className="font-bold text-default-900">{NUM(p.safety_stock_info?.avg_demand_per_period)} {p.product_unit}</span>
                            </div>
                            <div className="flex flex-col gap-0.5 p-3 rounded-lg border border-default-200 bg-white">
                              <span className="text-default-500 uppercase tracking-wide">Desv. estándar demanda</span>
                              <span className="font-bold text-default-900">{NUM(p.safety_stock_info?.demand_std)} {p.product_unit}</span>
                            </div>
                            <div className="flex flex-col gap-0.5 p-3 rounded-lg border border-default-200 bg-white">
                              <span className="text-default-500 uppercase tracking-wide">Coef. variación (CV)</span>
                              <span className={`font-bold ${(p.safety_stock_info?.coefficient_of_variation || 0) < 0.5 ? "text-success-600" : (p.safety_stock_info?.coefficient_of_variation || 0) < 1 ? "text-warning-600" : "text-danger-600"}`}>
                                {((p.safety_stock_info?.coefficient_of_variation || 0) * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex flex-col gap-0.5 p-3 rounded-lg border border-default-200 bg-white">
                              <span className="text-default-500 uppercase tracking-wide">Nivel de servicio</span>
                              <span className="font-bold text-default-900">{((p.safety_stock_info?.service_level || 0) * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                          {/* Forecast weeks preview */}
                          {p.forecast_periods?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-default-600 mb-2 uppercase tracking-wide">Próximas semanas (Qty con IC 95%)</p>
                              <div className="flex flex-wrap gap-2">
                                {p.forecast_periods.slice(0, 12).map((w, wi) => (
                                  <div key={wi} className="flex flex-col items-center p-2 rounded-lg border border-default-200 bg-white min-w-[80px]">
                                    <span className="text-xs text-default-400">{moment(w.week_start).format("DD/MM")}</span>
                                    <span className="font-bold text-sm text-default-900">{NUM(w.forecast_qty)}</span>
                                    <span className="text-xs text-default-400">{NUM(w.lower_95)}–{NUM(w.upper_95)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ),
                ];
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-default-400">
                    No hay sugerencias. Asegúrate de que <code>adatex-forecast-api</code> esté corriendo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
