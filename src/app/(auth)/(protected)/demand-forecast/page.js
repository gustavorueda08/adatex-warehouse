"use client";

import { useEffect, useState, useMemo } from "react";
import { Button, Spinner, Input, Select, SelectItem } from "@heroui/react";
import RoleGuard from "@/components/auth/RoleGuard";
import moment from "moment-timezone";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { buildStrapiQuery } from "@/lib/api/strapiQueryBuilder";

const COP = (v) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(v || 0);

function DashboardCard({ label, value, subtitle, color = "default" }) {
  const colorClasses = {
    default: "bg-default-50 border-default-200",
    success: "bg-success-50 border-success-200",
    warning: "bg-warning-50 border-warning-200",
    primary: "bg-primary-50 border-primary-200",
  };
  return (
    <div className={`flex flex-col gap-1 p-4 rounded-xl border ${colorClasses[color] || colorClasses.default}`}>
      <span className="text-xs font-medium text-default-500 uppercase tracking-wider">{label}</span>
      <span className="text-xl lg:text-2xl font-bold text-default-900">{value}</span>
      {subtitle && <span className="text-xs text-default-400">{subtitle}</span>}
    </div>
  );
}

const confidenceLabels = { high: "Alta", medium: "Media", low: "Baja" };
const confidenceColors = {
  high: "text-success-600",
  medium: "text-warning-600",
  low: "text-danger-600",
};

function DemandForecastPageInner() {
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [search, setSearch] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25 });

  const fetchForecasts = async () => {
    setLoading(true);
    try {
      let all = [];
      let page = 1;
      let pageCount = 1;

      do {
        const q = buildStrapiQuery({
          pagination: { page, pageSize: 100 },
          populate: ["customer", "product"],
          sort: ["forecastVolume:desc"],
        });
        const res = await fetch(`/api/strapi/demand-forecasts?${q}`);
        if (!res.ok) break;
        const data = await res.json();
        all.push(...(data.data || []));
        pageCount = data.meta?.pagination?.pageCount || 1;
        page++;
      } while (page <= pageCount);

      setForecasts(all);
    } catch (err) {
      console.error(err);
      toast.error("Error cargando predicciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecasts();
  }, []);

  const triggerCalc = async () => {
    setTriggering(true);
    const t = toast.loading("Calculando predicciones de demanda...");
    try {
      const res = await fetch("/api/strapi/demand-forecasts/trigger", { method: "POST" });
      if (!res.ok) throw new Error("Error triggering calculation");
      toast.dismiss(t);
      toast.success("Predicciones calculadas exitosamente");
      fetchForecasts();
    } catch (err) {
      toast.dismiss(t);
      toast.error("Error al calcular predicciones");
    } finally {
      setTriggering(false);
    }
  };

  const filtered = useMemo(() => {
    let result = forecasts;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (f) =>
          f.customer?.name?.toLowerCase().includes(s) ||
          f.customer?.lastName?.toLowerCase().includes(s) ||
          f.product?.name?.toLowerCase().includes(s) ||
          f.product?.code?.toLowerCase().includes(s)
      );
    }
    if (confidenceFilter !== "all") {
      result = result.filter((f) => f.confidence === confidenceFilter);
    }
    return result;
  }, [forecasts, search, confidenceFilter]);

  const paginated = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    return filtered.slice(start, start + pagination.pageSize);
  }, [filtered, pagination]);

  const totalPages = Math.ceil(filtered.length / pagination.pageSize) || 1;

  const summary = useMemo(() => {
    let totalVolume = 0;
    let totalProducts = new Set();
    let totalCustomers = new Set();
    for (const f of filtered) {
      totalVolume += Number(f.forecastVolume) || 0;
      if (f.product?.id) totalProducts.add(f.product.id);
      if (f.customer?.id) totalCustomers.add(f.customer.id);
    }
    return {
      totalVolume,
      productCount: totalProducts.size,
      customerCount: totalCustomers.size,
    };
  }, [filtered]);

  const exportToExcel = () => {
    const data = filtered.map((f) => ({
      Cliente: `${f.customer?.name || ""} ${f.customer?.lastName || ""}`.trim(),
      "ID Cliente": f.customer?.identification || "",
      Producto: f.product?.name || "",
      "Código": f.product?.code || "",
      Unidad: f.product?.unit || "",
      "Qty Promedio Mensual": f.avgMonthlyQty || 0,
      "Vol Promedio Mensual": f.avgMonthlyVolume || 0,
      "Qty Predicha": f.forecastQty || 0,
      "Vol Predicha": f.forecastVolume || 0,
      "Frecuencia (días)": f.purchaseFrequencyDays || 0,
      "Próxima Compra": f.nextExpectedPurchaseDate
        ? moment(f.nextExpectedPurchaseDate).format("DD/MM/YYYY")
        : "N/A",
      Confianza: confidenceLabels[f.confidence] || f.confidence,
      "Última Orden": f.lastOrderDate
        ? moment(f.lastOrderDate).format("DD/MM/YYYY")
        : "N/A",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = Object.keys(data[0] || {}).map((h) => ({ wch: Math.max(h.length + 2, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Predicción Demanda");
    XLSX.writeFile(wb, `Prediccion-Demanda-${moment().format("YYYY-MM-DD")}.xlsx`);
    toast.success("Excel exportado");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="font-bold text-xl lg:text-3xl">Predicción de Demanda</h1>
        <div className="flex gap-2">
          <Button color="primary" variant="flat" onPress={triggerCalc} isDisabled={triggering}>
            {triggering ? "Calculando..." : "Recalcular"}
          </Button>
          <Button color="success" variant="flat" onPress={exportToExcel} isDisabled={loading || filtered.length === 0}>
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Dashboard cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <DashboardCard
          label="Volumen Predicho (Mes)"
          value={COP(summary.totalVolume)}
          subtitle={`${filtered.length} predicciones`}
          color="primary"
        />
        <DashboardCard
          label="Productos con Demanda"
          value={summary.productCount}
          subtitle="Productos únicos"
          color="success"
        />
        <DashboardCard
          label="Clientes con Predicción"
          value={summary.customerCount}
          subtitle="Clientes activos"
          color="default"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <Input
          placeholder="Buscar por cliente o producto..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="max-w-sm"
        />
        <Select
          label="Confianza"
          selectedKeys={[confidenceFilter]}
          onChange={(e) => {
            setConfidenceFilter(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="max-w-[180px]"
        >
          <SelectItem key="all">Todas</SelectItem>
          <SelectItem key="high">Alta</SelectItem>
          <SelectItem key="medium">Media</SelectItem>
          <SelectItem key="low">Baja</SelectItem>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-default-200">
            <table className="w-full text-sm">
              <thead className="bg-default-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-default-700">Cliente</th>
                  <th className="px-4 py-3 text-left font-semibold text-default-700">Producto</th>
                  <th className="px-4 py-3 text-right font-semibold text-default-700">Qty Prom.</th>
                  <th className="px-4 py-3 text-right font-semibold text-default-700">Qty Predicha</th>
                  <th className="px-4 py-3 text-right font-semibold text-default-700">Vol. Predicho</th>
                  <th className="px-4 py-3 text-right font-semibold text-default-700">Frecuencia</th>
                  <th className="px-4 py-3 text-left font-semibold text-default-700">Próxima Compra</th>
                  <th className="px-4 py-3 text-center font-semibold text-default-700">Confianza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {paginated.map((f, idx) => (
                  <tr key={f.id || idx} className="hover:bg-default-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-default-900">
                        {f.customer?.name || ""} {f.customer?.lastName || ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-default-900">{f.product?.name || "-"}</span>
                        <span className="text-xs text-default-400">{f.product?.code || ""}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-default-700">
                      {(f.avgMonthlyQty || 0).toFixed(1)} {f.product?.unit || ""}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-default-900">
                      {(f.forecastQty || 0).toFixed(1)} {f.product?.unit || ""}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-default-900">
                      {COP(f.forecastVolume)}
                    </td>
                    <td className="px-4 py-3 text-right text-default-700">
                      {f.purchaseFrequencyDays || 0} días
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${
                        f.nextExpectedPurchaseDate && moment(f.nextExpectedPurchaseDate).isBefore(moment())
                          ? "text-danger-600 font-semibold"
                          : "text-default-700"
                      }`}>
                        {f.nextExpectedPurchaseDate
                          ? moment(f.nextExpectedPurchaseDate).format("DD/MM/YYYY")
                          : "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold text-xs ${confidenceColors[f.confidence] || ""}`}>
                        {confidenceLabels[f.confidence] || f.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-default-400">
                      No hay predicciones disponibles. Ejecuta "Recalcular" para generar datos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 py-2">
              <Button
                size="sm"
                variant="flat"
                isDisabled={pagination.page <= 1}
                onPress={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              >
                Anterior
              </Button>
              <span className="text-sm text-default-600">
                Página {pagination.page} de {totalPages}
              </span>
              <Button
                size="sm"
                variant="flat"
                isDisabled={pagination.page >= totalPages}
                onPress={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
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
