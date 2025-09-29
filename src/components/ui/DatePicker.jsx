"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
  addDays,
  endOfDay,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "@heroicons/react/24/solid";

/**
 * RangeDatePicker (moderno)
 * - Calendar popover con selección de rango
 * - Inputs con formato DD/MM/YYYY
 * - Presets rápidos (Últimos 7 días, Este mes, etc.)
 * - Cierre al hacer click fuera / Escape
 * - 100% controlado hacia afuera vía props o con estado interno si no pasas value/onChange
 */
export default function DatePicker({
  value, // { from: Date|null, to: Date|null }
  onChange, // (range) => void
  minDate,
  maxDate,
  presets = true,
  placeholder = "Rango de fechas",
  locale = es,
}) {
  // estado interno si no es controlado
  const [range, setRange] = useState({ from: null, to: null });
  const controlled = typeof onChange === "function";
  const current = controlled ? value ?? { from: null, to: null } : range;

  const [open, setOpen] = useState(false);
  const popRef = useRef(null);
  const btnRef = useRef(null);

  // cerrar al hacer click fuera / ESC
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!popRef.current) return;
      if (
        popRef.current.contains(e.target) ||
        btnRef.current?.contains(e.target)
      )
        return;
      setOpen(false);
    };
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keyup", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keyup", onEsc);
    };
  }, [open]);

  // límites opcionales
  const disabled = useMemo(() => {
    const arr = [];
    if (minDate) arr.push({ before: startOfDay(minDate) });
    if (maxDate) arr.push({ after: endOfDay(maxDate) });
    return arr;
  }, [minDate, maxDate]);

  const fmt = (d) => (d ? format(d, "dd/MM/yyyy", { locale }) : "");
  const parseInput = (str) => {
    const d = parse(str, "dd/MM/yyyy", new Date());
    return isValid(d) ? d : null;
  };

  const setRangeSafe = (next) => {
    if (!controlled) setRange(next);
    onChange?.(next);
  };

  const onSelect = (r) => {
    // DayPicker puede entregar parcial {from} o completo {from,to}
    setRangeSafe(r ?? { from: null, to: null });
  };

  const onInputChange = (which, str) => {
    const d = parseInput(str);
    let next = { ...current };
    next[which] = d;
    // normalizar: from <= to
    if (next.from && next.to && isAfter(next.from, next.to)) {
      // si editas inicio > fin, corremos el otro extremo
      if (which === "from") next.to = next.from;
      else next.from = next.to;
    }
    setRangeSafe(next);
  };

  // presets
  const presetList = useMemo(
    () => [
      {
        key: "7",
        label: "Últimos 7 días",
        get: () => ({
          from: startOfDay(subDays(new Date(), 6)),
          to: endOfDay(new Date()),
        }),
      },
      {
        key: "30",
        label: "Últimos 30 días",
        get: () => ({
          from: startOfDay(subDays(new Date(), 29)),
          to: endOfDay(new Date()),
        }),
      },
      {
        key: "tm",
        label: "Este mes",
        get: () => ({
          from: startOfMonth(new Date()),
          to: endOfDay(new Date()),
        }),
      },
      {
        key: "lm",
        label: "Mes completo",
        get: () => ({
          from: startOfMonth(new Date()),
          to: endOfMonth(new Date()),
        }),
      },
      {
        key: "hoy",
        label: "Hoy",
        get: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }),
      },
    ],
    []
  );

  const label =
    current.from && current.to
      ? `${fmt(current.from)} – ${fmt(current.to)}`
      : placeholder;

  return (
    <div className="relative inline-block w-full">
      {/* Trigger */}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="max-w-60 w-full text-center bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm rounded-lg ps-10 p-2.5 text-white border border-transparent focus:outline-none focus:ring-0"
      >
        {/* icono calendario */}
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center ps-3 text-zinc-400">
          <CalendarIcon className="w-5 h-5" />
        </span>
        <span
          className={
            "block truncate " +
            (current.from && current.to ? "text-white" : "text-zinc-400")
          }
        >
          {label}
        </span>
      </button>
      {/* Popover */}
      {open && (
        <div
          ref={popRef}
          className="absolute z-50 mt-2 w-[min(90vw,680px)] bg-zinc-900 rounded-lg shadow-md overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto]">
            {/* Calendario */}
            <div className="p-3">
              <DayPicker
                mode="range"
                selected={current}
                onSelect={onSelect}
                numberOfMonths={2}
                fixedWeeks
                locale={locale}
                disabled={disabled}
                weekStartsOn={1}
                className="rdp p-4"
                classNames={{
                  caption: "rdp-caption  text-sm font-medium",
                  head_cell: "rdp-head_cell text-xs text-zinc-500",
                  day: "rdp-day h-9 w-9 text-sm",
                  range_middle: "bg-zinc-700",
                  range_end: "bg-zinc-700 rounded-r-full",
                  range_start: "bg-zinc-700 rounded-l-full",
                  selected: "",
                  chevron: "bg-white rounded-full",
                }}
              />
            </div>

            {/* Sidebar derecha: inputs + presets */}
            <div className="p-4 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-700 space-y-3 w-full max-w-[240px]">
              <div className="space-y-2">
                <label className="block text-xs text-zinc-500">Desde</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  value={fmt(current.from)}
                  onChange={(e) => onInputChange("from", e.target.value)}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-sm px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-zinc-500">Hasta</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  value={fmt(current.to)}
                  onChange={(e) => onInputChange("to", e.target.value)}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-sm px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              {presets && (
                <div className="pt-1 space-y-1">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Rápidos
                  </p>
                  <div className="flex flex-col gap-1">
                    {presetList.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        className="text-left text-sm px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        onClick={() => setRangeSafe(p.get())}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="text-sm px-3 py-1.5 min-w-20 rounded border border-zinc-300 dark:border-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  onClick={() => setRangeSafe({ from: null, to: null })}
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  className="text-sm px-3 py-1.5 min-w-20 rounded bg-zinc-600 text-white hover:bg-zinc-500 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
