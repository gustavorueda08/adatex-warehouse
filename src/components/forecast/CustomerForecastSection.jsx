"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@heroui/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import moment from "moment-timezone";

const methodLabels = {
  prophet: "Prophet",
  holt_smoothing: "Holt (tendencia)",
  exponential_smoothing: "Suavizado exp.",
  no_data: "Sin datos",
};
const confidenceColors = {
  high: "text-success-600",
  medium: "text-warning-600",
  low: "text-danger-600",
};
const confidenceLabels = { high: "Alta", medium: "Media", low: "Baja" };

function NUM(v) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(v || 0);
}

function ForecastChart({ product }) {
  const chartData = (product.forecast_periods || []).map((w) => ({
    week: moment(w.week_start).format("DD/MM"),
    forecast: w.forecast_qty,
    lower: w.lower_95,
    upper: w.upper_95,
  }));

  if (chartData.length === 0) return null;

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`ci-${product.product_id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7828C8" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#7828C8" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} width={40} />
          <Tooltip
            formatter={(value, name) => {
              const labels = { forecast: "Predicción", lower: "IC Inferior 95%", upper: "IC Superior 95%" };
              return [NUM(value), labels[name] || name];
            }}
          />
          {/* Confidence interval band */}
          <Area
            type="monotone"
            dataKey="upper"
            stroke="none"
            fill={`url(#ci-${product.product_id})`}
            fillOpacity={1}
            legendType="none"
            name="upper"
          />
          <Area
            type="monotone"
            dataKey="lower"
            stroke="none"
            fill="white"
            fillOpacity={1}
            legendType="none"
            name="lower"
          />
          {/* Forecast line */}
          <Area
            type="monotone"
            dataKey="forecast"
            stroke="#7828C8"
            strokeWidth={2}
            fill="none"
            dot={false}
            name="forecast"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProductForecastCard({ product }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-default-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-default-50 hover:bg-default-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-semibold text-default-900">{product.product_name}</span>
            <span className="text-xs text-default-400">{product.product_code}</span>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-default-100 ${methodLabels[product.forecast_method] === "Prophet" ? "text-primary-600" : "text-default-500"}`}>
            {methodLabels[product.forecast_method]}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="font-bold text-default-900">
              {NUM(product.total_forecast_qty)} {product.product_category}
            </span>
            <span className={`text-xs font-semibold ${confidenceColors[product.confidence]}`}>
              Confianza {confidenceLabels[product.confidence]}
            </span>
          </div>
          <span className="text-default-400 text-lg">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Expanded: chart + weekly table */}
      {expanded && (
        <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
          <ForecastChart product={product} />
          {/* Top weeks */}
          <div className="flex flex-wrap gap-2">
            {(product.forecast_periods || []).slice(0, 8).map((w, i) => (
              <div key={i} className="flex flex-col items-center px-3 py-2 rounded-lg border border-default-200 bg-white min-w-[72px]">
                <span className="text-xs text-default-400">{moment(w.week_start).format("DD MMM")}</span>
                <span className="font-bold text-sm text-default-900">{NUM(w.forecast_qty)}</span>
                <span className="text-xs text-default-300">{NUM(w.lower_95)}–{NUM(w.upper_95)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-default-400">
            Datos históricos: {product.data_points} semanas · Horizonte: {(product.forecast_periods || []).length} semanas
          </p>
        </div>
      )}
    </div>
  );
}

export default function CustomerForecastSection({ customerId }) {
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    fetch(`/api/forecast/customers/${customerId}`)
      .then((res) => {
        if (res.status === 503) { setUnavailable(true); return []; }
        if (!res.ok) throw new Error("Error");
        return res.json();
      })
      .then((data) => setForecasts(Array.isArray(data) ? data : []))
      .catch(() => setUnavailable(true))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-3 text-default-400">
        <Spinner size="sm" />
        <span className="text-sm">Calculando predicciones con Prophet...</span>
      </div>
    );
  }

  if (unavailable) {
    return (
      <div className="p-4 rounded-xl border border-warning-200 bg-warning-50 text-sm text-warning-700">
        El servicio de predicción avanzada no está disponible. Inicia <code>adatex-forecast-api</code> para ver las predicciones Prophet de este cliente.
      </div>
    );
  }

  if (forecasts.length === 0) {
    return (
      <p className="text-sm text-default-500 p-4">
        Sin historial de ventas suficiente para generar predicciones para este cliente.
      </p>
    );
  }

  const totalForecast = forecasts.reduce((s, f) => s + (f.total_forecast_qty || 0), 0);
  const prophetCount = forecasts.filter((f) => f.forecast_method === "prophet").length;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex flex-col gap-0.5">
          <span className="text-default-400 text-xs uppercase tracking-wide">Productos con demanda</span>
          <span className="font-bold text-default-900 text-lg">{forecasts.length}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-default-400 text-xs uppercase tracking-wide">Predichos con Prophet</span>
          <span className="font-bold text-primary-700 text-lg">{prophetCount}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-default-400 text-xs uppercase tracking-wide">Demanda total 90 días</span>
          <span className="font-bold text-default-900 text-lg">{NUM(totalForecast)} unidades</span>
        </div>
      </div>

      {/* Product cards */}
      <div className="flex flex-col gap-2">
        {forecasts.map((f) => (
          <ProductForecastCard key={f.product_id} product={f} />
        ))}
      </div>
    </div>
  );
}
