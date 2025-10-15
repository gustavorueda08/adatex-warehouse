"use client";

import React, { useState, useMemo, useEffect } from "react";
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import Checkbox from "@/components/ui/Checkbox";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CubeIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  TruckIcon,
  CogIcon,
  PrinterIcon,
  ArchiveBoxIcon,
  PencilIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";
import moment from "moment";
import toast from "react-hot-toast";

export default function ProductDetailView({
  product,
  productData,
  inventoryByWarehouse,
  stats,
  loading,
  updateProduct,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [selectedItemStatus, setSelectedItemStatus] = useState("all");

  // Estados para edición
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Inicializar datos editables cuando cambia el producto
  useEffect(() => {
    if (product) {
      setEditedProduct({
        name: product.name || "",
        code: product.code || "",
        barcode: product.barcode || "",
        description: product.description || "",
        unit: product.unit || "",
        unitsPerPackage: product.unitsPerPackage || "",
        isActive: product.isActive ?? true,
      });
    }
  }, [product]);

  // Manejar guardado
  const handleSave = async () => {
    if (!editedProduct.name?.trim()) {
      toast.error("El nombre del producto es requerido");
      return;
    }

    if (!editedProduct.code?.trim()) {
      toast.error("El código del producto es requerido");
      return;
    }

    if (!editedProduct.unit?.trim()) {
      toast.error("La unidad del producto es requerida");
      return;
    }

    setIsSaving(true);

    try {
      const result = await updateProduct(product.id, {
        name: editedProduct.name.trim(),
        code: editedProduct.code.trim(),
        barcode: editedProduct.barcode?.trim() || null,
        description: editedProduct.description?.trim() || null,
        unit: editedProduct.unit.trim(),
        unitsPerPackage: editedProduct.unitsPerPackage
          ? parseInt(editedProduct.unitsPerPackage)
          : null,
        isActive: editedProduct.isActive,
      });

      if (result.success) {
        toast.success("Producto actualizado correctamente");
        setIsEditing(false);
      } else {
        toast.error(result.error?.message || "Error al actualizar el producto");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Error al actualizar el producto");
    } finally {
      setIsSaving(false);
    }
  };

  // Cancelar edición
  const handleCancel = () => {
    setEditedProduct({
      name: product.name || "",
      code: product.code || "",
      barcode: product.barcode || "",
      description: product.description || "",
      unit: product.unit || "",
      unitsPerPackage: product.unitsPerPackage || "",
      isActive: product.isActive ?? true,
    });
    setIsEditing(false);
  };

  // Opciones de filtro para bodegas
  const warehouseOptions = useMemo(() => {
    if (!inventoryByWarehouse) return [{ label: "Todas las bodegas", value: "all" }];

    const options = inventoryByWarehouse.map((item) => ({
      label: item.warehouse.name,
      value: item.warehouse.code,
    }));

    return [{ label: "Todas las bodegas", value: "all" }, ...options];
  }, [inventoryByWarehouse]);

  const itemStatusOptions = [
    { label: "Todos los estados", value: "all" },
    { label: "Disponible", value: "available" },
    { label: "Reservado", value: "reserved" },
    { label: "En Tránsito", value: "inTransit" },
    { label: "En Producción", value: "inProduction" },
    { label: "PrintLab", value: "printLab" },
  ];

  // Filtrar inventario por bodega
  const filteredInventory = useMemo(() => {
    if (!inventoryByWarehouse) return [];

    return inventoryByWarehouse.filter((item) => {
      // Filtro por bodega seleccionada
      if (
        selectedWarehouse !== "all" &&
        item.warehouse.code !== selectedWarehouse
      ) {
        return false;
      }

      // Filtro por búsqueda de texto
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        const matchWarehouse = item.warehouse.name.toLowerCase().includes(search);
        const matchCode = item.warehouse.code.toLowerCase().includes(search);
        return matchWarehouse || matchCode;
      }

      return true;
    });
  }, [inventoryByWarehouse, selectedWarehouse, searchTerm]);

  // Columnas de la tabla de bodegas
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
      key: "totalItems",
      label: "Items",
      render: (_, row) => (
        <span className="text-white font-medium">
          {row.stats.totalItems.toLocaleString()}
        </span>
      ),
    },
    {
      key: "totalQuantity",
      label: "Cantidad Total",
      render: (_, row) => (
        <div>
          <span className="text-white font-medium">
            {row.stats.totalQuantity.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="text-gray-400 text-xs ml-1">{product?.unit}</span>
        </div>
      ),
    },
    {
      key: "available",
      label: "Disponible",
      render: (_, row) => (
        <div>
          <div className="text-emerald-400 font-medium">
            {row.stats.availableQuantity.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            {product?.unit}
          </div>
          <div className="text-xs text-gray-400">
            {row.stats.availableItems} items
          </div>
        </div>
      ),
    },
    {
      key: "reserved",
      label: "Reservado",
      render: (_, row) => (
        <div>
          <div className="text-yellow-400 font-medium">
            {row.stats.reservedQuantity.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            {product?.unit}
          </div>
          <div className="text-xs text-gray-400">
            {row.stats.reservedItems} items
          </div>
        </div>
      ),
    },
    {
      key: "inTransit",
      label: "En Tránsito",
      render: (_, row) => (
        <div>
          <div className="text-blue-400 font-medium">
            {row.stats.inTransitQuantity.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            {product?.unit}
          </div>
          <div className="text-xs text-gray-400">
            {row.stats.inTransitItems} items
          </div>
        </div>
      ),
    },
  ];

  // Contenido expandido - items por bodega
  const renderExpandedContent = (warehouseData) => {
    // Filtrar items por estado si es necesario
    const filteredItems =
      selectedItemStatus === "all"
        ? warehouseData.items
        : warehouseData.items.filter((item) => item.state === selectedItemStatus);

    if (filteredItems.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <CubeIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No hay items con los filtros seleccionados</p>
        </div>
      );
    }

    const itemColumns = [
      {
        key: "itemNumber",
        label: "Número",
        render: (_, item) => (
          <span className="text-white font-mono">{item.itemNumber || "-"}</span>
        ),
      },
      {
        key: "lotNumber",
        label: "Lote",
        render: (_, item) => (
          <span className="text-white">{item.lotNumber || "-"}</span>
        ),
      },
      {
        key: "barcode",
        label: "Código de Barras",
        render: (_, item) => (
          <span className="text-gray-300 font-mono text-xs">
            {item.barcode || "-"}
          </span>
        ),
      },
      {
        key: "quantity",
        label: "Cantidad",
        render: (_, item) => (
          <div>
            <span className="text-white font-medium">
              {(item.currentQuantity || item.quantity || 0).toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </span>
            <span className="text-gray-400 text-xs ml-1">{product?.unit}</span>
          </div>
        ),
      },
      {
        key: "state",
        label: "Estado",
        render: (_, item) => {
          const stateConfig = {
            available: {
              color: "bg-emerald-900 text-emerald-300",
              label: "Disponible",
              icon: CheckCircleIcon,
            },
            reserved: {
              color: "bg-yellow-900 text-yellow-300",
              label: "Reservado",
              icon: ClockIcon,
            },
            inTransit: {
              color: "bg-blue-900 text-blue-300",
              label: "En Tránsito",
              icon: TruckIcon,
            },
            inProduction: {
              color: "bg-purple-900 text-purple-300",
              label: "En Producción",
              icon: CogIcon,
            },
            printLab: {
              color: "bg-orange-900 text-orange-300",
              label: "PrintLab",
              icon: PrinterIcon,
            },
          };

          const config =
            stateConfig[item.state] || stateConfig.available;

          const Icon = config.icon;

          return (
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
              >
                {config.label}
              </span>
            </div>
          );
        },
      },
      {
        key: "createdAt",
        label: "Fecha Creación",
        render: (_, item) => (
          <div className="text-sm text-gray-400">
            {item.createdAt
              ? moment(item.createdAt).format("DD/MM/YYYY HH:mm")
              : "-"}
          </div>
        ),
      },
    ];

    return (
      <div className="bg-neutral-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white font-semibold flex items-center gap-2">
            <CubeIcon className="w-5 h-5 text-emerald-500" />
            Items en {warehouseData.warehouse.name}
          </h4>
          <div className="text-sm text-gray-400">
            {filteredItems.length} item(s)
          </div>
        </div>
        <Table
          data={filteredItems}
          columns={itemColumns}
          loading={false}
          emptyMessage="No hay items en esta bodega"
          hiddenHeader={false}
          getRowId={(item) => item.id || item.documentId}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl text-white">Cargando producto...</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <div className="text-xl text-white">Producto no encontrado</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header - Información del Producto */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Información del Producto</CardTitle>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button
                  variant="emerald"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2"
                >
                  <PencilIcon className="w-4 h-4" />
                  Editar
                </Button>
              ) : (
                <>
                  <Button
                    variant="gray"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex items-center gap-2"
                  >
                    <ArrowUturnLeftIcon className="w-4 h-4" />
                    Cancelar
                  </Button>
                  <Button
                    variant="emerald"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2"
                  >
                    {isSaving ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!isEditing ? (
              // Vista de solo lectura
              <>
                <div className="flex items-start gap-3">
                  <CubeIcon className="w-8 h-8 text-emerald-500 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-white mb-2">
                      {product.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-3">
                      <span className="font-mono bg-neutral-700 px-2 py-1 rounded">
                        {product.code}
                      </span>
                      {product.barcode && (
                        <span className="font-mono bg-neutral-700 px-2 py-1 rounded">
                          {product.barcode}
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.isActive
                            ? "bg-emerald-900 text-emerald-300"
                            : "bg-red-900 text-red-300"
                        }`}
                      >
                        {product.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    {/* Fila horizontal con Unidad, Unidades/Paquete y Total Paquetes */}
                    <div className="flex flex-wrap gap-3">
                      <div className="bg-neutral-800 px-4 py-2 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">Unidad</p>
                        <p className="text-base font-bold text-white">
                          {product.unit}
                        </p>
                      </div>
                      {product.unitsPerPackage && (
                        <div className="bg-neutral-800 px-4 py-2 rounded-lg">
                          <p className="text-xs text-gray-400 mb-1">
                            Unidades/Paquete
                          </p>
                          <p className="text-base font-bold text-white">
                            {product.unitsPerPackage}
                          </p>
                        </div>
                      )}
                      {stats && stats.totalPackages > 0 && (
                        <div className="bg-neutral-800 px-4 py-2 rounded-lg">
                          <p className="text-xs text-gray-400 mb-1">
                            Total Paquetes
                          </p>
                          <p className="text-base font-bold text-white">
                            {stats.totalPackages.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {product.description && (
                  <div className="p-4 bg-neutral-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-300 mb-1">
                          Descripción
                        </p>
                        <p className="text-sm text-gray-400">
                          {product.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Vista de edición
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nombre del Producto *
                    </label>
                    <Input
                      input={editedProduct.name}
                      setInput={(value) =>
                        setEditedProduct({ ...editedProduct, name: value })
                      }
                      placeholder="Nombre del producto"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Código *
                    </label>
                    <Input
                      input={editedProduct.code}
                      setInput={(value) =>
                        setEditedProduct({ ...editedProduct, code: value })
                      }
                      placeholder="Código del producto"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Código de Barras
                    </label>
                    <Input
                      input={editedProduct.barcode}
                      setInput={(value) =>
                        setEditedProduct({ ...editedProduct, barcode: value })
                      }
                      placeholder="Código de barras"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Unidad *
                    </label>
                    <Input
                      input={editedProduct.unit}
                      setInput={(value) =>
                        setEditedProduct({ ...editedProduct, unit: value })
                      }
                      placeholder="kg, m, unidades, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Unidades por Paquete
                    </label>
                    <Input
                      input={editedProduct.unitsPerPackage}
                      setInput={(value) =>
                        setEditedProduct({
                          ...editedProduct,
                          unitsPerPackage: value,
                        })
                      }
                      placeholder="25"
                    />
                  </div>

                  <div className="flex items-center pt-7">
                    <Checkbox
                      variant="cyan"
                      checked={editedProduct.isActive}
                      onCheck={(value) =>
                        setEditedProduct({ ...editedProduct, isActive: value })
                      }
                    />
                    <label className="ml-2 text-sm font-medium text-gray-300">
                      Producto Activo
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descripción
                  </label>
                  <Textarea
                    value={editedProduct.description}
                    onChange={(e) =>
                      setEditedProduct({
                        ...editedProduct,
                        description: e.target.value,
                      })
                    }
                    placeholder="Descripción del producto (opcional)"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Bodegas</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {stats.warehousesWithStock} / {stats.totalWarehouses}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">con stock</p>
                  </div>
                  <BuildingStorefrontIcon className="w-10 h-10 text-blue-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Items Totales</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {stats.totalItems.toLocaleString()}
                    </p>
                  </div>
                  <ArchiveBoxIcon className="w-10 h-10 text-purple-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Cantidad Total</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {stats.totalQuantity.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{product.unit}</p>
                  </div>
                  <ChartBarIcon className="w-10 h-10 text-orange-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Disponible</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">
                      {stats.totalAvailableQuantity.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.totalAvailableItems} items
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
                    <p className="text-sm text-gray-400">Reservado</p>
                    <p className="text-2xl font-bold text-yellow-400 mt-1">
                      {stats.totalReservedQuantity.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.totalReservedItems} items
                    </p>
                  </div>
                  <ClockIcon className="w-10 h-10 text-yellow-500 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cards adicionales para otros estados */}
          {(stats.totalInTransitItems > 0 ||
            stats.totalInProductionItems > 0 ||
            stats.totalPrintLabItems > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.totalInTransitItems > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">En Tránsito</p>
                        <p className="text-2xl font-bold text-blue-400 mt-1">
                          {stats.totalInTransitQuantity.toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {stats.totalInTransitItems} items
                        </p>
                      </div>
                      <TruckIcon className="w-10 h-10 text-blue-500 opacity-80" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {stats.totalInProductionItems > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">En Producción</p>
                        <p className="text-2xl font-bold text-purple-400 mt-1">
                          {stats.totalInProductionQuantity.toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {stats.totalInProductionItems} items
                        </p>
                      </div>
                      <CogIcon className="w-10 h-10 text-purple-500 opacity-80" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {stats.totalPrintLabItems > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">PrintLab</p>
                        <p className="text-2xl font-bold text-orange-400 mt-1">
                          {stats.totalPrintLabQuantity.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {stats.totalPrintLabItems} items
                        </p>
                      </div>
                      <PrinterIcon className="w-10 h-10 text-orange-500 opacity-80" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-emerald-500" />
            <CardTitle>Filtros</CardTitle>
          </div>
          <CardDescription>
            Filtra el inventario por bodega o estado de items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Buscar Bodega
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  input={searchTerm}
                  setInput={setSearchTerm}
                  placeholder="Buscar por bodega..."
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
                Estado de Items
              </label>
              <Select
                options={itemStatusOptions}
                value={selectedItemStatus}
                onChange={setSelectedItemStatus}
                placeholder="Selecciona un estado"
              />
            </div>
          </div>

          {(searchTerm ||
            selectedWarehouse !== "all" ||
            selectedItemStatus !== "all") && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                {filteredInventory.length} bodega(s) encontrada(s)
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedWarehouse("all");
                  setSelectedItemStatus("all");
                }}
                className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de inventario por bodega */}
      <Card>
        <CardHeader>
          <CardTitle>Inventario por Bodega</CardTitle>
          <CardDescription>
            Haz clic en una fila para ver los items individuales en cada bodega
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table
            data={filteredInventory}
            columns={warehouseColumns}
            loading={loading}
            emptyMessage="No se encontró inventario en ninguna bodega"
            renderExpandedContent={renderExpandedContent}
            canExpandRow={(row) => row.items && row.items.length > 0}
            getRowId={(row) => row.warehouse.documentId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
