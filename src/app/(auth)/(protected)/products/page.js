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
import BulkProductUploader from "@/components/products/BulkProductUploader";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  CubeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import Link from "next/link";

export default function ProductsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [bulkProducts, setBulkProducts] = useState([]);
  const [resetBulkUpload, setResetBulkUpload] = useState(null);
  const [sendingBulk, setSendingBulk] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  // Reset page cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeFilter]);

  const { products, loading, pagination, syncAllProductsFromSiigo, syncing } =
    useProducts({
      pagination: { page: currentPage, pageSize: 25 },
      sort: ["name:asc"],
      filters: {
        ...(debouncedSearch
          ? {
              $or: [
                {
                  code: {
                    $containsi: debouncedSearch,
                  },
                },
                {
                  name: {
                    $containsi: debouncedSearch,
                  },
                },
                {
                  barcode: {
                    $containsi: debouncedSearch,
                  },
                },
              ],
            }
          : {}),
      },
    });

  const normalizeProduct = (product) => {
    if (!product) return {};
    const attributes = product.attributes || {};

    return {
      id: product.id ?? attributes.id,
      documentId: product.documentId ?? attributes.documentId ?? attributes.id,
      code: product.code ?? attributes.code,
      name: product.name ?? attributes.name,
      barcode: product.barcode ?? attributes.barcode,
      description: product.description ?? attributes.description,
      unit: product.unit ?? attributes.unit,
      unitsPerPackage:
        product.unitsPerPackage ?? attributes.unitsPerPackage ?? null,
      isActive: product.isActive ?? attributes.isActive ?? true,
      createdAt: product.createdAt ?? attributes.createdAt,
      updatedAt: product.updatedAt ?? attributes.updatedAt,
    };
  };

  const handleExportProducts = async () => {
    setExporting(true);
    try {
      const pageSize = 200;
      let page = 1;
      let pageCount = 1;
      const allProducts = [];

      do {
        const response = await fetch(
          `/api/strapi/products?pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=name:asc`
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error?.message ||
              result.message ||
              `Error ${response.status}: ${response.statusText}`
          );
        }

        const pageData = Array.isArray(result.data) ? result.data : [];
        pageData.forEach((product) => allProducts.push(normalizeProduct(product)));

        const paginationData = result.meta?.pagination;
        pageCount = Math.max(paginationData?.pageCount || 1, page);
        page += 1;
      } while (page <= pageCount);

      if (allProducts.length === 0) {
        toast.error("No hay productos para exportar");
        return;
      }

      const formatDate = (value) => {
        const date = value ? new Date(value) : null;
        return date && !Number.isNaN(date.getTime())
          ? date.toLocaleString("es-ES")
          : "";
      };

      const exportRows = allProducts.map((product) => ({
        Codigo: product.code || "-",
        Nombre: product.name || "-",
        Unidad: product.unit || "-",
        "Unidades por paquete": product.unitsPerPackage ?? "",
        Barcode: product.barcode || "",
        Descripcion: product.description || "",
        Estado: product.isActive ? "Activo" : "Inactivo",
        "Creado el": formatDate(product.createdAt),
        "Actualizado el": formatDate(product.updatedAt),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");
      const fileName = `productos-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success(`Descargados ${allProducts.length} productos en Excel`);
    } catch (error) {
      console.error("Error exportando productos:", error);
      toast.error(
        error.message || "No se pudo exportar la base de productos"
      );
    } finally {
      setExporting(false);
    }
  };

  const handleBulkUploadLoaded = (data, removeCallback) => {
    setBulkProducts(data || []);
    setResetBulkUpload(() => removeCallback);
  };

  const handleBulkUploadCleared = () => {
    setBulkProducts([]);
    setResetBulkUpload(null);
  };

  const handleSendBulkList = async () => {
    if (!bulkProducts.length) {
      toast.error("Primero carga un archivo de productos");
      return;
    }

    setSendingBulk(true);
    try {
      console.log("Lista masiva de productos lista para envío:", bulkProducts);
      toast.success(
        "Lista preparada para enviar. Conecta aquí tu petición masiva."
      );
    } catch (error) {
      console.error("Error preparando el envío masivo:", error);
      toast.error("No se pudo preparar el envío masivo");
    } finally {
      setSendingBulk(false);
    }
  };

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
        <span className="text-white">{product.unitsPerPackage || "-"}</span>
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
        <Link href="/new-product">
          <Button variant="emerald" className="flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Nuevo Producto
          </Button>
        </Link>
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
          </div>

          {search && (
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

      <Card>
        <CardHeader>
          <CardTitle>Acciones</CardTitle>
          <CardDescription>
            Sincroniza el catálogo o descárgalo completo en Excel
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row md:items-center gap-3">
          <Button
            className="flex items-center gap-2"
            loading={syncing}
            onClick={() => syncAllProductsFromSiigo()}
          >
            Sincronizar con Siigo
          </Button>
          <Button
            variant="cyan"
            className="flex items-center gap-2"
            loading={exporting}
            onClick={handleExportProducts}
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Descargar base en Excel
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <BulkProductUploader
          onFileLoaded={handleBulkUploadLoaded}
          onClear={handleBulkUploadCleared}
        />

        {bulkProducts.length > 0 && (
          <Card className="border border-emerald-700/50 bg-emerald-900/20">
            <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-white font-semibold">Enviar lista masiva</p>
                <p className="text-sm text-gray-300">
                  {bulkProducts.length} productos listos desde el archivo
                  cargado.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="zinc"
                  onClick={() => {
                    resetBulkUpload?.();
                    handleBulkUploadCleared();
                  }}
                >
                  Limpiar
                </Button>
                <Button
                  variant="emerald"
                  className="flex items-center gap-2"
                  onClick={handleSendBulkList}
                  loading={sendingBulk}
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                  Enviar lista masiva
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
