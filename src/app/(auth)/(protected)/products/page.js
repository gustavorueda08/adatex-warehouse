"use client";

import { useProducts } from "@/lib/hooks/useProducts";
import EntityListPage from "@/components/entities/EntityListPage";
import { useProductListConfig } from "@/lib/config/productConfigs";
import toast from "react-hot-toast";
import ExportItemsModal from "@/components/products/ExportItemsModal";
import { exportItemsToExcel } from "@/lib/utils/exportItemsToExcel";
import React, { useCallback, useMemo, useState } from "react";
import Entities from "@/components/entities/Entities";
import Link from "next/link";
import format from "@/lib/utils/format";
import EntityFilters from "@/components/entities/EntityFilters";
import { Button, Checkbox, Select, SelectItem } from "@heroui/react";
import { getLocalTimeZone, today } from "@internationalized/date";
import InventoryMode from "@/components/entities/InventoryMode";
import { useEntityList } from "@/lib/hooks/useEntityList";
import BulkProductUploader from "@/components/products/BulkProductUploader";
import { exportProductsTemplate } from "@/lib/utils/exportProductsTemplate";
import { exportInventory } from "@/lib/utils/exportInventory";
import ExportInventoryModal from "@/components/products/ExportInventoryModal";
import BreakdownModal from "@/components/products/BreakdownModal";

export default function ProductsPage() {
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
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
  const [hideProductsWithoutStock, setHideProductsWithoutStock] =
    useState(false);
  const [breakdownModal, setBreakdownModal] = useState({
    isOpen: false,
    productName: "",
    unit: "",
    category: "",
    entries: [],
  });

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportingInventory, setExportingInventory] = useState(false);

  const hasBreakdown = useCallback(
    (product, category) =>
      (product?.inventory?.breakdown?.[category]?.length ?? 0) > 0,
    [],
  );

  const handleCategoryClick = useCallback((product, category) => {
    const entries = product?.inventory?.breakdown?.[category];
    if (!entries || entries.length === 0) return;
    setBreakdownModal({
      isOpen: true,
      productName: product.name,
      unit: product.unit || "",
      category,
      entries,
    });
  }, []);
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
      setPagination({ ...pagination, page: 1 });
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

    if (selectedCollections.size > 0) {
      f.collections = { id: { $in: Array.from(selectedCollections) } };
    } else if (selectedLine) {
      f.collections = { line: { id: { $eq: selectedLine } } };
    }

    return f;
  }, [search, selectedLine, selectedCollections]);
  const dateParams = useMemo(() => {
    if (inventoryMode === "standard") return {};
    if (inventoryMode === "historical") {
      if (!selectedDate) return {};
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

  const handleExportInventory = async (exportType) => {
    setExportingInventory(true);
    try {
      await exportInventory({
        localProducts: products,
        filters,
        inventoryMode,
        dateParams,
        exportType,
        toast: {
          loading: (msg) => toast.loading(msg),
          success: (msg) => toast.success(msg),
          error: (msg) => toast.error(msg),
          dismiss: (id) => toast.dismiss(id),
        },
      });
      setIsExportModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setExportingInventory(false);
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
      render: (product) => {
        const hasData = hasBreakdown(product, "reserved");
        return (
          <span
            className={`text-nowrap ${
              hasData ? "text-primary cursor-pointer hover:underline" : ""
            }`}
            onClick={
              hasData
                ? (e) => {
                    e.preventDefault();
                    handleCategoryClick(product, "reserved");
                  }
                : undefined
            }
          >
            {format(product?.inventory?.reserved || 0)} {product?.unit}
          </span>
        );
      },
    },
    ...(inventoryMode === "projection"
      ? [
          {
            key: "arriving",
            label: "Llegando",
            render: (product) => {
              const hasData = hasBreakdown(product, "arriving");
              return (
                <span
                  className={`text-nowrap ${
                    hasData ? "text-primary cursor-pointer hover:underline" : ""
                  }`}
                  onClick={
                    hasData
                      ? (e) => {
                          e.preventDefault();
                          handleCategoryClick(product, "arriving");
                        }
                      : undefined
                  }
                >
                  {format(product?.inventory?.arriving || 0)} {product?.unit}
                </span>
              );
            },
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
      render: (product) => {
        const hasData = hasBreakdown(product, "required");
        return (
          <span
            className={`text-nowrap ${
              hasData ? "text-primary cursor-pointer hover:underline" : ""
            }`}
            onClick={
              hasData
                ? (e) => {
                    e.preventDefault();
                    handleCategoryClick(product, "required");
                  }
                : undefined
            }
          >
            {format(product?.inventory?.required || 0)} {product?.unit}
          </span>
        );
      },
    },
    {
      key: "production",
      label: "En Producción",
      render: (product) => {
        const hasData = hasBreakdown(product, "production");
        return (
          <span
            className={`text-nowrap ${
              hasData ? "text-primary cursor-pointer hover:underline" : ""
            }`}
            onClick={
              hasData
                ? (e) => {
                    e.preventDefault();
                    handleCategoryClick(product, "production");
                  }
                : undefined
            }
          >
            {format(product?.inventory?.production || 0)} {product?.unit}
          </span>
        );
      },
    },
    {
      key: "transit",
      label: "En tránsito",
      render: (product) => {
        const hasData = hasBreakdown(product, "transit");
        return (
          <span
            className={`text-nowrap ${
              hasData ? "text-primary cursor-pointer hover:underline" : ""
            }`}
            onClick={
              hasData
                ? (e) => {
                    e.preventDefault();
                    handleCategoryClick(product, "transit");
                  }
                : undefined
            }
          >
            {format(product?.inventory?.transit || 0)} {product?.unit}
          </span>
        );
      },
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
        {/*
          <Checkbox
          isSelected={hideProductsWithoutStock}
          onValueChange={setHideProductsWithoutStock}
            >
          Ocultar productos sin stock
        </Checkbox>
          */}
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
        loading={loading || isFetching}
      />
      <div className="flex lg:justify-end justify-center">
        <Button
          color="secondary"
          className="w-full lg:w-auto"
          onPress={() => setIsExportModalOpen(true)}
        >
          Descargar Inventario
        </Button>
      </div>
      <BulkProductUploader
        onSync={handleBulkSync}
        isSyncing={syncing}
        onDownloadTemplate={() =>
          exportProductsTemplate({
            toast: {
              loading: (msg) => toast.loading(msg),
              success: (msg) => toast.success(msg),
              error: (msg) => toast.error(msg),
              dismiss: (id) => toast.dismiss(id),
            },
          })
        }
      />
      <BreakdownModal
        isOpen={breakdownModal.isOpen}
        onClose={() =>
          setBreakdownModal((prev) => ({ ...prev, isOpen: false }))
        }
        productName={breakdownModal.productName}
        unit={breakdownModal.unit}
        category={breakdownModal.category}
        entries={breakdownModal.entries}
      />
      <ExportInventoryModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={handleExportInventory}
        loading={exportingInventory}
      />
    </div>
  );
}
