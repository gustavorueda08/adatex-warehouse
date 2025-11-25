"use client";

import { useState, useMemo } from "react";
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

// Generar datos mock para los últimos 30 días
const generateMockData = (days, seed) => {
  const data = [];
  const today = new Date();
  const demo = true;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Usar seed para generar valores consistentes
    const daySeed = seed + i;
    const sales =
      Math.floor((Math.sin(daySeed * 0.5) * 0.5 + 0.5) * 50000) + 30000;
    const purchases =
      Math.floor((Math.sin(daySeed * 0.7) * 0.5 + 0.5) * 40000) + 20000;
    const movements =
      Math.floor((Math.sin(daySeed * 0.3) * 0.5 + 0.5) * 30000) + 15000;

    data.push({
      date: date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
      }),
      fullDate: date.toISOString(),
      ventas: sales,
      compras: purchases,
      movimientos: movements,
    });
  }

  return data;
};

// Tooltip personalizado
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-xl">
        <p className="text-white font-semibold mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 mb-1"
          >
            <span className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-300 text-sm capitalize">
                {entry.name}:
              </span>
            </span>
            <span className="text-white font-medium">
              ${entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Leyenda personalizada
const CustomLegend = ({ payload }) => {
  return (
    <div className="flex flex-wrap justify-center gap-6 mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-300 text-sm font-medium capitalize">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function MonthlyActivity() {
  const [period, setPeriod] = useState(30);

  // Generar datos basados en el período seleccionado con seed fijo
  const data = useMemo(() => generateMockData(period, 12345), [period]);

  // Calcular totales para mostrar
  const totals = useMemo(() => {
    return data.reduce(
      (acc, day) => ({
        ventas: acc.ventas + day.ventas,
        compras: acc.compras + day.compras,
        movimientos: acc.movimientos + day.movimientos,
      }),
      { ventas: 0, compras: 0, movimientos: 0 }
    );
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Controles y estadísticas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Selector de período */}
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod(7)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === 7
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "bg-zinc-700 text-gray-300 hover:bg-zinc-600"
            }`}
          >
            7 días
          </button>
          <button
            onClick={() => setPeriod(30)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === 30
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "bg-zinc-700 text-gray-300 hover:bg-zinc-600"
            }`}
          >
            30 días
          </button>
          <button
            onClick={() => setPeriod(90)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === 90
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "bg-zinc-700 text-gray-300 hover:bg-zinc-600"
            }`}
          >
            90 días
          </button>
        </div>

        {/* Resumen de totales */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-gray-400">Total Ventas:</span>
            <span className="text-white font-semibold" suppressHydrationWarning>
              ${totals.ventas.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-400">Total Compras:</span>
            <span className="text-white font-semibold" suppressHydrationWarning>
              ${totals.compras.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-gray-400">Total Movimientos:</span>
            <span className="text-white font-semibold" suppressHydrationWarning>
              ${totals.movimientos.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="w-full h-80 mt-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              {/* Gradientes para las áreas */}
              <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCompras" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorMovimientos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#3f3f46"
              opacity={0.3}
            />

            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              style={{ fontSize: "12px" }}
              tick={{ fill: "#9ca3af" }}
              tickLine={{ stroke: "#3f3f46" }}
            />

            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: "12px" }}
              tick={{ fill: "#9ca3af" }}
              tickLine={{ stroke: "#3f3f46" }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend content={<CustomLegend />} />

            {/* Áreas con gradientes */}
            <Area
              type="monotone"
              dataKey="ventas"
              name="ventas"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#colorVentas)"
              animationDuration={1000}
            />
            <Area
              type="monotone"
              dataKey="compras"
              name="compras"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#colorCompras)"
              animationDuration={1000}
            />
            <Area
              type="monotone"
              dataKey="movimientos"
              name="movimientos"
              stroke="#a855f7"
              strokeWidth={2.5}
              fill="url(#colorMovimientos)"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Indicadores adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <div className="w-5 h-5 bg-blue-500 rounded-full" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Promedio Diario Ventas</p>
              <p
                className="text-white text-lg font-bold"
                suppressHydrationWarning
              >
                ${Math.floor(totals.ventas / period).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <div className="w-5 h-5 bg-green-500 rounded-full" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Promedio Diario Compras</p>
              <p
                className="text-white text-lg font-bold"
                suppressHydrationWarning
              >
                ${Math.floor(totals.compras / period).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <div className="w-5 h-5 bg-purple-500 rounded-full" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">
                Promedio Diario Movimientos
              </p>
              <p
                className="text-white text-lg font-bold"
                suppressHydrationWarning
              >
                ${Math.floor(totals.movimientos / period).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
