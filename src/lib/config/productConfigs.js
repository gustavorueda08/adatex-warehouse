"use client";

import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import BulkProductUploader from "@/components/products/BulkProductUploader";
import ProductItemsTable from "@/components/products/ProductItemsTable";
import Card, {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import format from "@/lib/utils/format";
import Table from "@/components/ui/Table";
import { useCollections } from "@/lib/hooks/useCollections";
import { useUser } from "@/lib/hooks/useUser";
import { exportInventoryToExcel } from "@/lib/utils/exportInventoryToExcel";
import { exportItemsToExcel } from "@/lib/utils/exportItemsToExcel";

export function useProductListConfig({ bulkProps = {}, onExportItems } = {}) {
  const { user } = useUser();

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
    columnCustomization: {
      enabled: true,
      localStorageKey: "productColumnPreferences",
    },
    populate: ["collections"],
    filterConfig: {
      hook: useCollections,
      labelField: "name",
      valueField: "id",
      queryField: "collections",
      label: "Colecciones",
      useSelect: true,
    },
    populate: ["collections"],
    columns: [
      {
        key: "code",
        label: "Código | Barcode",
        render: (_, product) => `${product.code} | ${product.barcode}`,
        getValue: (product) => `${product.code} | ${product.barcode || ""}`,
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
        getValue: (product) => product.name,
      },
      {
        key: "unit",
        label: "Unidad",
        render: (_, product) => (
          <span className="text-white">{product.unit || "-"}</span>
        ),
        getValue: (product) => product.unit || "-",
      },
      {
        key: "unitsPerPackage",
        label: "Unid/Paquete",
        render: (_, product) => (
          <span className="text-white">{product.unitsPerPackage || "-"}</span>
        ),
        getValue: (product) => product.unitsPerPackage || "-",
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
        getValue: (product) => product.inventory?.stock ?? 0,
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
        getValue: (product) => product.inventory?.reserved ?? 0,
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
        getValue: (product) => product.inventory?.available ?? 0,
      },
      {
        key: "required",
        label: "Pendiente",
        render: (_, product) => {
          const val = product.inventory?.required;
          if (val === undefined || val === null) return "-";
          return (
            <span className="text-white font-bold text-emerald-400">
              {format(val)} {product.unit}
            </span>
          );
        },
        getValue: (product) => product.inventory?.required ?? 0,
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
        getValue: (product) => product.inventory?.production ?? 0,
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
        getValue: (product) => product.inventory?.transit ?? 0,
      },
      {
        key: "netAvailable",
        label: "Disponible Neto",
        render: (_, product) => {
          const val = product.inventory?.netAvailable;
          if (val === undefined || val === null) return "-";
          return (
            <span className="text-white">
              {format(val)} {product.unit}
            </span>
          );
        },
        getValue: (product) => product.inventory?.netAvailable ?? 0,
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

    getDetailPath: (product) => `/products/${product.id}`,

    getCustomActions: ({ helpers }) => {
      const user = helpers.user;
      const actions = [];

      // Admin Only Actions
      if (user?.type === "admin") {
        actions.push({
          label: "Sincronizar con Siigo",
          variant: "zinc",
          onClick: async () => {
            const result = await Swal.fire({
              title: "¿Sincronizar con Siigo?",
              text: "Esto actualizará todos los productos desde Siigo. Puede tardar unos minutos.",
              icon: "warning",
              showCancelButton: true,
              confirmButtonText: "Sí, sincronizar",
              cancelButtonText: "Cancelar",
              confirmButtonColor: "#10b981", // emerald-500
              background: "#18181b", // zinc-950
              color: "#fff",
            });

            if (result.isConfirmed) {
              helpers.syncAllProductsFromSiigo();
            }
          },
          loading: helpers.syncing,
        });
      }

      // Actions for all users
      actions.push({
        label: "Exportar Inventario (Excel)",
        variant: "cyan",
        onClick: async () => {
          const result = await Swal.fire({
            title: "¿Exportar Inventario?",
            text: "Se generará un reporte Excel con el inventario actual filtrado y las columnas visibles.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, exportar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#06b6d4", // cyan-500
            background: "#18181b", // zinc-950
            color: "#fff",
          });

          if (!result.isConfirmed) return;

          await exportInventoryToExcel({
            filters: helpers.filters,
            columns: helpers.columns,
            toast: helpers.toast,
          });
        },
      });

      actions.push({
        label: "Exportar Detalle (Items)",
        variant: "zinc", // Different color to distinguish
        onClick: async () => {
          const result = await Swal.fire({
            title: "¿Exportar Detalle?",
            text: "Se generará un reporte detallado con todos los items (rollos/unidades) de los productos filtrados.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, exportar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#3f3f46", // zinc-700
            background: "#18181b", // zinc-950
            color: "#fff",
          });

          if (!result.isConfirmed) return;

          if (onExportItems) {
            onExportItems(helpers.filters);
          } else {
            await exportItemsToExcel({
              filters: helpers.filters,
              toast: helpers.toast,
            });
          }
        },
      });

      return actions;
    },

    customSections:
      user?.type === "admin"
        ? [
            {
              render: () => (
                <div className="space-y-4">
                  <BulkProductUploader
                    onFileLoaded={bulkProps.onFileLoaded}
                    onClear={bulkProps.onClear}
                  />

                  {bulkProps.bulkProducts &&
                    bulkProps.bulkProducts.length > 0 && (
                      <Card className="border border-emerald-700/50 bg-emerald-900/20">
                        <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <p className="text-white font-semibold">
                              Enviar lista masiva
                            </p>
                            <p className="text-sm text-gray-300">
                              {bulkProps.bulkProducts.length} productos listos
                              desde el archivo cargado.
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
          ]
        : [],
  };
}

export function createProductDetailConfig({
  product,
  items = [],
  salesHistory = [],
  updateProduct,
  router,
  updating,
  loading,
  warehouses = [],
  warehouseFilter,
  setWarehouseFilter,
  sortOrder,
  setSortOrder,
  onExportClick,
}) {
  return {
    title: product?.name || "Detalle de Producto",
    entityType: "product",
    loading,
    onSubmit: async (data) => {
      // Strapi v5 uses documentId for updates, v4 uses id.
      // Prefer documentId if available.
      const idToUpdate = product.documentId || product.id;
      await updateProduct(idToUpdate, data);
    },
    fields: [
      {
        name: "name",
        label: "Nombre del Producto",
        type: "text",
        required: true,
      },
      {
        name: "code",
        label: "Código",
        type: "text",
        required: true,
      },
      {
        name: "barcode",
        label: "Código de Barras",
        type: "text",
      },
      {
        name: "unit",
        label: "Unidad",
        type: "select",
        options: [
          { label: "m", value: "m" },
          { label: "und", value: "und" },
          { label: "kg", value: "kg" },
        ],
        required: true,
      },
      {
        name: "description",
        label: "Descripción",
        type: "textarea",
        fullWidth: true,
        rows: 3,
      },
    ],
    customSections: [
      {
        title: "Items en Inventario",
        render: () => (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-zinc-900 p-4 rounded-lg border border-zinc-800">
              <div className="flex flex-1 gap-4 w-full md:w-auto">
                {/* Warehouse Filter */}
                <div className="w-full md:w-64 flex flex-row items-center justify-between">
                  <Select
                    label="Filtrar por Bodega"
                    multiple={true}
                    options={warehouses.map((w) => ({
                      label: w.name,
                      value: w.id,
                    }))}
                    value={warehouseFilter || []}
                    onChange={(val) => setWarehouseFilter(val)}
                    placeholder="Todas las bodegas"
                    hasMenu={false}
                  />
                </div>

                {/* Sort Order */}
                <div className="w-full md:w-64">
                  <label className="text-xs text-zinc-500 mb-1 block">
                    Ordenar por Cantidad
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() =>
                        setSortOrder((prev) =>
                          prev === "currentQuantity:asc"
                            ? ""
                            : "currentQuantity:asc"
                        )
                      }
                      variant={
                        sortOrder === "currentQuantity:asc" ? "emerald" : "zinc"
                      }
                      className="flex-1"
                    >
                      Ascendente
                    </Button>
                    <Button
                      type="button"
                      onClick={() =>
                        setSortOrder((prev) =>
                          prev === "currentQuantity:desc"
                            ? ""
                            : "currentQuantity:desc"
                        )
                      }
                      variant={
                        sortOrder === "currentQuantity:desc"
                          ? "emerald"
                          : "zinc"
                      }
                      className="flex-1"
                    >
                      Descendente
                    </Button>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-auto flex justify-end">
                <Button
                  type="button"
                  variant="emerald"
                  onClick={onExportClick}
                  className="flex items-center gap-2"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  Exportar Excel
                </Button>
              </div>
            </div>

            <ProductItemsTable items={items} product={product} />
          </div>
        ),
      },
      {
        title: "Historial de Ventas",
        render: () => {
          // If no sales history passed, don't crash
          const history = salesHistory || [];

          return (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Historial de Ventas (Últimos 50)</CardTitle>
                <CardDescription>
                  Ventas confirmadas o completadas que incluyen este producto.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table
                  data={history}
                  columns={[
                    {
                      header: "Fecha",
                      key: "createdAt",
                      render: (order) =>
                        moment(order.createdAt).format("DD/MM/YYYY HH:mm"),
                    },
                    {
                      header: "Cliente",
                      key: "customer",
                      render: (order) => {
                        const customer = order.customer;
                        if (!customer) return "-";
                        return `${customer.name} ${customer.lastName || ""}`;
                      },
                    },
                    {
                      header: "Código Orden",
                      key: "code",
                      render: (order) => (
                        <span className="font-mono text-xs">
                          {order.code || order.documentNumber}
                        </span>
                      ),
                    },
                    {
                      header: "Factura",
                      key: "invoice",
                      render: (order) => {
                        // Logic to show invoice info if available
                        const inv =
                          order.invoiceLabel || order.invoiceNumber || "-";
                        return <span className="text-zinc-400">{inv}</span>;
                      },
                    },
                    {
                      header: "Cant. Despachada",
                      key: "qty",
                      render: (order) => {
                        // Find the item corresponding to THIS product
                        const item = order.items?.find((i) => {
                          const pId = i.product?.id || i.product;
                          // Compare with current product.id (handle strings/numbers)
                          return String(pId) === String(product.id);
                        });
                        if (!item) return "-";
                        return (
                          <span className="font-bold text-emerald-400">
                            {format(item.quantity || 0)} {product.unit}
                          </span>
                        );
                      },
                    },
                  ]}
                />
              </CardContent>
            </Card>
          );
        },
      },
    ],
  };
}
