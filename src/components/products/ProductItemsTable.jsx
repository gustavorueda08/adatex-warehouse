"use client";

import { useMemo, useState } from "react";
import Table from "@/components/ui/Table";
import format from "@/lib/utils/format";
import Badge from "@/components/ui/Badge";
import { ArchiveBoxIcon } from "@heroicons/react/24/outline";
import Card, {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";

export default function ProductItemsTable({ items = [], product }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
  }, [items, page, pageSize]);

  const columns = [
    {
      key: "barcode",
      label: "Barcode",
      render: (_, item) => (
        <span className="font-mono text-cyan-400 font-bold">
          {item.barcode}
        </span>
      ),
    },
    {
      key: "quantity",
      label: "Cantidad",
      render: (_, item) =>
        `${format(item.currentQuantity || item.quantity)} ${
          product?.unit || ""
        }`,
    },
    {
      key: "lotNumber",
      label: "Lote",
    },
    {
      key: "itemNumber",
      label: "Numero",
    },
    {
      key: "warehouse",
      label: "Bodega",
      render: (_, item) => item.warehouse?.name || "-",
    },
    {
      key: "state",
      label: "Estado",
      render: (_, item) => {
        const state = item.state || "available"; // Default a available si es null
        const stateMap = {
          available: { label: "Disponible", variant: "emerald" },
          reserved: { label: "Reservado", variant: "yellow" },
          sold: { label: "Vendido", variant: "purple" },
          dropped: { label: "Eliminado", variant: "red" },
        };

        const config = stateMap[state] || stateMap.available;

        return (
          <Badge variant={config.variant} size="sm">
            {config.label}
          </Badge>
        );
      },
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <ArchiveBoxIcon className="w-6 h-6 text-cyan-400" />
          <div>
            <CardTitle>Items en Inventario</CardTitle>
            <CardDescription>
              Listado de items asociados a este producto
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table
          data={paginatedItems}
          columns={columns}
          getDetailPath={(item) => `/items/${item.id}`}
          pagination={{
            page,
            pageSize,
            pageCount: Math.ceil(items.length / pageSize),
            total: items.length,
          }}
          onPageChange={(newPage) => setPage(newPage)}
          emptyMessage="No hay items asociados a este producto en bodegas."
        />
      </CardContent>
    </Card>
  );
}
