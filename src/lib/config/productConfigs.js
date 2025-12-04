"use client";

import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import * as XLSX from "xlsx";
import BulkProductUploader from "@/components/products/BulkProductUploader";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import format from "@/lib/utils/format";

export function createProductListConfig({ bulkProps = {} } = {}) {
  return {
    title: "Productos",
    description: "Gestiona el catálogo de productos de tu inventario",
    entityName: "producto",
    entityNamePlural: "productos",
    createPath: "/new-product",
    searchPlaceholder: "Buscar por nombre, código o barcode...",
    searchFields: ["name", "code", "barcode", "unit"],
    selectable: false,
    hookOptions: {
      withInventory: true,
    },

    columns: [
      {
        key: "code",
        label: "Código | Barcode",
        render: (_, product) => `${product.code} | ${product.barcode}`,
      },
      {
        key: "name",
        label: "Producto",
        className: "min-w-[300px]",
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
        key: "stock",
        label: "Cantidad en Stock",
        render: (_, product) => {
          const val = product.inventory?.stock;
          if (val === undefined || val === null) return "-";
          return (
            <span className="text-white">
              {format(val)} {product.unit}
            </span>
          );
        },
      },
      {
        key: "reserved",
        label: "Reservado",
        render: (_, product) => {
          const val = product.inventory?.reserved;
          if (val === undefined || val === null) return "-";
          return (
            <span className="text-white">
              {format(val)} {product.unit}
            </span>
          );
        },
      },
      {
        key: "available",
        label: "Disponible",
        render: (_, product) => {
          const val = product.inventory?.available;
          if (val === undefined || val === null) return "-";
          return (
            <span className="text-white font-bold text-emerald-400">
              {format(val)} {product.unit}
            </span>
          );
        },
      },
      {
        key: "production",
        label: "En Producción",
        render: (_, product) => {
          const val = product.inventory?.production;
          if (val === undefined || val === null) return "-";
          return (
            <span className="text-white">
              {format(val)} {product.unit}
            </span>
          );
        },
      },
      {
        key: "transit",
        label: "En Transito",
        render: (_, product) => {
          const val = product.inventory?.transit;
          if (val === undefined || val === null) return "-";
          return (
            <span className="text-white">
              {format(val)} {product.unit}
            </span>
          );
        },
      },
      {
        key: "defective",
        label: "Defectuoso",
        render: (_, product) => {
          const val = product.inventory?.defective;
          if (val === undefined || val === null) return "-";
          return (
            <span className="text-white">
              {format(val)} {product.unit}
            </span>
          );
        },
      },
    ],

    getDetailPath: (product) => `/products/${product.documentId}`,

    getCustomActions: ({ helpers }) => [
      {
        label: "Sincronizar con Siigo",
        variant: "zinc",
        onClick: () => helpers.syncAllProductsFromSiigo(),
        loading: helpers.syncing,
      },
      {
        label: "Descargar base en Excel",
        variant: "cyan",
        onClick: async () => {
          const toast = helpers.toast;
          const normalizeProduct = (product) => {
            if (!product) return {};
            const attributes = product.attributes || {};

            return {
              id: product.id ?? attributes.id,
              documentId:
                product.documentId ?? attributes.documentId ?? attributes.id,
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

          try {
            const pageSize = 200;
            let page = 1;
            let pageCount = 1;
            const allProducts = [];

            const loadingToast = toast.loading("Descargando productos...");

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
              pageData.forEach((product) =>
                allProducts.push(normalizeProduct(product))
              );

              const paginationData = result.meta?.pagination;
              pageCount = Math.max(paginationData?.pageCount || 1, page);
              page += 1;
            } while (page <= pageCount);

            if (allProducts.length === 0) {
              toast.dismiss(loadingToast);
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

            toast.dismiss(loadingToast);
            toast.success(
              `Descargados ${allProducts.length} productos en Excel`
            );
          } catch (error) {
            console.error("Error exportando productos:", error);
            toast.error(
              error.message || "No se pudo exportar la base de productos"
            );
          }
        },
      },
    ],

    customSections: [
      {
        render: () => (
          <div className="space-y-4">
            <BulkProductUploader
              onFileLoaded={bulkProps.onFileLoaded}
              onClear={bulkProps.onClear}
            />

            {bulkProps.bulkProducts && bulkProps.bulkProducts.length > 0 && (
              <Card className="border border-emerald-700/50 bg-emerald-900/20">
                <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-white font-semibold">
                      Enviar lista masiva
                    </p>
                    <p className="text-sm text-gray-300">
                      {bulkProps.bulkProducts.length} productos listos desde el
                      archivo cargado.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="zinc"
                      onClick={() => {
                        bulkProps.resetBulkUpload?.();
                        bulkProps.onClear();
                      }}
                    >
                      Limpiar
                    </Button>
                    <Button
                      variant="emerald"
                      className="flex items-center gap-2"
                      onClick={bulkProps.handleSendBulkList}
                      loading={bulkProps.sendingBulk}
                    >
                      <PaperAirplaneIcon className="w-4 h-4" />
                      Enviar lista masiva
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ),
      },
    ],
  };
}
