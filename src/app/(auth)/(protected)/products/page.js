"use client";

import { useProducts } from "@/lib/hooks/useProducts";
import EntityListPage from "@/components/entities/EntityListPage";
import { useProductListConfig } from "@/lib/config/productConfigs";
import toast from "react-hot-toast";
import ExportItemsModal from "@/components/products/ExportItemsModal";
import { exportItemsToExcel } from "@/lib/utils/exportItemsToExcel";
import React, { useMemo, useState } from "react";
import Entities from "@/components/entities/Entities";
import Link from "next/link";
import format from "@/lib/utils/format";
import EntityFilters from "@/components/entities/EntityFilters";
import { Select, SelectItem } from "@heroui/react";
import { getLocalTimeZone, today } from "@internationalized/date";
import InventoryMode from "@/components/entities/InventoryMode";
import { useEntityList } from "@/lib/hooks/useEntityList";
import BulkProductUploader from "@/components/products/BulkProductUploader";

export default function ProductsPage() {
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
  });
  const [search, setSearch] = useState("");
  const [inventoryMode, setInventoryMode] = useState("standard"); // standard, historical, projection
  const [selectedDate, setSelectedDate] = useState(today(getLocalTimeZone()));
  const [dateRange, setDateRange] = useState({
    start: today(getLocalTimeZone()),
    end: today(getLocalTimeZone()).add({ months: 1 }),
  });
  const [selectedLine, setSelectedLine] = useState(null);
  const [selectedCollections, setSelectedCollections] = useState(new Set());
  const linesList = useEntityList({
    listType: "lines",
    limit: 20,
  });
  const collectionsList = useEntityList({
    listType: "collections",
    limit: 20,
    filters: useMemo(
      () => (selectedLine ? { line: selectedLine } : null),
      [selectedLine],
    ),
    enabled: !!selectedLine,
  });

  const filters = useMemo(() => {
    const f = {};
    if (search) {
      const terms = search.split(/\s+/).filter(Boolean);
      if (terms.length > 0) {
        f.$and = terms.map((term) => ({
          $or: [
            { name: { $containsi: term } },
            { code: { $containsi: term } },
            { barcode: { $containsi: term } },
          ],
        }));
      }
    }

    if (selectedLine) {
      f.line = selectedLine;
    }

    if (selectedCollections.size > 0) {
      f.collection = { $in: Array.from(selectedCollections) };
    }

    return f;
  }, [search, selectedLine, selectedCollections]);

  // Determine params based on mode
  const dateParams = useMemo(() => {
    if (inventoryMode === "standard") return {}; // standard

    if (inventoryMode === "historical") {
      if (!selectedDate) return {};
      const formattedDate = selectedDate.toString(); // YYYY-MM-DD
      // API expects ISO for historical? Or just date? Docs say: date=2023-10-27T23:59:59Z
      return { date: selectedDate };
    }

    if (inventoryMode === "projection") {
      if (!dateRange?.start || !dateRange?.end) return {};
      return {
        fromDate: dateRange.start,
        toDate: dateRange.end,
      };
    }
    return {};
  }, [inventoryMode, selectedDate, dateRange]);

  const {
    products,
    pagination: { pageCount },
    loading,
    isFetching,
    bulkUpsertProducts,
    syncing,
  } = useProducts(
    {
      pagination,
      filters,
    },
    {
      withInventory: true,
      ...dateParams,
    },
  );

  const handleBulkSync = async (data) => {
    const result = await bulkUpsertProducts(data);
    if (result.success) {
      toast.success(
        `Sincronización completada: ${result.data.created} creados, ${result.data.updated} actualizados.`,
      );
    } else {
      toast.error("Error al sincronizar productos");
    }
  };

  const columns = [
    {
      key: "code",
      label: "Código",
      render: (product) => (
        <Link href={`/products/${product.id}`} className="text-nowrap">
          <span className="hover:underline cursor-pointer">{`${product.code} ${product.barcode ? `| ${product.barcode}` : ""}`}</span>
        </Link>
      ),
    },
    {
      key: "name",
      label: "Nombre",
      render: (product) => (
        <Link href={`/products/${product.id}`} className="text-nowrap">
          <span className="hover:underline cursor-pointer">{product.name}</span>
        </Link>
      ),
    },
    {
      key: "stock",
      label: "Stock",
      render: (product) => (
        <Link href={`/products/${product.id}`} className="text-nowrap">
          <span className="hover:underline cursor-pointer">
            {format(product?.inventory?.stock || 0)} {product?.unit}
          </span>
        </Link>
      ),
    },
    {
      key: "reserved",
      label: "Reservado",
      render: (product) => (
        <Link href={`/products/${product.id}`} className="text-nowrap">
          <span className="hover:underline cursor-pointer">
            {format(product?.inventory?.reserved || 0)} {product?.unit}
          </span>
        </Link>
      ),
    },
    ...(inventoryMode === "projection"
      ? [
          {
            key: "arriving",
            label: "Llegando",
            render: (product) => (
              <Link href={`/products/${product.id}`} className="text-nowrap">
                <span className="hover:underline cursor-pointer">
                  {format(product?.inventory?.arriving || 0)} {product?.unit}
                </span>
              </Link>
            ),
          },
        ]
      : []),
    {
      key: "available",
      label: "Disponible",
      render: (product) => (
        <Link href={`/products/${product.id}`} className="text-nowrap">
          <span className="hover:underline cursor-pointer">
            {format(product?.inventory?.available || 0)} {product?.unit}
          </span>
        </Link>
      ),
    },
    {
      key: "required",
      label: "Requerido",
      render: (product) => (
        <Link href={`/products/${product.id}`} className="text-nowrap">
          <span className="hover:underline cursor-pointer">
            {format(product?.inventory?.required || 0)} {product?.unit}
          </span>
        </Link>
      ),
    },
    {
      key: "production",
      label: "En Producción",
      render: (product) => (
        <Link href={`/products/${product.id}`} className="text-nowrap">
          <span className="hover:underline cursor-pointer">
            {format(product?.inventory?.production || 0)} {product?.unit}
          </span>
        </Link>
      ),
    },
    {
      key: "transit",
      label: "En tránsito",
      render: (product) => (
        <Link href={`/products/${product.id}`} className="text-nowrap">
          <span className="hover:underline cursor-pointer">
            {format(product?.inventory?.transit || 0)} {product?.unit}
          </span>
        </Link>
      ),
    },
    {
      key: "netAvailable",
      label: "Disponible neto",
      render: (product) => (
        <Link href={`/products/${product.id}`} className="text-nowrap">
          <span className="hover:underline cursor-pointer">
            {format(product?.inventory?.netAvailable || 0)} {product?.unit}
          </span>
        </Link>
      ),
    },
  ];

  const onInventoryModeChange = (key) => {
    setInventoryMode(key);
    setPagination({ page: 1, pageSize: 10 });
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-xl lg:text-3xl">Inventario</h1>
      <EntityFilters
        search={search}
        setSearch={setSearch}
        pathname="/new-product"
      >
        <Select
          className="w-full sm:w-48"
          size="sm"
          items={linesList.options}
          isLoading={linesList.isLoading}
          onLoadMore={linesList.onLoadMore}
          label="Línea"
          placeholder="Seleccionar línea"
          selectedKeys={selectedLine ? [selectedLine] : []}
          onChange={(e) => {
            setSelectedLine(e.target.value);
            setSelectedCollections(new Set());
          }}
          onSelectionChange={(keys) => {
            const key = Array.from(keys)[0];
            setSelectedLine(key);
            setSelectedCollections(new Set());
          }}
        >
          {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
        </Select>

        <Select
          className="w-full sm:w-48"
          size="sm"
          items={collectionsList.options}
          isLoading={collectionsList.isLoading}
          onLoadMore={collectionsList.onLoadMore}
          label="Colección"
          placeholder="Seleccionar colección"
          selectionMode="multiple"
          selectedKeys={selectedCollections}
          onSelectionChange={setSelectedCollections}
          isDisabled={!selectedLine}
        >
          {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
        </Select>
      </EntityFilters>
      <InventoryMode
        inventoryMode={inventoryMode}
        onSelectionChange={onInventoryModeChange}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />
      <Entities
        entities={products}
        columns={columns}
        pagination={pagination}
        setPagination={setPagination}
        pageCount={pageCount}
        loading={isFetching}
      />
      <BulkProductUploader onSync={handleBulkSync} isSyncing={syncing} />
    </div>
  );
}
