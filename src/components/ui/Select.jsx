// src/components/ui/Select.js
"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDownIcon,
  XMarkIcon,
  CheckIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import Input from "./Input";
import Searchbar from "./Searchbar";
import IconButton from "./IconButton";
import { TrashIcon } from "@heroicons/react/24/solid";
import classNames from "classnames";

export default function Select({
  options = [],
  value,
  onChange,
  multiple = false,
  searchable = false,
  placeholder = "Seleccionar...",
  disabled = false,
  clearable = false,
  className = "",
  size = "md",
  renderOption,
  renderValue,
  emptyMessage = "No hay opciones disponibles",
  maxHeight = 200,
  hasMenu = true,
  menuTitle = "Agregar",
  onClickMenu = () => {},
  menuVariant = "emerald",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const selectRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(multiple ? [] : null);
  const currentValue = isControlled ? value : internalValue;

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm.trim()) return options;
    const q = searchTerm.toLowerCase();
    return options.filter(
      (o) =>
        String(o.label).toLowerCase().includes(q) ||
        String(o.value).toLowerCase().includes(q)
    );
  }, [options, searchTerm, searchable]);

  const normalizedValue = useMemo(() => {
    if (multiple) return Array.isArray(currentValue) ? currentValue : [];
    return currentValue != null ? [currentValue] : [];
  }, [currentValue, multiple]);

  const selectedOptions = useMemo(
    () => options.filter((o) => normalizedValue.includes(o.value)),
    [options, normalizedValue]
  );

  // 👇 Mejorado: cálculo de posición más preciso
  const updateDropdownPosition = () => {
    if (!selectRef.current) return;
    const rect = selectRef.current.getBoundingClientRect();

    setDropdownPosition({
      top: rect.bottom + 4, // 👈 Usar coordenadas viewport directamente
      left: rect.left,
      width: rect.width,
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const t = event.target;
      const insideTrigger = selectRef.current?.contains(t);
      const insideDropdown = dropdownRef.current?.contains(t);
      if (insideTrigger || insideDropdown) return;
      setIsOpen(false);
      setSearchTerm("");
    };

    // 👇 Actualizar posición en scroll y resize
    const handleScrollOrResize = () => {
      if (isOpen) updateDropdownPosition();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchable && searchRef.current) searchRef.current.focus();
  }, [isOpen, searchable]);

  useEffect(() => {
    if (isOpen) updateDropdownPosition();
  }, [isOpen]);

  const commitValue = (next) => {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
  };

  const handleOptionSelect = (option) => {
    if (option.disabled) return;

    if (multiple) {
      const list = Array.isArray(currentValue) ? currentValue : [];
      const exists = list.includes(option.value);
      const next = exists
        ? list.filter((v) => v !== option.value)
        : [...list, option.value];
      commitValue(next);
    } else {
      commitValue(option.value);
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    commitValue(multiple ? [] : null);
  };

  const handleRemoveOption = (optionValue, e) => {
    e.stopPropagation();
    if (!multiple) return;
    const list = Array.isArray(currentValue) ? currentValue : [];
    commitValue(list.filter((v) => v !== optionValue));
  };

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen((v) => {
      const next = !v;
      if (next === true) setSearchTerm("");
      return next;
    });
  };

  const sizeStyles = {
    sm: "px-2 py-1 text-sm",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-3 text-base",
  };

  const renderSelectedValue = () => {
    if (selectedOptions.length === 0)
      return <span className="text-gray-400">{placeholder}</span>;
    if (renderValue) return renderValue(selectedOptions, multiple);

    if (multiple) {
      if (selectedOptions.length === 1) return selectedOptions[0].label;
      return `${selectedOptions.length} elementos seleccionados`;
    }
    return selectedOptions[0].label;
  };

  const renderSingleOption = (option) => {
    const isSelected = normalizedValue.includes(option.value);
    if (renderOption) return renderOption(option, isSelected, multiple);
    return (
      <div className="flex items-center justify-between w-full">
        <span className={option.disabled ? "text-gray-400" : ""}>
          {option.label}
        </span>
        {multiple && isSelected && (
          <CheckIcon className="w-4 h-4 text-blue-600" />
        )}
      </div>
    );
  };

  return (
    <div ref={selectRef} className={classNames("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        className={classNames(
          "w-full flex items-center justify-between rounded-md bg-zinc-800 text-white",
          sizeStyles[size],
          { "bg-zinc-600 cursor-not-allowed": disabled }
        )}
      >
        <div className="flex items-center flex-1 min-w-0 py-0.5">
          {multiple && selectedOptions.length > 0 ? (
            <div className="flex flex-wrap gap-1 mr-2">
              {selectedOptions.slice(0, 3).map((option, i) => (
                <span
                  key={`SPAN-${option.value}-${i}`}
                  className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md"
                >
                  {option.label}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveOption(option.value, e)}
                      className="ml-1 hover:text-blue-600"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
              {selectedOptions.length > 3 && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md">
                  +{selectedOptions.length - 3} más
                </span>
              )}
            </div>
          ) : (
            <div className="md:truncate text-left">{renderSelectedValue()}</div>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {clearable && selectedOptions.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded hover:bg-zinc-700"
            >
              <XMarkIcon className="w-4 h-4 text-gray-400 hover:text-gray-200" />
            </button>
          )}
          <ChevronDownIcon
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Portal - 👇 Cambio clave aquí */}
      {isOpen &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed bg-zinc-900 rounded-md shadow-2xl z-[9999]"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
          >
            {searchable && (
              <div className="flex flex-row gap-2 p-2 w-full justify-between">
                <div className="flex-1">
                  <Searchbar
                    className=""
                    ref={searchRef}
                    search={searchTerm}
                    setSearch={setSearchTerm}
                  />
                </div>
                {hasMenu && (
                  <div className="flex align-middle justify-center">
                    <IconButton
                      variant={menuVariant}
                      className=""
                      onClick={() => onClickMenu()}
                    >
                      <PlusCircleIcon className="w-6 h-6" />
                    </IconButton>
                  </div>
                )}
              </div>
            )}

            <div className="max-h-60 overflow-y-auto" style={{ maxHeight }}>
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-400 text-center">
                  {searchTerm ? "No se encontraron resultados" : emptyMessage}
                </div>
              ) : (
                <>
                  {filteredOptions.map((option, index) => {
                    const isSelected = normalizedValue.includes(option.value);
                    return (
                      <button
                        key={`SELECT-${option.value}-${index}`}
                        type="button"
                        onClick={() => handleOptionSelect(option)}
                        disabled={option.disabled}
                        className={[
                          "w-full p-4 text-left text-sm flex items-center",
                          "hover:bg-zinc-800",
                          isSelected ? "bg-zinc-700" : "",
                          option.disabled
                            ? "text-gray-600 cursor-not-allowed"
                            : "cursor-pointer",
                        ].join(" ")}
                      >
                        {renderSingleOption(option, index)}
                      </button>
                    );
                  })}
                  <div className="bg-zinc-900 h-10 rounded-b-md"></div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
