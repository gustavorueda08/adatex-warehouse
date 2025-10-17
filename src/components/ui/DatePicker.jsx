"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
  endOfDay,
  endOfMonth,
  format,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "@heroicons/react/24/solid";
import { createPortal } from "react-dom";
import classNames from "classnames";

export default function DatePicker({
  value, // Date | null (single) o { from: Date|null, to: Date|null } (range)
  onChange, // (value) => void
  mode = "single", // "single" | "range"
  minDate,
  maxDate,
  presets = true,
  placeholder = "Seleccionar fecha",
  locale = es,
  className = "",
  isDisabled = false,
}) {
  const [internalValue, setInternalValue] = useState(
    mode === "range" ? { from: null, to: null } : null
  );
  const controlled = typeof onChange === "function";
  const current = controlled
    ? value ?? (mode === "range" ? { from: null, to: null } : null)
    : internalValue;

  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isPositioned, setIsPositioned] = useState(false);
  const popRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (open && btnRef.current && !isMobile) {
      const rect = btnRef.current.getBoundingClientRect();

      // Calcular el ancho del popup basado en el modo
      const popupWidth =
        mode === "range"
          ? Math.min(window.innerWidth * 0.9, 680)
          : Math.min(window.innerWidth * 0.9, 500);
      const popupHeight = 450; // Altura aproximada del calendario

      // Posición inicial (relativa al viewport porque usamos position: fixed)
      let top = rect.bottom + 8;
      let left = rect.left;

      // Ajustar si se sale por la derecha
      if (left + popupWidth > window.innerWidth) {
        left = window.innerWidth - popupWidth - 16; // 16px de margen
      }

      // Ajustar si se sale por la izquierda
      if (left < 16) {
        left = 16;
      }

      // Ajustar si se sale por abajo
      if (top + popupHeight > window.innerHeight) {
        // Mostrar arriba del botón si hay espacio
        const spaceAbove = rect.top;
        if (spaceAbove > popupHeight) {
          top = rect.top - popupHeight - 8;
        } else {
          // Si no hay espacio arriba, alinear al borde inferior de la ventana
          top = window.innerHeight - popupHeight - 16;
        }
      }

      setPosition({
        top,
        left,
        width: rect.width,
      });
      // Marcar como posicionado después de calcular
      requestAnimationFrame(() => setIsPositioned(true));
    } else if (!open) {
      // Reset cuando se cierra
      setIsPositioned(false);
    }
  }, [open, isMobile, mode]);

  useEffect(() => {
    if (!open || isMobile) return;

    const handleScroll = () => {
      if (btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect();

        // Calcular el ancho del popup basado en el modo
        const popupWidth =
          mode === "range"
            ? Math.min(window.innerWidth * 0.9, 680)
            : Math.min(window.innerWidth * 0.9, 500);
        const popupHeight = 450; // Altura aproximada del calendario

        // Posición inicial (relativa al viewport porque usamos position: fixed)
        let top = rect.bottom + 8;
        let left = rect.left;

        // Ajustar si se sale por la derecha
        if (left + popupWidth > window.innerWidth) {
          left = window.innerWidth - popupWidth - 16; // 16px de margen
        }

        // Ajustar si se sale por la izquierda
        if (left < 16) {
          left = 16;
        }

        // Ajustar si se sale por abajo
        if (top + popupHeight > window.innerHeight) {
          // Mostrar arriba del botón si hay espacio
          const spaceAbove = rect.top;
          if (spaceAbove > popupHeight) {
            top = rect.top - popupHeight - 8;
          } else {
            // Si no hay espacio arriba, alinear al borde inferior de la ventana
            top = window.innerHeight - popupHeight - 16;
          }
        }

        setPosition({
          top,
          left,
          width: rect.width,
        });
      }
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open, isMobile, mode]);

  useEffect(() => {
    if (open && isMobile) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open, isMobile]);

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

  const setValueSafe = (next) => {
    if (!controlled) setInternalValue(next);
    onChange?.(next);
  };

  const onSelect = (selected) => {
    if (mode === "single") {
      setValueSafe(selected || null);
      setOpen(false);
    } else {
      setValueSafe(selected ?? { from: null, to: null });
    }
  };

  const onInputChange = (which, str) => {
    if (mode === "single") {
      const d = parseInput(str);
      setValueSafe(d);
    } else {
      const d = parseInput(str);
      let next = { ...current };
      next[which] = d;
      if (next.from && next.to && next.from > next.to) {
        if (which === "from") next.to = next.from;
        else next.from = next.to;
      }
      setValueSafe(next);
    }
  };

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

  const label = useMemo(() => {
    if (mode === "single") {
      return current ? fmt(current) : placeholder;
    }
    return current.from && current.to
      ? `${fmt(current.from)} – ${fmt(current.to)}`
      : placeholder;
  }, [mode, current, placeholder]);

  const CalendarContent = () => (
    <>
      <div className="p-3 md:p-4">
        <DayPicker
          mode={mode}
          selected={current}
          onSelect={onSelect}
          numberOfMonths={mode === "range" && !isMobile ? 2 : 1}
          fixedWeeks
          locale={locale}
          disabled={disabled}
          weekStartsOn={1}
          className="rdp"
          classNames={{
            caption: "rdp-caption text-sm font-medium text-white",
            head_cell: "rdp-head_cell text-xs text-zinc-500",
            day: "rdp-day h-9 w-9 text-sm text-white hover:bg-zinc-700 rounded-full",
            day_selected:
              mode === "single" ? "bg-zinc-600 text-white rounded-full" : "",
            day_today: "font-bold",
            range_middle: mode === "range" ? "bg-zinc-700" : "",
            range_end: mode === "range" ? "bg-zinc-600 rounded-r-full" : "",
            range_start: mode === "range" ? "bg-zinc-600 rounded-l-full" : "",
          }}
        />
      </div>

      <div className="p-4 border-t md:border-t-0 md:border-l border-zinc-700 space-y-3 w-full md:max-w-[240px]">
        {mode === "single" ? (
          <div className="space-y-2">
            <label className="block text-xs text-zinc-400">Fecha</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/aaaa"
              value={fmt(current)}
              onChange={(e) => onInputChange(null, e.target.value)}
              className="w-full rounded-md border border-zinc-600 bg-zinc-800 text-white text-sm px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="block text-xs text-zinc-400">Desde</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                value={fmt(current.from)}
                onChange={(e) => onInputChange("from", e.target.value)}
                className="w-full rounded-md border border-zinc-600 bg-zinc-800 text-white text-sm px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-zinc-400">Hasta</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                value={fmt(current.to)}
                onChange={(e) => onInputChange("to", e.target.value)}
                className="w-full rounded-md border border-zinc-600 bg-zinc-800 text-white text-sm px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>

            {presets && (
              <div className="pt-1 space-y-1">
                <p className="text-xs uppercase tracking-wide text-zinc-400">
                  Rápidos
                </p>
                <div className="flex flex-col gap-1">
                  {presetList.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      className="text-left text-sm px-2.5 py-1.5 rounded text-white hover:bg-zinc-700 transition-colors"
                      onClick={() => setValueSafe(p.get())}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="pt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            className="text-sm px-3 py-1.5 min-w-20 rounded border border-zinc-500 text-white hover:bg-zinc-700 transition-colors"
            onClick={() => {
              setValueSafe(mode === "range" ? { from: null, to: null } : null);
              if (mode === "single") setOpen(false);
            }}
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
    </>
  );

  return (
    <div className={`relative inline-block w-full ${className}`}>
      <button
        disabled={isDisabled}
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={classNames(
          "w-full text-center bg-zinc-900 hover:bg-zinc-700 transition-colors text-sm rounded-lg ps-10 p-2.5 text-white border border-transparent focus:outline-none focus:ring-2 focus:ring-zinc-500",
          { "bg-zinc-900 cursor-not-allowed": isDisabled }
        )}
      >
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center ps-3 text-zinc-400">
          <CalendarIcon className="w-5 h-5" />
        </span>
        <span
          className={
            "block truncate " +
            ((mode === "single" ? current : current.from && current.to)
              ? "text-white"
              : "text-zinc-400") +
            " self-start text-left"
          }
        >
          {label}
        </span>
      </button>

      {open && typeof window !== "undefined" && (
        <>
          {isMobile
            ? createPortal(
                <>
                  <div className="fixed inset-0 bg-black/50 z-[9998]" />
                  <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center">
                    <div
                      ref={popRef}
                      className="bg-zinc-900 rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
                    >
                      <div className="sticky top-0 bg-zinc-900 border-b border-zinc-700 px-4 py-3 flex items-center justify-between z-10">
                        <h3 className="text-lg font-semibold text-white">
                          {mode === "single"
                            ? "Seleccionar fecha"
                            : "Seleccionar rango"}
                        </h3>
                        <button
                          onClick={() => setOpen(false)}
                          className="text-zinc-400 hover:text-white transition-colors p-1"
                        >
                          <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-1">
                        <CalendarContent />
                      </div>
                    </div>
                  </div>
                </>,
                document.body
              )
            : createPortal(
                <div
                  ref={popRef}
                  className="fixed z-[9999] bg-zinc-900 rounded-lg shadow-2xl border border-zinc-700 overflow-hidden transition-opacity duration-150"
                  style={{
                    top: `${position.top}px`,
                    left: `${position.left}px`,
                    minWidth: `${position.width}px`,
                    width:
                      mode === "range"
                        ? "min(90vw, 680px)"
                        : "min(90vw, 500px)",
                    opacity: isPositioned ? 1 : 0,
                    pointerEvents: isPositioned ? "auto" : "none",
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto]">
                    <CalendarContent />
                  </div>
                </div>,
                document.body
              )}
        </>
      )}
    </div>
  );
}
