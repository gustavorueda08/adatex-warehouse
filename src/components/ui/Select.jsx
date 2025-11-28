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
import Button from "./Button";

export default function Select({
  options = [],
  value,
  onChange,
  multiple = false,
  searchable = false,
  onSearch,
  searchValue,
  placeholder = "Seleccionar...",
  disabled = false,
  clearable = false,
  className = "",
  size = "md",
  renderOption,
  renderValue,
  emptyMessage = "No hay opciones disponibles",
  maxHeight = 300,
  hasMenu = true,
  menuTitle = "Agregar",
  onClickMenu = () => {},
  menuVariant = "emerald",
  hasMore = false,
  onLoadMore,
  loading = false,
  loadingMore = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalSearch, setInternalSearch] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    minWidth: 0,
    openUpwards: false,
    maxHeight: maxHeight,
  });

  const selectRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(multiple ? [] : null);
  const currentValue = isControlled ? value : internalValue;

  const effectiveSearch =
    searchValue !== undefined ? searchValue : internalSearch;

  const filteredOptions = useMemo(() => {
    // Si hay onSearch, asumimos que ya vienen filtradas desde el servidor
    if (onSearch) return options;

    if (!searchable || !effectiveSearch?.trim()) return options;
    const q = effectiveSearch.toLowerCase();
    return options.filter(
      (o) =>
        String(o.label).toLowerCase().includes(q) ||
        String(o.value).toLowerCase().includes(q)
    );
  }, [options, searchable, effectiveSearch, onSearch]);

  const normalizedValue = useMemo(() => {
    if (multiple) return Array.isArray(currentValue) ? currentValue : [];
    return currentValue != null ? [currentValue] : [];
  }, [currentValue, multiple]);

  const selectedOptions = useMemo(
    () => options.filter((o) => normalizedValue.includes(o.value)),
    [options, normalizedValue]
  );

  // CORREGIDO: Mejor cálculo de posición
  const updateDropdownPosition = () => {
    if (!selectRef.current) return;
    const rect = selectRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const isMobileViewport = viewportWidth < 640;

    // Constantes
    const PADDING = 8;
    const SEARCH_BAR_HEIGHT = searchable ? 56 : 0; // altura aproximada del searchbar
    const MIN_DROPDOWN_HEIGHT = 150;

    // Calcular espacio disponible
    const spaceBelow = viewportHeight - rect.bottom - PADDING;
    const spaceAbove = rect.top - PADDING;

    // Calcular altura estimada del dropdown
    const estimatedContentHeight = Math.min(
      filteredOptions.length * 40 + SEARCH_BAR_HEIGHT + 20,
      maxHeight + SEARCH_BAR_HEIGHT
    );

    // Decidir dirección: solo abrir hacia arriba si realmente no cabe abajo
    // Y hay significativamente más espacio arriba
    const shouldOpenUpwards =
      spaceBelow < MIN_DROPDOWN_HEIGHT &&
      spaceAbove > spaceBelow &&
      spaceAbove > MIN_DROPDOWN_HEIGHT;

    // Calcular altura máxima disponible
    let availableHeight;
    let topPosition;

    if (shouldOpenUpwards) {
      // Abrir hacia arriba: el dropdown crece hacia arriba desde el select
      availableHeight = Math.min(spaceAbove, maxHeight + SEARCH_BAR_HEIGHT);
      // Posicionar justo arriba del select, y el dropdown crecerá hacia arriba
      topPosition = Math.max(PADDING, rect.top - availableHeight);
    } else {
      // Abrir hacia abajo (comportamiento normal)
      availableHeight = Math.min(spaceBelow, maxHeight + SEARCH_BAR_HEIGHT);
      topPosition = rect.bottom + 4;
    }

    // Calcular ancho (preferir pantalla completa en móvil)
    const longestLabel = options.reduce(
      (max, opt) => Math.max(max, String(opt.label).length),
      0
    );
    const estimatedMinWidth = Math.min(
      Math.max(rect.width, longestLabel * 8 + 60),
      viewportWidth - PADDING * 2
    );
    const dropdownWidth = isMobileViewport
      ? viewportWidth - PADDING * 2
      : Math.max(rect.width, estimatedMinWidth);

    setDropdownPosition({
      top: topPosition,
      left: isMobileViewport
        ? PADDING
        : Math.max(
            PADDING,
            Math.min(rect.left, viewportWidth - dropdownWidth - PADDING)
          ),
      width: dropdownWidth,
      minWidth: dropdownWidth,
      openUpwards: shouldOpenUpwards,
      maxHeight: availableHeight - SEARCH_BAR_HEIGHT - 20, // Restar altura del searchbar
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const t = event.target;
      const insideTrigger = selectRef.current?.contains(t);
      const insideDropdown = dropdownRef.current?.contains(t);
      if (insideTrigger || insideDropdown) return;
      setIsOpen(false);
      if (searchValue === undefined) {
        setInternalSearch("");
      }
    };

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
    if (isOpen && searchable && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen, searchable]);

  useEffect(() => {
    if (isOpen) updateDropdownPosition();
  }, [isOpen, filteredOptions.length]); // Actualizar cuando cambien opciones filtradas

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
      if (searchValue === undefined) {
        setInternalSearch("");
      }
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
      if (next === true && searchValue === undefined) {
        setInternalSearch("");
      }
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
      <div className="flex items-center justify-between w-full gap-2">
        <span
          className={classNames(
            "flex-1 truncate",
            option.disabled ? "text-gray-400" : ""
          )}
          title={option.label}
        >
          {option.label}
        </span>
        {multiple && isSelected && (
          <CheckIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
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
          "w-full flex items-center justify-between rounded-md bg-zinc-900 text-white",
          "min-h-[44px] md:min-h-[36px] gap-2",
          sizeStyles[size],
          { "bg-zinc-900 cursor-not-allowed": disabled }
        )}
        aria-expanded={isOpen}
      >
        <div className="flex items-center flex-1 min-w-0 py-0.5">
          {multiple && selectedOptions.length > 0 ? (
            <div className="flex flex-wrap gap-1 mr-2">
              {selectedOptions.slice(0, 3).map((option, i) => (
                <span
                  key={`SPAN-${option.value}-${i}`}
                  className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md"
                >
                  <span className="max-w-[150px] truncate">{option.label}</span>
                  {!disabled && (
                    <IconButton
                      as="span"
                      onClick={(e) => handleRemoveOption(option.value, e)}
                      variant="zinc"
                      className="px-2"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleRemoveOption(option.value, e);
                        }
                      }}
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </IconButton>
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
            <div
              className="truncate text-left w-full"
              title={String(renderSelectedValue())}
            >
              {renderSelectedValue()}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0">
          {clearable && selectedOptions.length > 0 && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClear(e);
                }
              }}
              className="p-1 rounded hover:bg-zinc-700 cursor-pointer"
            >
              <XMarkIcon className="w-4 h-4 text-gray-400 hover:text-gray-200" />
            </span>
          )}
          <ChevronDownIcon
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Portal */}
      {isOpen &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            className={classNames(
              "fixed bg-zinc-900 rounded-md shadow-2xl z-[9999] border border-zinc-700",
              dropdownPosition.openUpwards ? "origin-bottom" : "origin-top"
            )}
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              minWidth: `${dropdownPosition.minWidth}px`,
              width: `${dropdownPosition.width}px`,
              maxWidth: "100vw",
            }}
          >
            {searchable && (
              <div className="flex flex-row gap-2 p-2 w-full justify-between border-b border-zinc-700">
                <div className="flex-1 min-w-0">
                  <Searchbar
                    ref={searchRef}
                    search={effectiveSearch}
                    setSearch={(value) => {
                      if (searchValue === undefined) {
                        setInternalSearch(value);
                      }
                      onSearch?.(value);
                    }}
                  />
                </div>
                {hasMenu && (
                  <div className="flex align-middle justify-center flex-shrink-0">
                    <IconButton
                      variant={menuVariant}
                      onClick={() => onClickMenu()}
                    >
                      <PlusCircleIcon className="w-6 h-6" />
                    </IconButton>
                  </div>
                )}
              </div>
            )}

            <div
              className="overflow-y-auto overflow-x-hidden"
              style={{ maxHeight: `${dropdownPosition.maxHeight}px` }}
            >
              {loading && filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">
                  Cargando opciones...
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">
                  {effectiveSearch ? "No se encontraron resultados" : emptyMessage}
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
                        className={classNames(
                          "w-full px-3 py-2.5 text-left text-sm flex items-center transition-colors",
                          "hover:bg-zinc-800",
                          isSelected && "bg-zinc-700",
                          option.disabled
                            ? "text-gray-600 cursor-not-allowed"
                            : "cursor-pointer"
                        )}
                      >
                        {renderSingleOption(option, index)}
                      </button>
                    );
                  })}
                  <div className="h-2"></div>
                </>
              )}

              {hasMore && (
                <div className="px-3 pb-3">
                  <Button
                    variant="zinc"
                    className="w-full"
                    onClick={onLoadMore}
                    loading={loadingMore}
                    disabled={loadingMore}
                  >
                    Cargar más
                  </Button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
