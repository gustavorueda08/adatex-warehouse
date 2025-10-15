"use client";

import { useState, useEffect } from "react";
import { useProducts } from "@/lib/hooks/useProducts";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import Table from "@/components/ui/Table";
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  CubeIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

export default function ProductsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const debouncedSearch = useDebouncedValue(search, 300);

  // Reset page cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeFilter]);

  // Construir filtros
  const buildFilters = () => {
    const filters = {};

    if (activeFilter !== "all") {
      filters.isActive = activeFilter === "active";
    }

    return filters;
  };

  const { products, loading, pagination } = useProducts({
    pagination: { page: currentPage, pageSize: 25 },
    sort: ["name:asc"],
    filters: buildFilters(),
    q: debouncedSearch || undefined,
  });

  // Columnas de la tabla
  const productColumns = [
    {
      key: "code",
      label: "Código",
      render: (_, product) => (
        <div>
          <div className="text-white font-medium font-mono">{product.code}</div>
          {product.barcode && (
            <div className="text-xs text-gray-400 font-mono">
              {product.barcode}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "name",
      label: "Producto",
      render: (_, product) => (
        <div className="max-w-md">
          <div className="text-white font-medium">{product.name}</div>
          {product.description && (
            <div className="text-xs text-gray-400 truncate">
              {product.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "unit",
      label: "Unidad",
      render: (_, product) => (
        <span className="text-white">{product.unit || "-"}</span>
      ),
    },
    {
      key: "unitsPerPackage",
      label: "Unid/Paquete",
      render: (_, product) => (
        <span className="text-white">
          {product.unitsPerPackage || "-"}
        </span>
      ),
    },
    {
      key: "isActive",
      label: "Estado",
      render: (_, product) => (
        <div className="flex items-center gap-2">
          {product.isActive ? (
            <>
              <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-900 text-emerald-300">
                Activo
              </span>
            </>
          ) : (
            <>
              <XCircleIcon className="w-4 h-4 text-red-400" />
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-900 text-red-300">
                Inactivo
              </span>
            </>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Fecha Creación",
      render: (_, product) => (
        <div className="text-sm text-gray-400">
          {new Date(product.createdAt).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Productos</h1>
          <p className="text-gray-400">
            Gestiona el catálogo de productos de tu inventario
          </p>
        </div>
        {/* Botón para crear nuevo producto - puedes implementar esto después */}
        {/* <Link href="/new-product">
          <Button variant="emerald" className="flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Nuevo Producto
          </Button>
        </Link> */}
      </div>

      {/* Estadísticas rápidas */}
      {pagination && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Productos</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {pagination.total || 0}
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
                  <p className="text-sm text-gray-400">Productos Activos</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">
                    {products.filter((p) => p.isActive).length}
                  </p>
                </div>
                <CheckCircleIcon className="w-10 h-10 text-emerald-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Productos Inactivos</p>
                  <p className="text-2xl font-bold text-red-400 mt-1">
                    {products.filter((p) => !p.isActive).length}
                  </p>
                </div>
                <XCircleIcon className="w-10 h-10 text-red-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Busca y filtra productos por nombre, código o estado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Búsqueda */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Buscar
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  input={search}
                  setInput={setSearch}
                  placeholder="Buscar por nombre, código o barcode..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtro de estado */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Estado
              </label>
              <div className="flex gap-2">
                <Button
                  variant={activeFilter === "all" ? "emerald" : "gray"}
                  onClick={() => setActiveFilter("all")}
                  className="flex-1"
                >
                  Todos
                </Button>
                <Button
                  variant={activeFilter === "active" ? "emerald" : "gray"}
                  onClick={() => setActiveFilter("active")}
                  className="flex-1"
                >
                  Activos
                </Button>
                <Button
                  variant={activeFilter === "inactive" ? "emerald" : "gray"}
                  onClick={() => setActiveFilter("inactive")}
                  className="flex-1"
                >
                  Inactivos
                </Button>
              </div>
            </div>
          </div>

          {(search || activeFilter !== "all") && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                {products.length} producto(s) encontrado(s)
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setActiveFilter("all");
                }}
                className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de productos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
          <CardDescription>
            Haz clic en un producto para ver su detalle e inventario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table
            data={products}
            columns={productColumns}
            loading={loading}
            emptyMessage="No se encontraron productos"
            getDetailPath={(product) => `/products/${product.documentId}`}
            canViewRow={() => true}
            getRowId={(product) => product.documentId}
            pagination={pagination}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
