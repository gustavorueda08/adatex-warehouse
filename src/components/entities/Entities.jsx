import { useUser } from "@/lib/hooks/useUser";
import { Pagination, Skeleton, Progress, Tooltip } from "@heroui/react";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import React from "react";

export default function Entities({
  columns = [],
  entities = [],
  pagination = { pageSize: 1 },
  screenSize,
  selectedKeys = new Set(),
  setSelectedKeys,
  pageCount,
  setPagination,
  loading,
  isFetching = false,
  className = "",
  emptyContent = "No se encontraron entidades",
  keyField = "id",
}) {
  const renderCell = (entity, columnKey) => {
    const column = columns.find((column) => column.key === columnKey);
    if (column.render) {
      return column.render(entity, columnKey);
    }
    return entity[columnKey] || "-";
  };
  const { user } = useUser();
  const handleSelectionChange = (keys) => {
    setSelectedKeys(keys === "all" ? "all" : new Set([...keys]));
  };

  if (loading) {
    return (
      <Table aria-label="Entidades" isCompact>
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn key={column.key}>{column.label}</TableColumn>
          )}
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell key={column.key}>
                  <Skeleton className="rounded-lg">
                    <div className="h-6 w-full rounded-lg bg-default-200" />
                  </Skeleton>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="relative">
      {isFetching && (
        <Progress
          size="sm"
          isIndeterminate
          color="primary"
          className="absolute top-0 w-full z-50 rounded-t-lg"
        />
      )}
      <Table
        className={className}
        isStriped
        isCompact
        classNames={{
          wrapper: "p-4",
          th: "py-2",
          td: "py-1",
          tr: "h-auto",
        }}
        selectionMode={
          screenSize !== "lg" || user?.type === "seller" ? "none" : "multiple"
        }
        onSelectionChange={handleSelectionChange}
        selectedKeys={selectedKeys}
        bottomContent={
          pagination?.pageSize > 0 && (
            <div className="flex w-full justify-center lg:justify-end">
              <Pagination
                isCompact
                showControls
                showShadow
                color="primary"
                page={pagination?.page}
                total={pageCount}
                onChange={(page) => setPagination({ ...pagination, page })}
              />
            </div>
          )
        }
      >
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn>
              <Tooltip content={column.tooltip ? column.tooltip : null}>
                {column.label}
              </Tooltip>
            </TableColumn>
          )}
        </TableHeader>
        <TableBody
          isLoading={loading}
          items={entities}
          loadingContent={<Skeleton className="flex rounded-full w-12 h-12" />}
          emptyContent={emptyContent}
        >
          {(entity) => (
            <TableRow key={entity[keyField]}>
              {(columnKey) => (
                <TableCell>{renderCell(entity, columnKey)}</TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
