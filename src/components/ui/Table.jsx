"use client";
import React, { useState, useCallback, useMemo, memo } from "react";
import Link from "next/link";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  DocumentMagnifyingGlassIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import { Checkbox } from "flowbite-react";
import IconButton from "./IconButton";
import classNames from "classnames";

// Componente memoizado para las filas individuales
const TableRow = memo(
  ({
    row,
    rowIndex,
    rowId,
    columns,
    isSelected,
    isExpanded,
    detailPath,
    canSelect,
    canView,
    canExpand,
    canDelete,
    disabledMessage,
    onRowClick,
    onRowSelect,
    onRowDelete,
    onToggleExpand,
    renderCell,
    renderExpandedContent,
  }) => {
    return (
      <>
        <tr
          onClick={(e) => onRowClick(e, row, rowId)}
          className="bg-neutral-900 border-b border-neutral-800 hover:bg-neutral-800 transition-colors"
        >
          {onRowSelect !== undefined && (
            <td className="w-4 p-4">
              <div className="flex items-center ml-4">
                {canSelect ? (
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => onRowSelect(rowId, e.target.checked)}
                  />
                ) : (
                  <input
                    type="checkbox"
                    disabled
                    className="w-4 h-4 text-gray-400 bg-gray-100 border-gray-300 rounded cursor-not-allowed opacity-50"
                    title={disabledMessage || "No se puede seleccionar"}
                  />
                )}
              </div>
            </td>
          )}

          {renderExpandedContent && (
            <td className="w-8 p-4">
              {canExpand ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand(rowId);
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
              } ${colIndex === 0 && !onRowSelect ? "pl-6" : ""}`}
            >
              {detailPath && colIndex === 0 ? (
                <Link
                  href={detailPath}
                  className={`hover:underline ${
                    canView
                      ? "text-white font-bold"
                      : "text-white cursor-not-allowed"
                  } ${!renderExpandedContent && colIndex === 0 ? "ml-10" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!canView) e.preventDefault();
                  }}
                  title={
                    !canView ? disabledMessage || "No se puede ver" : undefined
                  }
                >
                  {renderCell(column, row, rowIndex)}
                </Link>
              ) : (
                <div className={row.className}>
                  {renderCell(column, row, rowIndex)}
                </div>
              )}
            </td>
          ))}

          {(onRowDelete || detailPath) && (
            <td className="p-4">
              <div className="flex flex-row gap-3 justify-between align-middle">
                {detailPath && canView && (
                  <Link
                    href={detailPath}
                    className="font-medium dark:text-blue-500 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DocumentMagnifyingGlassIcon className="w-5 h-5 text-emerald-700 hover:text-emerald-800" />
                  </Link>
                )}
                {onRowDelete && canDelete && (
                  <IconButton
                    onClick={() => onRowDelete(row.id, rowIndex)}
                    variant="red"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </IconButton>
                )}
              </div>
            </td>
          )}
        </tr>

        {renderExpandedContent && isExpanded && canExpand && (
          <tr className="bg-gray-50 dark:bg-neutral-700 delay-75 ease-in-out">
            <td
              colSpan={
                columns.length +
                (onRowSelect !== undefined ? 1 : 0) +
                1 +
                (onRowDelete || detailPath ? 1 : 0)
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
      </>
    );
  }
);
TableRow.displayName = "TableRow";

export default function Table({
  data = [],
  columns = [],
  getRowId = (row) => row.id,
  onRowSelect,
  onRowEdit,
  onRowDelete,
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
  footer = null,
  hiddenHeader = false,
}) {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [allSelected, setAllSelected] = useState(false);

  // Memoizar filas seleccionables
  const selectableRows = useMemo(
    () => data.filter(canSelectRow),
    [data, canSelectRow]
  );
  const selectableRowIds = useMemo(
    () => selectableRows.map(getRowId),
    [selectableRows, getRowId]
  );

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

  const toggleRowExpansion = useCallback((rowId) => {
    setExpandedRows((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(rowId)) {
        newExpanded.delete(rowId);
      } else {
        newExpanded.add(rowId);
      }
      return newExpanded;
    });
  }, []);

  const handleRowClick = useCallback(
    (e, row, rowId) => {
      if (
        e.target.type === "checkbox" ||
        e.target.tagName === "BUTTON" ||
        e.target.tagName === "A" ||
        e.target.tagName === "INPUT" ||
        e.target.closest("button") ||
        e.target.closest("a") ||
        e.target.closest("input")
      ) {
        return;
      }

      if (renderExpandedContent && canExpandRow(row)) {
        toggleRowExpansion(rowId);
      }
    },
    [renderExpandedContent, canExpandRow, toggleRowExpansion]
  );

  // Memoizar renderCell
  const renderCell = useCallback((column, row, rowIndex) => {
    if (column.render) {
      return column.render(row[column.key], row, rowIndex);
    }
    return row[column.key] || "-";
  }, []);

  // Memoizar renderFooterCell
  const renderFooterCell = useCallback(
    (column) => {
      if (!column.footer) return "";
      if (typeof column.footer === "function") {
        return column.footer(data);
      }
      return column.footer;
    },
    [data]
  );

  const hasFooter = useMemo(
    () => footer || columns.some((col) => col.footer !== undefined),
    [footer, columns]
  );

  const areAllSelectableSelected = useMemo(
    () =>
      selectableRowIds.length > 0 &&
      selectableRowIds.every((id) => selectedRows.has(id)),
    [selectableRowIds, selectedRows]
  );

  if (loading) {
    return (
      <div className="bg-black">
        <div className="block md:hidden space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-neutral-900 rounded-xl p-4 shadow-lg animate-pulse border border-neutral-800"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-4 h-4 bg-neutral-700 rounded"></div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-neutral-700 rounded-lg"></div>
                  <div className="w-8 h-8 bg-neutral-700 rounded-lg"></div>
                </div>
              </div>
              <div className="space-y-3">
                {columns.map((col, j) => (
                  <div key={j} className="flex justify-between items-center">
                    <div className="w-24 h-3 bg-neutral-700 rounded"></div>
                    <div className="w-32 h-3 bg-neutral-600 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block relative overflow-x-auto shadow-md rounded-lg min-h-[500px]">
          <table className="w-full text-sm text-left table-auto">
            <thead className="text-xs uppercase">
              <tr className="bg-neutral-900">
                {onRowSelect && (
                  <th scope="col" className="w-12">
                    <div className="my-4 p-4 bg-neutral-600 shadow-xl rounded-l ml-4">
                      <div className="w-4 h-4 bg-neutral-500 rounded animate-pulse"></div>
                    </div>
                  </th>
                )}
                {renderExpandedContent && (
                  <th scope="col" className="w-12">
                    <div className="my-4 p-6 bg-neutral-600 shadow-xl">
                      <div className="w-4 h-4 bg-neutral-500 rounded animate-pulse"></div>
                    </div>
                  </th>
                )}
                {columns.map((column, index) => (
                  <th key={column.key} scope="col" className="max-w-[200px]">
                    <div
                      className={`shadow-xl my-4 p-4 bg-neutral-600 ${
                        index === columns.length - 1 &&
                        !onRowDelete &&
                        !getDetailPath
                          ? "mr-4 rounded-r"
                          : ""
                      } ${
                        index === 0 && !renderExpandedContent && !onRowSelect
                          ? "ml-4 rounded-l"
                          : ""
                      }`}
                    >
                      <div className="h-3 bg-neutral-500 rounded w-20 animate-pulse"></div>
                    </div>
                  </th>
                ))}
                {(onRowDelete || getDetailPath) && (
                  <th scope="col" className="w-28">
                    <div className="shadow-xl my-4 p-4 bg-neutral-600 mr-4 rounded-r">
                      <div className="h-3 bg-neutral-500 rounded w-16 animate-pulse"></div>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((rowNum) => (
                <tr
                  key={rowNum}
                  className="bg-neutral-900 border-b border-neutral-800"
                >
                  {onRowSelect && (
                    <td className="p-4">
                      <div className="flex items-center ml-4">
                        <div className="w-4 h-4 bg-neutral-700 rounded animate-pulse"></div>
                      </div>
                    </td>
                  )}
                  {renderExpandedContent && (
                    <td className="p-4">
                      <div className="w-4 h-4 bg-neutral-700 rounded animate-pulse"></div>
                    </td>
                  )}
                  {columns.map((column, colIndex) => (
                    <td key={column.key} className="p-4">
                      <div className="animate-pulse">
                        <div
                          className={`h-3 bg-neutral-700 rounded ${
                            colIndex === 0 ? "w-32" : "w-24"
                          }`}
                        ></div>
                      </div>
                    </td>
                  ))}
                  {(onRowDelete || getDetailPath) && (
                    <td className="p-4">
                      <div className="flex gap-2">
                        <div className="w-5 h-5 bg-neutral-700 rounded animate-pulse"></div>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-neutral-800 px-6 py-4 rounded-lg shadow-xl border border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-white font-medium">
                  Cargando datos...
                </span>
              </div>
            </div>
          </div>
        </div>

        {pagination && (
          <nav
            className="bg-neutral-900 p-4 rounded-lg mt-4"
            aria-label="Navegación de tabla"
          >
            <div className="flex items-center justify-between bg-neutral-800 rounded-lg py-3 px-4 border border-neutral-700">
              <div className="w-48 h-4 bg-neutral-700 rounded animate-pulse"></div>
              <div className="flex gap-1">
                <div className="w-20 h-8 bg-neutral-700 rounded-lg animate-pulse"></div>
                <div className="w-8 h-8 bg-neutral-700 rounded-lg animate-pulse"></div>
                <div className="w-8 h-8 bg-neutral-700 rounded-lg animate-pulse"></div>
                <div className="w-20 h-8 bg-neutral-700 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </nav>
        )}
      </div>
    );
  }

  return (
    <div className="bg-black rounded-lg">
      {/* VISTA MÓVIL */}
      <div className="block md:hidden">
        {onRowSelect && selectableRows.length > 0 && (
          <div className="bg-neutral-900 rounded-xl p-4 mb-3 flex items-center justify-between shadow-md border border-neutral-800">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={areAllSelectableSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              <span className="text-white font-medium text-sm">
                Seleccionar todos
              </span>
            </div>
            {selectedRows.size > 0 && (
              <span className="ml-2 text-xs bg-emerald-600 text-white px-2.5 py-1 rounded-full font-medium">
                {selectedRows.size}
              </span>
            )}
          </div>
        )}

        {data.length > 0 && (
          <div className="bg-neutral-900 border border-neutral-800 text-gray-400 text-xs py-2 px-3 text-center rounded-lg mb-3">
            {data.length} {data.length === 1 ? "elemento" : "elementos"}
          </div>
        )}

        {data.length === 0 ? (
          <div className="text-center text-gray-400 py-12 bg-neutral-900 rounded-xl border border-neutral-800">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((row, rowIndex) => {
              const rowId = getRowId(row);
              const isSelected = selectedRows.has(rowId);
              const isExpanded = expandedRows.has(rowId);
              const canSelect = canSelectRow(row);
              const canView = canViewRow(row);
              const canDelete = canDeleteRow(row);
              const canExpand = canExpandRow(row);
              const detailPath =
                getDetailPath && canView ? getDetailPath(row) : null;
              const disabledMessage = getDisabledMessage(row);

              return (
                <div
                  key={rowId}
                  className="bg-neutral-900 rounded-xl p-4 shadow-md border border-neutral-800 hover:border-neutral-700 transition-all"
                >
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
                    <div className="flex items-center gap-2">
                      {onRowSelect &&
                        (canSelect ? (
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
                            title={disabledMessage || "No se puede seleccionar"}
                          />
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {getDetailPath && canView && (
                        <Link
                          href={getDetailPath(row)}
                          className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
                        >
                          <DocumentMagnifyingGlassIcon className="w-5 h-5 text-emerald-500" />
                        </Link>
                      )}

                      {onRowDelete && canDelete && (
                        <button
                          onClick={() => onRowDelete(row.id, rowIndex)}
                          className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                          <TrashIcon className="w-5 h-5 text-red-500" />
                        </button>
                      )}

                      {renderExpandedContent && canExpand && (
                        <button
                          onClick={() => toggleRowExpansion(rowId)}
                          className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
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

                  <div className="space-y-2.5">
                    {columns.map((column, index) => (
                      <div
                        key={`${rowId}-${column.key}`}
                        className="flex justify-between items-start gap-3"
                      >
                        <span className="text-gray-400 text-xs font-medium min-w-[80px]">
                          {column.label}
                        </span>
                        <span className="text-white text-sm text-right flex-1">
                          {detailPath && index === 0 ? (
                            <Link
                              href={detailPath}
                              className="hover:underline text-emerald-400 font-semibold"
                              onClick={(e) => {
                                if (!canView) e.preventDefault();
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

                  {renderExpandedContent && isExpanded && canExpand && (
                    <div className="mt-4 pt-4 border-t border-neutral-800 animate-in fade-in slide-in-from-top-2 duration-300">
                      {renderExpandedContent(row, rowIndex)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {hasFooter && (
          <div className="bg-neutral-900 rounded-xl p-4 mt-3 shadow-md border border-neutral-800">
            {footer || (
              <div className="space-y-2.5">
                {columns.map((column) => (
                  <div
                    key={`footer-mobile-${column.key}`}
                    className="flex justify-between items-start gap-3"
                  >
                    <span className="text-gray-400 text-xs font-medium min-w-[80px]">
                      {column.label}
                    </span>
                    <span className="text-white text-sm text-right flex-1 font-semibold">
                      {renderFooterCell(column)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* VISTA DESKTOP */}
      <div className="hidden md:block relative overflow-x-auto shadow-md rounded-lg">
        <table className="w-full text-sm text-left table-auto">
          <thead
            className={classNames("text-xs uppercase", {
              hidden: hiddenHeader,
            })}
          >
            <tr className="bg-neutral-900">
              {onRowSelect && selectableRows.length > 0 && (
                <th scope="col" className="w-12">
                  <div className="flex items-center my-4 p-4 rounded-l ml-4 bg-neutral-600 shadow-xl">
                    <Checkbox
                      checked={areAllSelectableSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </div>
                </th>
              )}

              {renderExpandedContent && data.length > 0 && (
                <th scope="col" className="w-12">
                  <div className="my-4 p-6 bg-neutral-600 h-full w-full shadow-xl"></div>
                </th>
              )}

              {columns.map((column, index) => (
                <th key={column.key} scope="col" className="max-w-[200px]">
                  <div
                    className={`shadow-xl my-4 p-4 truncate ${
                      index + 1 === columns.length && !onRowEdit && !onRowDelete
                        ? "mr-4 rounded-r"
                        : "mr-0"
                    } ${
                      (index === 0 && data.length === 0) ||
                      (index === 0 && !renderExpandedContent && !onRowSelect)
                        ? "ml-4 rounded-l"
                        : "pl-6"
                    } bg-neutral-600`}
                    title={column.label}
                  >
                    {column.label}
                  </div>
                </th>
              ))}

              {(onRowEdit || onRowDelete || getDetailPath) && (
                <th scope="col" className="w-28">
                  <div className="shadow-xl my-4 p-4 bg-neutral-600 whitespace-nowrap mr-4 rounded-r">
                    Acciones
                  </div>
                </th>
              )}
            </tr>
          </thead>

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
                  className="px-6 py-12 text-center text-gray-400"
                >
                  <div className="text-4xl mb-2">📋</div>
                  <p>{emptyMessage}</p>
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
                const canView = canViewRow(row);
                const canExpand = canExpandRow(row);
                const canDelete = canDeleteRow(row);
                const disabledMessage = getDisabledMessage(row);

                return (
                  <TableRow
                    key={rowId}
                    row={row}
                    rowIndex={rowIndex}
                    rowId={rowId}
                    columns={columns}
                    isSelected={isSelected}
                    isExpanded={isExpanded}
                    detailPath={detailPath}
                    canSelect={canSelect}
                    canView={canView}
                    canExpand={canExpand}
                    canDelete={canDelete}
                    disabledMessage={disabledMessage}
                    onRowClick={handleRowClick}
                    onRowSelect={onRowSelect ? handleRowSelect : undefined}
                    onRowDelete={onRowDelete}
                    onToggleExpand={toggleRowExpansion}
                    renderCell={renderCell}
                    renderExpandedContent={renderExpandedContent}
                  />
                );
              })
            )}
          </tbody>

          {hasFooter && data.length > 0 && (
            <tfoot>
              <tr className="bg-neutral-900">
                {onRowSelect && selectableRows.length > 0 && (
                  <td className="my-4 p-4 rounded-l ml-4 bg-neutral-600 shadow-xl"></td>
                )}

                {renderExpandedContent && data.length > 0 && (
                  <td className="my-4 p-6 bg-neutral-600 h-full w-full shadow-xl"></td>
                )}

                {columns.map((column, index) => (
                  <td key={`footer-${column.key}`} className="max-w-[200px]">
                    <div
                      className={`shadow-xl font-bold my-4 p-4 truncate ${
                        index + 1 === columns.length &&
                        !(onRowEdit || onRowDelete || getDetailPath)
                          ? "mr-4 rounded-r"
                          : "mr-0"
                      } ${
                        index === 0 && !renderExpandedContent && !onRowSelect
                          ? "ml-4 rounded-l"
                          : ""
                      } bg-neutral-600 text-white font-bold text-xs uppercase`}
                      title={renderFooterCell(column)}
                    >
                      {renderFooterCell(column)}
                    </div>
                  </td>
                ))}

                {(onRowEdit || onRowDelete || getDetailPath) && (
                  <td>
                    <div className="font-bold shadow-xl my-4 p-4 bg-neutral-600 whitespace-nowrap mr-4 rounded-r text-white text-xs uppercase">
                      -
                    </div>
                  </td>
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {pagination && (
        <nav
          className="bg-neutral-900 p-4 rounded-lg mt-4"
          aria-label="Navegación de tabla"
        >
          <div className="flex items-center flex-column flex-wrap md:flex-row justify-between bg-neutral-800 rounded-lg py-3 px-4 border border-neutral-700">
            <span className="text-sm font-normal text-gray-400 mb-4 md:mb-0 block w-full md:inline md:w-auto">
              Mostrando{" "}
              <span className="font-semibold text-white">
                {(pagination.page - 1) * pagination.pageSize + 1}-
                {Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.total
                )}
              </span>{" "}
              de{" "}
              <span className="font-semibold text-white">
                {pagination.total}
              </span>
              {selectableRows.length < data.length && (
                <span className="text-xs text-gray-500 ml-2">
                  ({selectableRows.length} seleccionables)
                </span>
              )}
            </span>

            {pagination.pageCount > 1 && (
              <ul className="inline-flex text-sm h-8 gap-1">
                <li>
                  <button
                    onClick={() =>
                      onPageChange && onPageChange(pagination.page - 1)
                    }
                    disabled={pagination.page <= 1}
                    className="flex items-center justify-center px-3 h-8 leading-tight bg-neutral-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-600 transition-colors"
                  >
                    Anterior
                  </button>
                </li>

                {Array.from(
                  { length: pagination.pageCount },
                  (_, i) => i + 1
                ).map((pageNum) => (
                  <li key={`page-${pageNum}`}>
                    <button
                      onClick={() => onPageChange && onPageChange(pageNum)}
                      className={`flex items-center justify-center px-4 h-8 leading-tight rounded-lg transition-colors ${
                        pagination.page === pageNum
                          ? "bg-emerald-600 text-white font-semibold"
                          : "bg-neutral-700 hover:bg-neutral-600"
                      }`}
                    >
                      {pageNum}
                    </button>
                  </li>
                ))}

                <li>
                  <button
                    onClick={() =>
                      onPageChange && onPageChange(pagination.page + 1)
                    }
                    disabled={pagination.page >= pagination.pageCount}
                    className="flex items-center justify-center px-3 h-8 leading-tight rounded-lg disabled:cursor-not-allowed bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 transition-colors"
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
