"use client";

import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import RoleGuard from "@/components/auth/RoleGuard";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useProductSelector } from "@/lib/hooks/useProductSelector";

const nf = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2018 }, (_, i) => {
  const y = CURRENT_YEAR - i;
  return { label: String(y), value: y };
});

function KardexPageInner() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [productId, setProductId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const {
    products,
    loading: loadingProducts,
    loadingMore,
    hasMore,
    loadMore,
    setSearch,
    search,
  } = useProductSelector({ pageSize: 20 });

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        label: `${p.code ? p.code + " · " : ""}${p.name} (${p.unit})`,
        value: p.id,
      })),
    [products]
  );

  const buildQuery = () => {
    const params = new URLSearchParams({ year: String(year) });
    if (productId) params.append("productId", String(productId));
    return params.toString();
  };

  const handlePreview = async () => {
    setLoadingPreview(true);
    setPreview(null);
    const toastId = toast.loading("Generando vista previa...");
    try {
      const res = await fetch(
        `/api/strapi/inventory-movement/kardex?${buildQuery()}`,
        { method: "GET" }
      );
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Error ${res.status}`);
      }
      const data = await res.json();
      setPreview(data);
      toast.success(
        `${data.meta.totalProducts} productos · ${data.meta.totalLines} líneas`,
        { id: toastId }
      );
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    const toastId = toast.loading("Generando Excel...");
    try {
      const res = await fetch(
        `/api/strapi/inventory-movement/kardex/download?${buildQuery()}`,
        { method: "GET" }
      );
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : `Kardex-Adatex-${year}.xlsx`;

      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(blob);
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
      toast.success("Descarga lista", { id: toastId });
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
          Kardex de Inventario
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Trazabilidad de inventario por producto (todas las bodegas) en
          cantidades, por año fiscal. Incluye saldo inicial, movimientos físicos
          y saldo final. Pensado para la entrega a la DIAN.
        </p>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 md:p-6 bg-white dark:bg-[#1E1F22]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              Año fiscal
            </label>
            <Select
              options={YEAR_OPTIONS}
              value={year}
              onChange={(v) => {
                setYear(v);
                setPreview(null);
              }}
              placeholder="Seleccionar año"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              Producto (opcional — vacío = todos)
            </label>
            <Select
              options={productOptions}
              value={productId}
              onChange={(v) => {
                setProductId(v);
                setPreview(null);
              }}
              placeholder="Todos los productos"
              searchable
              clearable
              onSearch={setSearch}
              searchValue={search}
              loading={loadingProducts}
              loadingMore={loadingMore}
              hasMore={hasMore}
              loadMore={loadMore}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-5">
          <Button
            variant="zinc"
            onClick={handlePreview}
            loading={loadingPreview}
            disabled={loadingPreview || downloading}
          >
            Generar vista previa
          </Button>
          <Button
            variant="blue"
            onClick={handleDownload}
            loading={downloading}
            disabled={downloading || loadingPreview}
          >
            Descargar Excel
          </Button>
        </div>
      </div>

      {/* Vista previa */}
      {preview && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-[#1E1F22]">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium text-zinc-900 dark:text-white">
              Resumen {preview.meta.year}
            </h2>
            <span className="text-xs text-zinc-500">
              {preview.meta.totalProducts} productos ·{" "}
              {preview.meta.totalLines} líneas (
              {preview.meta.sourceMovements?.toLocaleString("es-CO")} movs.
              agregados por documento/día)
              {preview.meta.skippedNoProduct > 0
                ? ` · ${preview.meta.skippedNoProduct} sin producto omitidos`
                : ""}
            </span>
          </div>

          {preview.meta.discrepancies > 0 && (
            <div className="mx-4 mt-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              ⚠️ {preview.meta.discrepancies} producto(s) con diferencia entre el
              saldo del Kardex (libro de movimientos) y el stock físico actual.
              Revisa la columna <strong>Diferencia</strong> antes de entregar:
              indica posibles inconsistencias de datos del sistema que conviene
              explicar o corregir.
            </div>
          )}

          {preview.products.length === 0 ? (
            <div className="p-6 text-sm text-zinc-500">
              No se encontraron movimientos para los filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  <tr>
                    <th className="text-left font-medium px-3 py-2">Código</th>
                    <th className="text-left font-medium px-3 py-2">Producto</th>
                    <th className="text-center font-medium px-3 py-2">Und</th>
                    <th className="text-right font-medium px-3 py-2">
                      Saldo inicial
                    </th>
                    <th className="text-right font-medium px-3 py-2">Entradas</th>
                    <th className="text-right font-medium px-3 py-2">Salidas</th>
                    <th className="text-right font-medium px-3 py-2">
                      Saldo final
                    </th>
                    <th className="text-right font-medium px-3 py-2">
                      Stock actual
                    </th>
                    <th className="text-right font-medium px-3 py-2">
                      Diferencia
                    </th>
                    <th className="text-right font-medium px-3 py-2"># Líneas</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.products.map((p, idx) => (
                    <tr
                      key={p.productId}
                      className={
                        idx % 2 === 0
                          ? "bg-white dark:bg-[#1E1F22]"
                          : "bg-zinc-50 dark:bg-zinc-900/40"
                      }
                    >
                      <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300">
                        {p.code}
                      </td>
                      <td className="px-3 py-1.5 text-zinc-900 dark:text-white">
                        {p.name}
                      </td>
                      <td className="px-3 py-1.5 text-center text-zinc-500">
                        {p.unit}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {nf.format(p.opening)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-green-700 dark:text-green-400">
                        {nf.format(p.totalIn)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-red-700 dark:text-red-400">
                        {nf.format(p.totalOut)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-semibold">
                        {nf.format(p.closing)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {nf.format(p.currentStock)}
                      </td>
                      <td
                        className={`px-3 py-1.5 text-right tabular-nums ${
                          Math.abs(p.difference) >= 0.01
                            ? "font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
                            : "text-zinc-400"
                        }`}
                      >
                        {nf.format(p.difference)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-zinc-500">
                        {p.movementCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function KardexPage(params) {
  return (
    <RoleGuard forbiddenRoles={["seller"]} fallbackRoute="/">
      <KardexPageInner {...params} />
    </RoleGuard>
  );
}
