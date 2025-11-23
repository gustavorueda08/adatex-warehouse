"use client";

import { useMemo, useCallback, useState } from "react";
import Link from "next/link";
import {
  ChevronDownIcon,
  DocumentMagnifyingGlassIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Checkbox } from "flowbite-react";
import classNames from "classnames";
import IconButton from "./IconButton";

/**
 * Mobile-first list view with feature parity to Table (selection, delete, detail, expandable content).
 * Intended to be used alongside Table in desktop (wrap with md:hidden / hidden md:block).
 */
export default function MobileList({
  data = [],
  columns = [],
  getRowId = (row) => row.id,
  onRowSelect,
  onRowDelete,
  getDetailPath,
  renderExpandedContent,
  loading = false,
  emptyMessage = "No se encontraron elementos",
  canSelectRow = () => true,
  canViewRow = () => true,
  canDeleteRow = () => true,
  canExpandRow = () => true,
  getDisabledMessage = () => "",
  footer = null,
  className = "",
  footerFilter = () => true,
}) {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [detailsRows, setDetailsRows] = useState(new Set());

  const selectableRows = useMemo(
    () => data.filter(canSelectRow),
    [data, canSelectRow]
  );
  const selectableRowIds = useMemo(
    () => selectableRows.map(getRowId),
    [selectableRows, getRowId]
  );

  const renderCell = useCallback((column, row, rowIndex) => {
    if (column.render) {
      return column.render(row[column.key], row, rowIndex);
    }
    return row[column.key] || "-";
  }, []);

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

  const handleSelectAll = useCallback(
    (checked) => {
      if (!onRowSelect) return;
      if (checked) {
        const ids = new Set(selectableRowIds);
        setSelectedRows(ids);
        onRowSelect(selectableRowIds);
      } else {
        setSelectedRows(new Set());
        onRowSelect([]);
      }
    },
    [onRowSelect, selectableRowIds]
  );

  const handleRowSelect = useCallback(
    (rowId, checked) => {
      if (!onRowSelect) return;
      setSelectedRows((prev) => {
        const next = new Set(prev);
        if (checked) next.add(rowId);
        else next.delete(rowId);
        onRowSelect(Array.from(next));
        return next;
      });
    },
    [onRowSelect]
  );

  const toggleDetails = useCallback((rowId) => {
    setDetailsRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, []);

  const toggleExpanded = useCallback((rowId) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, []);

  const areAllSelected = useMemo(
    () =>
      selectableRowIds.length > 0 &&
      selectableRowIds.every((id) => selectedRows.has(id)),
    [selectableRowIds, selectedRows]
  );

  const primaryColumn = columns[0];

  if (loading) {
    return (
      <div className={classNames("space-y-3", className)}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-neutral-900 rounded-xl p-3 border border-neutral-800 animate-pulse"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-24 h-3 bg-neutral-700 rounded" />
              <div className="w-16 h-3 bg-neutral-700 rounded" />
            </div>
            <div className="space-y-2">
              {columns.slice(0, 3).map((_, idx) => (
                <div key={idx} className="grid grid-cols-[110px_1fr] gap-2">
                  <div className="h-3 bg-neutral-700 rounded" />
                  <div className="h-3 bg-neutral-600 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={classNames(className)}>
        <div className="text-center text-gray-400 py-10 bg-neutral-900 rounded-xl border border-neutral-800">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={classNames("space-y-3", className)}>
      {onRowSelect && selectableRows.length > 0 && (
        <div className="bg-neutral-900 rounded-xl p-3 flex items-center justify-between shadow-md border border-neutral-800">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={areAllSelected}
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

      {data.map((row, rowIndex) => {
        const rowId = getRowId(row);
        const isSelected = selectedRows.has(rowId);
        const isExpanded = expandedRows.has(rowId);
        const showDetails = detailsRows.has(rowId);
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
            className="bg-neutral-900 rounded-xl p-3 shadow-md border border-neutral-800 hover:border-neutral-700 transition-all"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                {onRowSelect && (
                  <Checkbox
                    checked={isSelected}
                    disabled={!canSelect}
                    onChange={(e) => handleRowSelect(rowId, e.target.checked)}
                  />
                )}
                {primaryColumn && (
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400">
                      {primaryColumn.label}
                    </span>
                    <span className="text-white text-sm font-semibold">
                      {detailPath ? (
                        <Link
                          href={detailPath}
                          className="hover:underline text-emerald-400 font-semibold"
                          onClick={(e) => {
                            if (!canView) e.preventDefault();
                          }}
                        >
                          {renderCell(primaryColumn, row, rowIndex)}
                        </Link>
                      ) : (
                        <div className={row.className}>
                          {renderCell(primaryColumn, row, rowIndex)}
                        </div>
                      )}
                    </span>
                  </div>
                )}
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
                  <IconButton
                    onClick={() => onRowDelete(row.id, rowIndex)}
                    variant="red"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </IconButton>
                )}

                {renderExpandedContent && canExpand && (
                  <button
                    onClick={() => toggleExpanded(rowId)}
                    className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
                  >
                    <ChevronDownIcon
                      className={classNames(
                        "w-5 h-5 text-gray-400 transition-transform duration-300",
                        isExpanded ? "rotate-180" : "rotate-0"
                      )}
                    />
                  </button>
                )}

                {columns.length > 0 && (
                  <button
                    onClick={() => toggleDetails(rowId)}
                    className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
                  >
                    <ChevronDownIcon
                      className={classNames(
                        "w-5 h-5 text-gray-400 transition-transform duration-300",
                        showDetails ? "rotate-180" : "rotate-0"
                      )}
                    />
                  </button>
                )}
              </div>
            </div>

            <div
              className={classNames(
                "grid grid-cols-1 gap-2 overflow-hidden transition-[max-height,opacity] duration-200",
                showDetails
                  ? "max-h-[900px] opacity-100"
                  : "max-h-0 opacity-0 pointer-events-none"
              )}
              aria-hidden={!showDetails}
            >
              {columns.map((column) => (
                <div
                  key={`${rowId}-${column.key}`}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1"
                >
                  <span className="text-gray-300 text-xs font-semibold whitespace-nowrap">
                    {column.label}
                  </span>
                  <span className="text-white text-sm leading-snug flex-1 min-w-[45%]">
                    <div className={row.className}>
                      {renderCell(column, row, rowIndex)}
                    </div>
                  </span>
                </div>
              ))}
            </div>

            {renderExpandedContent && isExpanded && canExpand && (
              <div className="mt-3 pt-3 border-t border-neutral-800">
                {renderExpandedContent(row, rowIndex)}
              </div>
            )}
          </div>
        );
      })}

      {footer && (
        <div className="bg-neutral-900 rounded-xl p-4 shadow-md border border-neutral-800">
          {footer}
        </div>
      )}

      {!footer && columns.some((c) => c.footer) && (
        <div className="bg-neutral-900 rounded-xl p-4 shadow-md border border-neutral-800">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <span className="text-xs uppercase tracking-wide text-gray-300 font-semibold">
              Totales
            </span>
          </div>
          <div className="space-y-1.5 pt-2">
            {columns.map((column) => (
              (() => {
                if (column.showFooterInMobile === false) return null;
                const footerValue = renderFooterCell(column);
                if (!footerFilter(column, footerValue)) return null;
                return (
                  <div
                    key={`footer-mobile-${column.key}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-gray-300 text-xs font-semibold">
                      {column.label}
                    </span>
                    <span className="text-white text-sm font-semibold text-right">
                      {footerValue}
                    </span>
                  </div>
                );
              })()
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
