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
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.data - Array de objetos para mostrar
 * @param {Array} props.columns - Configuración de columnas
 * @param {Function} props.getRowId - Función para obtener ID único del row
 * @param {Function} props.onRowSelect - Callback cuando se selecciona un row
 * @param {Function} props.onRowEdit - Callback cuando se edita un row
 * @param {Function} props.onRowDelete - Callback cuando se elimina un row
 * @param {Function} props.getDetailPath - Función para generar path de detalle
 * @param {Function} props.renderExpandedContent - Función para renderizar contenido expandido
 * @param {Object} props.pagination - Datos de paginación
 * @param {Function} props.onPageChange - Callback para cambio de página
 * @param {Boolean} props.loading - Estado de carga
 * @param {String} props.emptyMessage - Mensaje cuando no hay datos
 * @param {Function} props.canSelectRow - Función para determinar si un row se puede seleccionar
 * @param {Function} props.canEditRow - Función para determinar si un row se puede editar
 * @param {Function} props.canDeleteRow - Función para determinar si un row se puede eliminar
 * @param {Function} props.canViewRow - Función para determinar si un row se puede ver en detalle
 * @param {Function} props.canExpandRow - Función para determinar si un row se puede expandir
 * @param {Function} props.getRowClassName - Función para obtener clases CSS adicionales del row
 * @param {Function} props.getDisabledMessage - Función para obtener mensaje de tooltip cuando está deshabilitado
 * @returns {JSX.Element}
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
  // Nuevas funciones de permisos
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
      // Si se hace clic en checkbox, input, o botón, no hacer nada
      if (
        e.target.type === "checkbox" ||
        e.target.tagName === "BUTTON" ||
        e.target.tagName === "A" ||
        e.target.closest("button") ||
        e.target.closest("a")
      ) {
        return;
      }

      // Si tiene contenido expandible y se puede expandir, alternar expansión
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

  if (loading) {
    return (
      <table className="w-full text-sm text-left table-fixed">
        {/* Header */}
        <thead className="text-xs  uppercase ">
          <tr className="bg-neutral-900 ">
            {/* Checkbox de selección global */}
            {onRowSelect && selectableRows.length > 0 && (
              <th scope="col">
                <div className="flex items-center my-4 p-4 rounded-l ml-4  bg-neutral-600 shadow-xl">
                  <input
                    type="checkbox"
                    checked={areAllSelectableSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label className="sr-only">Seleccionar todos</label>
                </div>
              </th>
            )}

            {/* Columna de expansión */}
            {renderExpandedContent && data.length > 0 && (
              <th scope="col">
                <div
                  className={`${
                    data.length === 0 ? "rounded-l ml-4" : ""
                  } my-4 p-6 bg-neutral-600 h-full w-full shadow-xl`}
                ></div>
              </th>
            )}

            {/* Columnas de datos */}
            {columns.map((column, index) => (
              <th key={column.key} scope="col">
                <div
                  className={`shadow-xl my-4 p-4 ${
                    index + 1 == columns.length && !onRowEdit
                      ? "mr-4 rounded-r"
                      : "mr-0"
                  } ${
                    index + 1 === 1 && data.length === 0 ? "ml-4 rounded-l" : ""
                  } bg-neutral-600 whitespace-nowrap`}
                >
                  {column.label}
                </div>
              </th>
            ))}

            {/* Columna de acciones */}
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
          {data.length === 0 && (
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
                Cargando datos
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  }

  return (
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg bg-black">
      <table className="w-full text-sm text-left">
        {/* Header */}
        <thead className="text-xs  uppercase ">
          <tr className="bg-neutral-900 ">
            {/* Checkbox de selección global */}
            {onRowSelect && selectableRows.length > 0 && (
              <th scope="col">
                <div className="flex items-center my-4 p-4 rounded-l ml-4  bg-neutral-600 shadow-xl">
                  <Checkbox
                    checked={areAllSelectableSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                  <label className="sr-only">Seleccionar todos</label>
                </div>
              </th>
            )}

            {/* Columna de expansión */}
            {renderExpandedContent && data.length > 0 && (
              <th scope="col">
                <div
                  className={`${
                    data.length === 0 ? "rounded-l ml-4" : ""
                  } my-4 p-6 bg-neutral-600 h-full w-full shadow-xl`}
                ></div>
              </th>
            )}

            {/* Columnas de datos */}
            {columns.map((column, index) => (
              <th key={column.key} scope="col">
                <div
                  className={`shadow-xl my-4 p-4 ${
                    index + 1 == columns.length && !onRowEdit
                      ? "mr-4 rounded-r"
                      : "mr-0"
                  } ${
                    (index + 1 === 1 && data.length === 0) ||
                    (index + 1 === 1 && !renderExpandedContent)
                      ? "ml-4 rounded-l"
                      : ""
                  } bg-neutral-600 whitespace-nowrap`}
                >
                  {column.label}
                </div>
              </th>
            ))}

            {/* Columna de acciones */}
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

              // Permisos del row
              const canSelect = canSelectRow(row);
              const canEdit = canEditRow(row);
              const canView = canViewRow(row);
              const canExpand = canExpandRow(row);

              // Clases CSS del row
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
              const rowClasses = `${baseRowClasses} ${customRowClasses}`.trim();

              const disabledMessage = getDisabledMessage(row);

              return (
                <React.Fragment key={rowId}>
                  {/* Row principal */}
                  <tr
                    onClick={(e) => handleRowClick(e, row, rowId)}
                    className={"bg-neutral-900 "}
                    title={disabledMessage || undefined}
                  >
                    {/* Checkbox de selección */}
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

                    {/* Botón de expansión */}
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

                    {/* Celdas de datos */}
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

                    {/* Columna de acciones */}
                    {(onRowEdit || getDetailPath) && (
                      <td className="px-6 py-4 space-x-2 flex flex-row  gap-3">
                        {getDetailPath && canView && (
                          <Link
                            href={getDetailPath(row)}
                            className="font-medium  dark:text-blue-500 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DocumentMagnifyingGlassIcon className="w-5 h-5 text-emerald-700 hover:text-emerald-800" />
                          </Link>
                        )}
                        {onRowDelete && canDeleteRow && (
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

                  {/* Row expandido */}
                  {renderExpandedContent && isExpanded && canExpand && (
                    <tr className="bg-gray-50 dark:bg-neutral-700 delay-75 ease-in-out ">
                      <td
                        colSpan={
                          columns.length +
                          (onRowSelect ? 1 : 0) +
                          1 + // columna de expansión
                          (onRowEdit || getDetailPath ? 1 : 0)
                        }
                        className="p-0" // padding adentro del wrapper
                      >
                        <div
                          className={[
                            "grid overflow-hidden",
                            // animamos SOLO estas props:
                            "transition-[grid-template-rows,opacity,transform] duration-300 ease-out",
                            // cerrado
                            !isExpanded &&
                              "grid-rows-[0fr] opacity-0 -translate-y-1 pointer-events-none",
                            // abierto
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

      {/* Paginación */}
      {/* Paginación fuera del scroll */}
      {pagination && (
        <nav className=" bg-neutral-900 p-4" aria-label="Navegación de tabla">
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
                {/* Botón Previous */}
                <li>
                  <button
                    onClick={() =>
                      onPageChange && onPageChange(pagination.page - 1)
                    }
                    disabled={pagination.page <= 1}
                    className="flex items-center justify-center px-3 h-8  leading-tight bg-zinc-900   rounded-s-lg  disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800"
                  >
                    Anterior
                  </button>
                </li>

                {/* Números de página */}
                {/* Números de página */}
                {(() => {
                  const currentPage = pagination.page;
                  const totalPages = pagination.pageCount;

                  // Crear array simple con números consecutivos
                  const pageNumbers = [];
                  for (let i = 1; i <= totalPages; i++) {
                    pageNumbers.push(i);
                  }

                  return pageNumbers.map((pageNum) => (
                    <li key={`page-${pageNum}`}>
                      <button
                        onClick={() => onPageChange && onPageChange(pageNum)}
                        className={`flex items-center justify-center px-4 h-8 leading-tight  ${
                          currentPage === pageNum
                            ? "bg-zinc-700 hover:bg-zinc-500  "
                            : "bg-zinc-900 hover:bg-zinc-500"
                        }`}
                      >
                        {pageNum}
                      </button>
                    </li>
                  ));
                })()}

                {/* Botón Next */}
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
