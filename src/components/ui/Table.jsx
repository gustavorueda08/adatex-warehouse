// src/components/ui/DataTable.js
"use client";
import React, { useState, useCallback } from "react";
import Link from "next/link";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  PencilSquareIcon,
  DocumentMagnifyingGlassIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import { Checkbox } from "flowbite-react";

/**
 * Componente de tabla reutilizable con selección, expansión y navegación
 * Responsive con vista de tarjetas en móvil y tabla en desktop
 */
export default function Table({
  data = [],
  columns = [],
  getRowId = (row) => row.id,
  onRowSelect,
  onRowEdit,
  onRowDelete = (row) => row.id,
  getDetailPath,
  renderExpandedContent,
  pagination,
  onPageChange,
  loading = false,
  emptyMessage = "No se encontraron elementos",
  mobileBlock = false,
  canSelectRow = () => true,
  canEditRow = () => true,
  canViewRow = () => true,
  canDeleteRow = () => true,
  canExpandRow = () => true,
  getRowClassName = () => "",
  getDisabledMessage = () => "",
}) {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [allSelected, setAllSelected] = useState(false);

  // Obtener rows que se pueden seleccionar
  const selectableRows = data.filter(canSelectRow);
  const selectableRowIds = selectableRows.map(getRowId);

  // Manejar selección de todos los rows
  const handleSelectAll = useCallback(
    (checked) => {
      if (checked) {
        const selectableIds = new Set(selectableRowIds);
        setSelectedRows(selectableIds);
        setAllSelected(true);
        if (onRowSelect) onRowSelect(selectableRowIds);
      } else {
        setSelectedRows(new Set());
        setAllSelected(false);
        if (onRowSelect) onRowSelect([]);
      }
    },
    [selectableRowIds, onRowSelect]
  );

  // Manejar selección individual de row
  const handleRowSelect = useCallback(
    (rowId, checked) => {
      const newSelected = new Set(selectedRows);
      if (checked) {
        newSelected.add(rowId);
      } else {
        newSelected.delete(rowId);
        setAllSelected(false);
      }
      setSelectedRows(newSelected);
      if (onRowSelect) onRowSelect(Array.from(newSelected));
    },
    [selectedRows, onRowSelect]
  );

  // Expandir/contraer row
  const toggleRowExpansion = useCallback(
    (rowId) => {
      const newExpanded = new Set(expandedRows);
      if (newExpanded.has(rowId)) {
        newExpanded.delete(rowId);
      } else {
        newExpanded.add(rowId);
      }
      setExpandedRows(newExpanded);
    },
    [expandedRows]
  );

  // Manejar clic en row (para navegación o expansión)
  const handleRowClick = useCallback(
    (e, row, rowId) => {
      if (
        e.target.type === "checkbox" ||
        e.target.tagName === "BUTTON" ||
        e.target.tagName === "A" ||
        e.target.closest("button") ||
        e.target.closest("a")
      ) {
        return;
      }

      if (renderExpandedContent && canExpandRow(row)) {
        toggleRowExpansion(rowId);
      }
    },
    [renderExpandedContent, canExpandRow, toggleRowExpansion]
  );

  // Renderizar celda individual
  const renderCell = useCallback((column, row, rowIndex) => {
    if (column.render) {
      return column.render(row[column.key], row, rowIndex);
    }
    return row[column.key] || "-";
  }, []);

  // Verificar si todos los rows seleccionables están seleccionados
  const areAllSelectableSelected =
    selectableRowIds.length > 0 &&
    selectableRowIds.every((id) => selectedRows.has(id));

  // COMPONENTE DE TARJETA MÓVIL
  const MobileCard = ({ row, rowIndex }) => {
    const rowId = getRowId(row);
    const isSelected = selectedRows.has(rowId);
    const isExpanded = expandedRows.has(rowId);
    const canSelect = canSelectRow(row);
    const canEdit = canEditRow(row);
    const canView = canViewRow(row);
    const canDelete = canDeleteRow(row);
    const canExpand = canExpandRow(row);
    const detailPath = getDetailPath && canView ? getDetailPath(row) : null;
    const disabledMessage = getDisabledMessage(row);

    return (
      <div className="bg-neutral-800 rounded-lg p-4 mb-4 shadow-lg ">
        {/* Header de la tarjeta con checkbox y acciones */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            {onRowSelect &&
              (canSelect ? (
                <Checkbox
                  checked={isSelected}
                  onChange={(e) => handleRowSelect(rowId, e.target.checked)}
                />
              ) : (
                <input
                  type="checkbox"
                  disabled
                  className="w-4 h-4 text-gray-400 bg-gray-100 border-gray-300 rounded cursor-not-allowed opacity-50"
                  title={disabledMessage || "No se puede seleccionar"}
                />
              ))}
          </div>

          <div className="flex items-center gap-3">
            {getDetailPath && canView && (
              <Link
                href={getDetailPath(row)}
                className="p-1.5 rounded hover:bg-neutral-700 transition-colors"
              >
                <DocumentMagnifyingGlassIcon className="w-5 h-5 text-emerald-700 hover:text-emerald-600" />
              </Link>
            )}

            {onRowDelete && canDelete && (
              <button
                onClick={() => onRowDelete(row.id)}
                className="p-1.5 rounded hover:bg-neutral-700 transition-colors"
              >
                <TrashIcon className="w-5 h-5 text-orange-800 hover:text-orange-700" />
              </button>
            )}

            {renderExpandedContent && canExpand && (
              <button
                onClick={() => toggleRowExpansion(rowId)}
                className="p-1.5 rounded hover:bg-neutral-700 transition-colors"
              >
                <ChevronDownIcon
                  className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                    isExpanded ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>
            )}
          </div>
        </div>

        {/* Contenido de la tarjeta */}
        <div className="space-y-2.5">
          {columns.map((column, index) => (
            <div
              key={column.key}
              className={`flex justify-between items-start gap-3 align-middle`}
            >
              <span className="text-gray-400 text-sm self-center font-medium min-w-[100px]">
                {column.label}:
              </span>
              <span className="text-white text-sm text-right flex-1">
                {detailPath && index === 0 ? (
                  <Link
                    href={detailPath}
                    className="hover:underline text-white font-bold"
                    onClick={(e) => {
                      if (!canView) {
                        e.preventDefault();
                      }
                    }}
                  >
                    {renderCell(column, row, rowIndex)}
                  </Link>
                ) : (
                  <div className={row.className}>
                    {renderCell(column, row, rowIndex)}
                  </div>
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Contenido expandido */}
        {renderExpandedContent && isExpanded && canExpand && (
          <div className="mt-4 pt-4 border-t border-neutral-700 animate-in fade-in slide-in-from-top-2 duration-300">
            {renderExpandedContent(row, rowIndex)}
          </div>
        )}
      </div>
    );
  };

  // LOADING STATE
  if (loading) {
    return (
      <div className="bg-black p-4">
        {/* Loading para móvil */}
        <div className="block md:hidden space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-neutral-800 rounded-lg p-4 animate-pulse"
            >
              <div className="h-4 bg-neutral-700 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-neutral-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>

        {/* Loading para desktop */}
        <div className="hidden md:block">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="text-xs uppercase">
              <tr className="bg-neutral-900">
                {onRowSelect && selectableRows.length > 0 && (
                  <th scope="col">
                    <div className="flex items-center my-4 p-4 rounded-l ml-4 bg-neutral-600 shadow-xl">
                      <input type="checkbox" className="w-4 h-4" disabled />
                      <label className="sr-only">Seleccionar todos</label>
                    </div>
                  </th>
                )}
                {renderExpandedContent && data.length > 0 && (
                  <th scope="col">
                    <div className="my-4 p-6 bg-neutral-600 h-full w-full shadow-xl"></div>
                  </th>
                )}
                {columns.map((column, index) => (
                  <th key={column.key} scope="col">
                    <div
                      className={`shadow-xl my-4 p-4 bg-neutral-600 whitespace-nowrap ${
                        index + 1 === columns.length && !onRowEdit
                          ? "mr-4 rounded-r"
                          : "mr-0"
                      } ${
                        index === 0 && !renderExpandedContent
                          ? "ml-4 rounded-l"
                          : ""
                      }`}
                    >
                      {column.label}
                    </div>
                  </th>
                ))}
                {(onRowEdit || getDetailPath) && (
                  <th scope="col">
                    <div className="shadow-xl my-4 p-4 bg-neutral-600 whitespace-nowrap mr-4 rounded-r">
                      Acciones
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={
                    columns.length +
                    (onRowSelect ? 1 : 0) +
                    (renderExpandedContent ? 1 : 0) +
                    (onRowEdit || getDetailPath ? 1 : 0)
                  }
                  className="px-6 py-8 text-center text-gray-500"
                >
                  Cargando datos...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black">
      {/* VISTA MÓVIL - TARJETAS */}
      <div className="block md:hidden">
        {/* Seleccionar todos en móvil */}
        {onRowSelect && selectableRows.length > 0 && (
          <div className="bg-neutral-800 rounded-lg p-4 mb-4 flex items-center justify-between shadow-lg ">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={areAllSelectableSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              <span className="text-white font-medium">Seleccionar todos</span>
            </div>
            {selectedRows.size > 0 && (
              <span className="ml-2 text-xs bg-zinc-600 px-2 py-0.5 rounded-full">
                {selectedRows.size}
              </span>
            )}
          </div>
        )}

        {/* Indicador de scroll */}
        {data.length > 0 && (
          <div className="bg-neutral-800 text-gray-400 text-xs p-2 text-center rounded mb-4 ">
            Mostrando {data.length}{" "}
            {data.length === 1 ? "elemento" : "elementos"}
          </div>
        )}

        {/* Tarjetas o mensaje vacío */}
        {data.length === 0 ? (
          <div className="text-center text-gray-500 py-8 bg-neutral-800 rounded-lg ">
            {emptyMessage}
          </div>
        ) : (
          data.map((row, rowIndex) => (
            <MobileCard key={getRowId(row)} row={row} rowIndex={rowIndex} />
          ))
        )}
      </div>

      {/* VISTA DESKTOP - TABLA */}
      <div className="hidden md:block relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left">
          {/* Header */}
          <thead className="text-xs uppercase">
            <tr className="bg-neutral-900">
              {onRowSelect && selectableRows.length > 0 && (
                <th scope="col">
                  <div className="flex items-center my-4 p-4 rounded-l ml-4 bg-neutral-600 shadow-xl">
                    <Checkbox
                      checked={areAllSelectableSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                    <label className="sr-only">Seleccionar todos</label>
                  </div>
                </th>
              )}

              {renderExpandedContent && data.length > 0 && (
                <th scope="col">
                  <div
                    className={`${
                      data.length === 0 ? "rounded-l ml-4" : ""
                    } my-4 p-6 bg-neutral-600 h-full w-full shadow-xl`}
                  ></div>
                </th>
              )}

              {columns.map((column, index) => (
                <th key={column.key} scope="col">
                  <div
                    className={`shadow-xl my-4 p-4 ${
                      index + 1 === columns.length && !onRowEdit
                        ? "mr-4 rounded-r"
                        : "mr-0"
                    } ${
                      (index === 0 && data.length === 0) ||
                      (index === 0 && !renderExpandedContent)
                        ? "ml-4 rounded-l"
                        : ""
                    } bg-neutral-600 whitespace-nowrap`}
                  >
                    {column.label}
                  </div>
                </th>
              ))}

              {(onRowEdit || getDetailPath) && (
                <th scope="col">
                  <div className="shadow-xl my-4 p-4 bg-neutral-600 whitespace-nowrap mr-4 rounded-r">
                    Acciones
                  </div>
                </th>
              )}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    columns.length +
                    (onRowSelect ? 1 : 0) +
                    (renderExpandedContent ? 1 : 0) +
                    (onRowEdit || getDetailPath ? 1 : 0)
                  }
                  className="px-6 py-8 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const rowId = getRowId(row);
                const isSelected = selectedRows.has(rowId);
                const isExpanded = expandedRows.has(rowId);
                const detailPath =
                  getDetailPath && canViewRow(row) ? getDetailPath(row) : null;

                const canSelect = canSelectRow(row);
                const canEdit = canEditRow(row);
                const canView = canViewRow(row);
                const canExpand = canExpandRow(row);

                const baseRowClasses = `
                  border-b border-gray-200 dark:border-gray-700 
                  hover:bg-gray-50 dark:hover:bg-gray-600
                  ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : "bg-white dark:bg-gray-800"
                  }
                  ${
                    (renderExpandedContent && canExpand) || detailPath
                      ? "cursor-pointer"
                      : ""
                  }
                `;
                const customRowClasses = getRowClassName(row, rowIndex);
                const rowClasses =
                  `${baseRowClasses} ${customRowClasses}`.trim();
                const disabledMessage = getDisabledMessage(row);

                return (
                  <React.Fragment key={rowId}>
                    <tr
                      onClick={(e) => handleRowClick(e, row, rowId)}
                      className="bg-neutral-900"
                      title={disabledMessage || undefined}
                    >
                      {onRowSelect && (
                        <td className="w-4 p-4">
                          <div className="flex items-center ml-4">
                            {canSelect ? (
                              <Checkbox
                                checked={isSelected}
                                onChange={(e) =>
                                  handleRowSelect(rowId, e.target.checked)
                                }
                              />
                            ) : (
                              <input
                                type="checkbox"
                                disabled
                                className="w-4 h-4 text-gray-400 bg-gray-100 border-gray-300 rounded cursor-not-allowed opacity-50"
                                title={
                                  disabledMessage || "No se puede seleccionar"
                                }
                              />
                            )}
                            <label className="sr-only">Seleccionar fila</label>
                          </div>
                        </td>
                      )}

                      {renderExpandedContent && (
                        <td className="w-8 p-4">
                          {canExpand ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRowExpansion(rowId);
                              }}
                              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                              <ChevronRightIcon
                                className={`w-4 h-4 transform transition-transform duration-300 ease-in-out ${
                                  isExpanded ? "rotate-90" : "rotate-0"
                                }`}
                              />
                            </button>
                          ) : (
                            <div
                              className="w-4 h-4 opacity-30"
                              title={disabledMessage || "No se puede expandir"}
                            >
                              <ChevronRightIcon className="w-4 h-4 text-gray-300" />
                            </div>
                          )}
                        </td>
                      )}

                      {columns.map((column, colIndex) => (
                        <td
                          key={column.key}
                          className={`p-4 ${column.className || ""} ${
                            colIndex === 0
                              ? "font-medium text-gray-900 whitespace-nowrap dark:text-white"
                              : ""
                          }`}
                        >
                          {detailPath && colIndex === 0 ? (
                            <Link
                              href={detailPath}
                              className={`hover:underline ${
                                canView
                                  ? "text-white font-bold"
                                  : "text-white cursor-not-allowed"
                              } ${
                                !renderExpandedContent && colIndex === 0
                                  ? "ml-10"
                                  : ""
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!canView) {
                                  e.preventDefault();
                                }
                              }}
                              title={
                                !canView
                                  ? disabledMessage || "No se puede ver"
                                  : undefined
                              }
                            >
                              {renderCell(column, row, rowIndex)}
                            </Link>
                          ) : (
                            <div className={`${row.className}`}>
                              {renderCell(column, row, rowIndex)}
                            </div>
                          )}
                        </td>
                      ))}

                      {(onRowEdit || getDetailPath) && (
                        <td className="px-6 py-4 space-x-2 flex flex-row gap-3">
                          {getDetailPath && canView && (
                            <Link
                              href={getDetailPath(row)}
                              className="font-medium dark:text-blue-500 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DocumentMagnifyingGlassIcon className="w-5 h-5 text-emerald-700 hover:text-emerald-800" />
                            </Link>
                          )}
                          {onRowDelete && canDeleteRow(row) && (
                            <button
                              onClick={() => {
                                if (
                                  onRowDelete &&
                                  typeof onRowDelete === "function"
                                ) {
                                  onRowDelete(row.id);
                                }
                              }}
                            >
                              <TrashIcon className="w-5 h-5 text-orange-800 hover:text-orange-900" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>

                    {renderExpandedContent && isExpanded && canExpand && (
                      <tr className="bg-gray-50 dark:bg-neutral-700 delay-75 ease-in-out">
                        <td
                          colSpan={
                            columns.length +
                            (onRowSelect ? 1 : 0) +
                            1 +
                            (onRowEdit || getDetailPath ? 1 : 0)
                          }
                          className="p-0"
                        >
                          <div
                            className={[
                              "grid overflow-hidden",
                              "transition-[grid-template-rows,opacity,transform] duration-300 ease-out",
                              !isExpanded &&
                                "grid-rows-[0fr] opacity-0 -translate-y-1 pointer-events-none",
                              isExpanded &&
                                "grid-rows-[1fr] opacity-100 translate-y-0 pointer-events-auto",
                            ].join(" ")}
                            aria-hidden={!isExpanded}
                          >
                            <div className="min-h-0 px-6 py-4">
                              {renderExpandedContent(row, rowIndex)}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN (compartida entre móvil y desktop) */}
      {pagination && (
        <nav className="bg-neutral-900 p-4" aria-label="Navegación de tabla">
          <div className="flex items-center flex-column flex-wrap md:flex-row justify-between bg-neutral-600 rounded py-2 px-3">
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 mb-4 md:mb-0 block w-full md:inline md:w-auto">
              Mostrando{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {(pagination.page - 1) * pagination.pageSize + 1}-
                {Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.total
                )}
              </span>{" "}
              de{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {pagination.total}
              </span>
              {selectableRows.length < data.length && (
                <span className="text-xs text-gray-400 ml-2">
                  ({selectableRows.length} seleccionables)
                </span>
              )}
            </span>

            {pagination.pageCount > 1 && (
              <ul className="inline-flex text-sm h-8">
                <li>
                  <button
                    onClick={() =>
                      onPageChange && onPageChange(pagination.page - 1)
                    }
                    disabled={pagination.page <= 1}
                    className="flex items-center justify-center px-3 h-8 leading-tight bg-zinc-900 rounded-s-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800"
                  >
                    Anterior
                  </button>
                </li>

                {(() => {
                  const currentPage = pagination.page;
                  const totalPages = pagination.pageCount;
                  const pageNumbers = [];
                  for (let i = 1; i <= totalPages; i++) {
                    pageNumbers.push(i);
                  }

                  return pageNumbers.map((pageNum) => (
                    <li key={`page-${pageNum}`}>
                      <button
                        onClick={() => onPageChange && onPageChange(pageNum)}
                        className={`flex items-center justify-center px-4 h-8 leading-tight ${
                          currentPage === pageNum
                            ? "bg-zinc-700 hover:bg-zinc-500"
                            : "bg-zinc-900 hover:bg-zinc-500"
                        }`}
                      >
                        {pageNum}
                      </button>
                    </li>
                  ));
                })()}

                <li>
                  <button
                    onClick={() =>
                      onPageChange && onPageChange(pagination.page + 1)
                    }
                    disabled={pagination.page >= pagination.pageCount}
                    className="flex items-center justify-center px-3 h-8 leading-tight rounded-e-lg disabled:cursor-not-allowed bg-zinc-900 hover:bg-zinc-800"
                  >
                    Siguiente
                  </button>
                </li>
              </ul>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
