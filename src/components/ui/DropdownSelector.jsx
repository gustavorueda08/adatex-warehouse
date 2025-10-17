"use client";

import classNames from "classnames";
import { Checkbox } from "flowbite-react";
import { useState, useEffect, useRef } from "react";

export default function DropdownSelector({
  options = [],
  setSelectedOptions: setExternalSelectedOptions = null,
  title = "Estado",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState(
    new Set(options.map((o) => o.key))
  );
  const [dropdownPosition, setDropdownPosition] = useState({});
  const ref = useRef(null);
  const dropdownRef = useRef(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Calcular posición y tamaño del dropdown
  useEffect(() => {
    if (open && ref.current && dropdownRef.current) {
      const buttonRect = ref.current.getBoundingClientRect();
      const dropdownHeight = dropdownRef.current.scrollHeight;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Calcular espacio disponible arriba y abajo
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;

      // Determinar si abrir hacia arriba o hacia abajo
      const openUpwards =
        spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      // Calcular altura máxima del dropdown
      const maxHeight = openUpwards
        ? Math.min(spaceAbove - 20, 400) // 400px máximo en desktop
        : Math.min(spaceBelow - 20, 400);

      // Calcular ancho del dropdown
      let width;
      let left = 0;
      let right = "auto";

      if (viewportWidth >= 768) {
        // Desktop: mínimo 280px, máximo 400px
        width = Math.max(280, Math.min(400, buttonRect.width * 1.5));

        // Calcular posición horizontal para que no se salga de la pantalla
        const dropdownWidth = width;
        const spaceOnRight = viewportWidth - buttonRect.left;
        const spaceOnLeft = buttonRect.right;

        // Si no cabe a la derecha, alinear a la derecha
        if (spaceOnRight < dropdownWidth && spaceOnLeft > dropdownWidth) {
          right = 0;
          left = "auto";
        }
        // Si no cabe ni a la derecha ni a la izquierda (botón en el centro),
        // calcular posición óptima
        else if (spaceOnRight < dropdownWidth && spaceOnLeft < dropdownWidth) {
          // Centrar el dropdown en el viewport manteniendo márgenes
          const idealLeft = (viewportWidth - dropdownWidth) / 2;
          const offsetFromButton = idealLeft - buttonRect.left;
          left = offsetFromButton;
        }
        // Si cabe a la derecha, dejar left: 0 (por defecto)
        else {
          left = 0;
        }

        // Asegurar que no se salga por los bordes con margen de 16px
        if (typeof left === "number") {
          const dropdownLeft = buttonRect.left + left;
          const dropdownRight = dropdownLeft + dropdownWidth;

          if (dropdownLeft < 16) {
            left = 16 - buttonRect.left;
          } else if (dropdownRight > viewportWidth - 16) {
            left = viewportWidth - 16 - dropdownWidth - buttonRect.left;
          }
        }
      } else {
        // Móvil: calcular para que ocupe casi todo el ancho centrado
        width = Math.min(viewportWidth - 32, 400);

        // Centrar el dropdown en móvil
        const dropdownWidth = width;
        const idealLeft = (viewportWidth - dropdownWidth) / 2;
        left = idealLeft - buttonRect.left;
      }

      setDropdownPosition({
        maxHeight: `${maxHeight}px`,
        width: `${width}px`,
        left: typeof left === "number" ? `${left}px` : left,
        right: right,
        top: openUpwards ? "auto" : "calc(100% + 8px)",
        bottom: openUpwards ? "calc(100% + 8px)" : "auto",
      });
    }
  }, [open, options.length]);

  const handleSelectAll = () => {
    const allSelected = selectedOptions.size === options.length;
    const next = allSelected ? new Set() : new Set(options.map((o) => o.key));

    setSelectedOptions(next);
    setExternalSelectedOptions?.(next);
  };

  const handleToggleOption = (optionKey) => {
    const newSelected = new Set(selectedOptions);
    if (newSelected.has(optionKey)) {
      newSelected.delete(optionKey);
    } else {
      newSelected.add(optionKey);
    }
    setSelectedOptions(newSelected);
    setExternalSelectedOptions?.(newSelected);
  };

  return (
    <div ref={ref} className={classNames(["relative", className])}>
      {/* Botón principal */}
      <button
        className="text-white bg-zinc-900 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center justify-between w-full transition-colors"
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="truncate">
          {title}
          {selectedOptions.size > 0 &&
            selectedOptions.size < options.length && (
              <span className="ml-2 text-xs bg-zinc-600 px-2 py-0.5 rounded-full">
                {selectedOptions.size}
              </span>
            )}
        </span>
        <svg
          className={`w-2.5 h-2.5 ml-3 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 10 6"
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="m1 1 4 4 4-4"
          />
        </svg>
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          ref={dropdownRef}
          className="z-50 bg-zinc-800 rounded-lg shadow-2xl absolute border border-zinc-700"
          style={{
            ...dropdownPosition,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <ul className="py-1">
            {/* Opción "Seleccionar Todos" */}
            <li
              className="flex flex-row justify-between items-center hover:bg-zinc-700 py-2.5 px-4 cursor-pointer transition-colors border-b border-zinc-700"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectAll();
              }}
            >
              <span className="font-medium text-white">Seleccionar Todos</span>
              <Checkbox
                checked={selectedOptions.size === options.length}
                onChange={handleSelectAll}
                className="pointer-events-none"
              />
            </li>

            {/* Opciones individuales */}
            {options.length === 0 ? (
              <li className="py-4 px-4 text-center text-gray-400 text-sm">
                No hay opciones disponibles
              </li>
            ) : (
              options.map((option) => {
                const isSelected = selectedOptions.has(option.key);
                return (
                  <li
                    key={option.key}
                    className="flex flex-row justify-between items-center hover:bg-zinc-700 py-2.5 px-4 cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleOption(option.key);
                    }}
                  >
                    <span className="text-white text-sm truncate pr-2">
                      {option.label}
                    </span>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleToggleOption(option.key)}
                      className="pointer-events-none flex-shrink-0"
                    />
                  </li>
                );
              })
            )}
          </ul>

          {/* Indicador de scroll */}
          {options.length > 8 && (
            <div className="sticky bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-zinc-800 to-transparent pointer-events-none" />
          )}
        </div>
      )}
    </div>
  );
}
