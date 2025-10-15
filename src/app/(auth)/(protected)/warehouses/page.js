"use client";
import { useInventory } from "@/lib/hooks/useInventory";
import React, { useState, useMemo } from "react";
import Table from "@/components/ui/Table";
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CubeIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

export default function WarehousesPage() {
  const { inventory, loading, entities, error } = useInventory(
    {
      filters: {
        type: "by-warehouse",
      },
    },
    {}
  );

  // Debug: Ver la estructura de datos
  console.log("Warehouse Debug:", {
    inventory,
    entities,
    loading,
    error,
    hasInventory: !!inventory,
    inventoryLength: inventory?.length,
    hasEntities: !!entities,
    entitiesLength: entities?.length,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [selectedWarehouseType, setSelectedWarehouseType] = useState("all");

  // Opciones de filtro
  const warehouseOptions = useMemo(() => {
    if (!inventory) return [{ label: "Todas las bodegas", value: "all" }];

    const options = inventory.map((item) => ({
      label: item.warehouse.name,
      value: item.warehouse.code,
    }));

    return [{ label: "Todas las bodegas", value: "all" }, ...options];
  }, [inventory]);

  const warehouseTypeOptions = [
    { label: "Todos los tipos", value: "all" },
    { label: "Tránsito", value: "transit" },
    { label: "Producción", value: "production" },
    { label: "Stock", value: "stock" },
    { label: "PrintLab", value: "printlab" },
  ];

  // Filtrar inventario
  const filteredInventory = useMemo(() => {
    if (!inventory) return [];

    return inventory.filter((item) => {
      // Filtro por bodega seleccionada
      if (
        selectedWarehouse !== "all" &&
        item.warehouse.code !== selectedWarehouse
      ) {
        return false;
      }

      // Filtro por tipo de bodega
      if (
        selectedWarehouseType !== "all" &&
        item.warehouse.type !== selectedWarehouseType
      ) {
        return false;
      }

      // Filtro por búsqueda de texto
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        const matchWarehouse = item.warehouse.name.toLowerCase().includes(search);
        const matchCode = item.warehouse.code.toLowerCase().includes(search);
        const matchProducts = item.products.some(
          (p) =>
            p.name.toLowerCase().includes(search) ||
            p.code.toLowerCase().includes(search) ||
            p.barcode?.toLowerCase().includes(search)
        );
        return matchWarehouse || matchCode || matchProducts;
      }

      return true;
    });
  }, [inventory, selectedWarehouse, selectedWarehouseType, searchTerm]);

  // Estadísticas globales
  const globalStats = useMemo(() => {
    if (!inventory) return null;

    const stats = {
      totalWarehouses: inventory.length,
      totalProducts: 0,
      totalItems: 0,
      totalAvailableItems: 0,
      totalReservedItems: 0,
      activeWarehouses: 0,
    };

    inventory.forEach((item) => {
      stats.totalProducts += item.products.length;
      stats.totalItems += item.summary?.totalItems || 0;
      stats.totalAvailableItems += item.summary?.totalAvailableItems || 0;
      stats.totalReservedItems += item.summary?.totalReservedItems || 0;
      if (item.warehouse.isActive) stats.activeWarehouses++;
    });

    return stats;
  }, [inventory]);

  // Columnas de la tabla principal
  const warehouseColumns = [
    {
      key: "name",
      label: "Bodega",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <BuildingStorefrontIcon className="w-5 h-5 text-emerald-500" />
          <div>
            <div className="font-semibold text-white">{row.warehouse.name}</div>
            <div className="text-xs text-gray-400">{row.warehouse.code}</div>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      label: "Tipo",
      render: (_, row) => {
        const typeColors = {
          transit: "bg-blue-900 text-blue-300",
          production: "bg-purple-900 text-purple-300",
          stock: "bg-emerald-900 text-emerald-300",
          printlab: "bg-orange-900 text-orange-300",
        };
        const typeLabels = {
          transit: "Tránsito",
          production: "Producción",
          stock: "Stock",
          printlab: "PrintLab",
        };
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              typeColors[row.warehouse.type] || "bg-gray-700 text-gray-300"
            }`}
          >
            {typeLabels[row.warehouse.type] || row.warehouse.type}
          </span>
        );
      },
    },
    {
      key: "products",
      label: "Productos",
      render: (_, row) => (
        <span className="text-white font-medium">{row.products.length}</span>
      ),
    },
    {
      key: "totalItems",
      label: "Items Totales",
      render: (_, row) => (
        <span className="text-white">
          {row.summary?.totalItems?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      key: "totalQuantity",
      label: "Cantidad Total",
      render: (_, row) => (
        <span className="text-white font-medium">
          {row.summary?.totalQuantity?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) || "0.00"}
        </span>
      ),
    },
    {
      key: "available",
      label: "Disponible",
      render: (_, row) => (
        <span className="text-emerald-400 font-medium">
          {row.summary?.totalAvailableQuantity?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) || "0.00"}
        </span>
      ),
    },
    {
      key: "reserved",
      label: "Reservado",
      render: (_, row) => (
        <span className="text-yellow-400">
          {row.summary?.totalReservedQuantity?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) || "0.00"}
        </span>
      ),
    },
  ];

  // Contenido expandido - productos por bodega
  const renderExpandedContent = (warehouse) => {
    if (!warehouse.products || warehouse.products.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <CubeIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No hay productos en esta bodega</p>
        </div>
      );
    }

    const productColumns = [
      {
        key: "code",
        label: "Código",
        render: (_, product) => (
          <div>
            <div className="text-white font-medium">{product.code}</div>
            <div className="text-xs text-gray-400">{product.barcode}</div>
          </div>
        ),
      },
      {
        key: "name",
        label: "Producto",
        render: (_, product) => (
          <div className="max-w-md">
            <div className="text-white truncate">{product.name}</div>
            {product.description && (
              <div className="text-xs text-gray-400 truncate">
                {product.description}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "items",
        label: "Items",
        render: (_, product) => (
          <span className="text-white">
            {product.items?.length || 0}
          </span>
        ),
      },
      {
        key: "totalQuantity",
        label: "Cantidad Total",
        render: (_, product) => (
          <div>
            <span className="text-white font-medium">
              {product.summary?.totalQuantity?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || "0.00"}
            </span>
            <span className="text-gray-400 text-xs ml-1">{product.unit}</span>
          </div>
        ),
      },
      {
        key: "available",
        label: "Disponible",
        render: (_, product) => (
          <span className="text-emerald-400 font-medium">
            {product.summary?.totalAvailableQuantity?.toLocaleString(
              undefined,
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            ) || "0.00"}
          </span>
        ),
      },
      {
        key: "reserved",
        label: "Reservado",
        render: (_, product) => (
          <span className="text-yellow-400">
            {product.summary?.totalReservedQuantity?.toLocaleString(
              undefined,
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            ) || "0.00"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Estado",
        render: (_, product) => (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              product.isActive
                ? "bg-emerald-900 text-emerald-300"
                : "bg-gray-700 text-gray-400"
            }`}
          >
            {product.isActive ? "Activo" : "Inactivo"}
          </span>
        ),
      },
    ];

    return (
      <div className="bg-neutral-800 rounded-lg p-4">
        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
          <CubeIcon className="w-5 h-5 text-emerald-500" />
          Productos en {warehouse.warehouse.name}
        </h4>
        <Table
          data={warehouse.products}
          columns={productColumns}
          loading={false}
          emptyMessage="No hay productos en esta bodega"
          hiddenHeader={false}
          getDetailPath={(product) => `/products/${product.documentId}`}
          canViewRow={() => true}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Inventario por Bodegas
        </h1>
        <p className="text-gray-400">
          Revisa el inventario distribuido en tus diferentes bodegas
        </p>
      </div>

      {/* Estadísticas globales */}
      {globalStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Bodegas Totales</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {globalStats.totalWarehouses}
                  </p>
                </div>
                <BuildingStorefrontIcon className="w-10 h-10 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Bodegas Activas</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">
                    {globalStats.activeWarehouses}
                  </p>
                </div>
                <BuildingStorefrontIcon className="w-10 h-10 text-emerald-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Productos Únicos</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {globalStats.totalProducts}
                  </p>
                </div>
                <CubeIcon className="w-10 h-10 text-purple-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Items Totales</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {globalStats.totalItems.toLocaleString()}
                  </p>
                </div>
                <ChartBarIcon className="w-10 h-10 text-orange-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Items Disponibles</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">
                    {globalStats.totalAvailableItems.toLocaleString()}
                  </p>
                </div>
                <ChartBarIcon className="w-10 h-10 text-emerald-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-emerald-500" />
            <CardTitle>Filtros</CardTitle>
          </div>
          <CardDescription>
            Filtra el inventario por bodega, tipo o búsqueda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Buscar
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  input={searchTerm}
                  setInput={setSearchTerm}
                  placeholder="Buscar por bodega, producto, código..."
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bodega
              </label>
              <Select
                options={warehouseOptions}
                value={selectedWarehouse}
                onChange={setSelectedWarehouse}
                placeholder="Selecciona una bodega"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipo de Bodega
              </label>
              <Select
                options={warehouseTypeOptions}
                value={selectedWarehouseType}
                onChange={setSelectedWarehouseType}
                placeholder="Selecciona un tipo"
              />
            </div>
          </div>

          {(searchTerm || selectedWarehouse !== "all" || selectedWarehouseType !== "all") && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                {filteredInventory.length} bodega(s) encontrada(s)
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedWarehouse("all");
                  setSelectedWarehouseType("all");
                }}
                className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de bodegas */}
      <Card>
        <CardHeader>
          <CardTitle>Bodegas</CardTitle>
          <CardDescription>
            Haz clic en una fila para ver los productos de cada bodega
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table
            data={filteredInventory}
            columns={warehouseColumns}
            loading={loading}
            emptyMessage="No se encontraron bodegas"
            renderExpandedContent={renderExpandedContent}
            canExpandRow={(row) => row.products && row.products.length > 0}
            getRowId={(row) => row.warehouse.documentId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
