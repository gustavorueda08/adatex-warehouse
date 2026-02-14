"use client";

import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";
import MobileList from "@/components/ui/MobileList";
import Badge from "@/components/ui/Badge";
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import {
  ShoppingCartIcon,
  DocumentCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShoppingBagIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowUturnLeftIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";
import { useUser } from "@/lib/hooks/useUser";
import moment from "moment-timezone";
import { useRouter } from "next/navigation";
import { useState, useCallback, useMemo, useEffect } from "react";
import { v4 } from "uuid";
import Input from "../ui/Input";
import dynamic from "next/dynamic";

const QuickCreateModal = dynamic(() => import("../entities/QuickCreateModal"), {
  ssr: false,
});

/**
 * Componente genérico para crear documentos (sales, purchases, inflows, outflows, returns, etc.)
 *
 * @param {Object} config - Configuración del documento
 * @param {string} config.title - Título del formulario
 * @param {string} config.type - Tipo de documento (ORDER_TYPES)
 * @param {Function} config.onSubmit - Función que se ejecuta al crear el documento
 * @param {boolean} config.loading - Estado de carga
 * @param {Array} config.headerFields - Campos del encabezado
 * @param {Array} config.productColumns - Columnas de la tabla de productos
 * @param {Function} config.validateForm - Función de validación del formulario
 * @param {Object} config.initialState - Estado inicial del formulario
 * @param {React.Component} config.additionalFields - Componentes adicionales después de productos
 */
export default function DocumentForm({ config, onFormStateChange }) {
  const router = useRouter();
  const { user } = useUser();

  // Estado del formulario
  const [formState, setFormState] = useState(() => ({
    dateCreated: moment().tz("America/Bogota").toDate(),
    products: [createEmptyProduct()],
    products: [createEmptyProduct()],
    ...config.initialState,
  }));

  const [quickCreateConfig, setQuickCreateConfig] = useState(null);
  const [extraOptions, setExtraOptions] = useState({}); // To store created items locally

  // Notificar cambios al componente padre
  useEffect(() => {
    if (onFormStateChange) {
      onFormStateChange(formState);
    }
  }, [formState, onFormStateChange]);

  // Funciones para manejar productos
  const updateProductField = useCallback((productId, field, value) => {
    setFormState((current) => ({
      ...current,
      products: current.products.map((product) => {
        if (product.id !== productId) return product;

        const updated = { ...product, [field]: value };

        // Recalcular total si cambia precio o cantidad
        if (field === "price" || field === "quantity") {
          updated.total =
            Number(updated.price || 0) * Number(updated.quantity || 0);
        }

        return updated;
      }),
    }));
  }, []);

  const handleProductSelect = useCallback(
    (selectedProduct, index) => {
      setFormState((current) => {
        const updatedProducts = current.products.map((product, i) => {
          if (i === index) {
            const updated = {
              ...product,
              product: selectedProduct,
            };

            // Aplicar lógica personalizada si existe
            if (config.onProductSelect) {
              return config.onProductSelect(updated, selectedProduct, current);
            }

            return updated;
          }
          return product;
        });

        // Agregar nueva fila si la última tiene producto
        if (updatedProducts.at(-1).product) {
          updatedProducts.push(createEmptyProduct());
        }

        return { ...current, products: updatedProducts };
      });
    },
    [config],
  );

  const handleDeleteProductRow = useCallback((index) => {
    setFormState((current) => {
      const updatedProducts = current.products.filter((_, i) => i !== index);

      // Asegurar que siempre hay al menos una fila vacía
      if (
        updatedProducts.length === 0 ||
        (updatedProducts.length > 0 && updatedProducts.at(-1).product !== null)
      ) {
        updatedProducts.push(createEmptyProduct());
      }

      return { ...current, products: updatedProducts };
    });
  }, []);

  const updateProductRow = useCallback((productId, updates) => {
    setFormState((current) => ({
      ...current,
      products: current.products.map((product) => {
        if (product.id !== productId) return product;
        return { ...product, ...updates };
      }),
    }));
  }, []);

  const getAvailableProductsForRow = useCallback(
    (currentIndex, allProducts) => {
      const selectedProductIds = formState.products
        .map((p, idx) =>
          idx !== currentIndex && p.product ? p.product.id : null,
        )
        .filter((id) => id !== null);

      return allProducts.filter((p) => !selectedProductIds.includes(p.id));
    },
    [formState.products],
  );

  // Actualizar campo del formulario
  const updateField = useCallback((field, value) => {
    setFormState((current) => ({ ...current, [field]: value }));
  }, []);

  // Manejar envío del formulario
  const handleSubmit = async () => {
    const data = config.prepareSubmitData(formState, user);
    await config.onSubmit(data);
  };

  // Validar formulario
  const isFormValid = useMemo(() => {
    if (config.validateForm) {
      return config.validateForm(formState);
    }

    // Validación básica por defecto
    const hasProducts = formState.products.some((p) => p.product);
    const allProductsValid = formState.products
      .filter((p) => p.product)
      .every((p) => p.quantity && Number(p.quantity) > 0);

    return hasProducts && allProductsValid;
  }, [formState, config]);

  // Generar columnas de productos
  const productColumns = useMemo(() => {
    let columns = [];
    if (config.productColumns) {
      columns = config.productColumns({
        formState,
        updateProductField,
        handleProductSelect,
        getAvailableProductsForRow,
        user,
      });
    }

    // Wrap render functions to provide expected context
    return columns.map((col) => {
      if (col.render) {
        return {
          ...col,
          render: (value, row, index) => {
            return col.render(value, row, index, {
              formState,
              updateField: (field, val) =>
                updateProductField(row.id, field, val),
            });
          },
        };
      }
      return col;
    });
  }, [
    config,
    formState,
    updateProductField,
    handleProductSelect,
    getAvailableProductsForRow,
    user,
  ]);

  // Calcular estadísticas de productos
  const productStats = useMemo(() => {
    if (config.calculateStats) {
      return config.calculateStats(formState.products);
    }

    const productsWithProduct = formState.products.filter((p) => p.product);
    const validProducts = productsWithProduct.filter(
      (p) => p.quantity && Number(p.quantity) > 0,
    );

    const totalQuantity = productsWithProduct.reduce(
      (acc, p) => acc + Number(p.quantity || 0),
      0,
    );

    return {
      totalProducts: productsWithProduct.length,
      validProducts: validProducts.length,
      allValid:
        productsWithProduct.length > 0 &&
        productsWithProduct.length === validProducts.length,
      totalQuantity,
    };
  }, [formState.products, config]);

  // Obtener label del tipo de documento
  const documentTypeLabel = getDocumentTypeLabel(config.type);
  const documentColor = getDocumentColor(config.type);
  const DocumentIcon = getDocumentIcon(config.type);

  return (
    <div className="space-y-6 pb-8">
      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          {/* Título y badge */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">{config.title}</h1>
              <p className="text-gray-400 text-sm mt-1">
                Completa los campos para crear el documento
              </p>
            </div>
            <Badge variant={documentColor}>{documentTypeLabel}</Badge>
          </div>

          {/* Campos del header */}
          <div className="space-y-4">
            {config.headerFields &&
              config.headerFields.map((fieldGroup, groupIndex) => (
                <div
                  key={groupIndex}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {fieldGroup.map((field) => (
                    <div key={field.key} className={field.className || ""}>
                      <h2 className="font-medium mb-2">{field.label}</h2>

                      {renderField(
                        field,
                        formState,
                        updateField,
                        (config) => {
                          setQuickCreateConfig({
                            ...config,
                            config: {
                              ...config.config,
                              onSuccess: (newItem) => {
                                if (newItem) {
                                  // Add to extra options
                                  const label =
                                    newItem.name ||
                                    newItem.label ||
                                    "Nuevo Item";
                                  const option = {
                                    label,
                                    value: newItem.id,
                                    ...newItem,
                                  };
                                  setExtraOptions((prev) => ({
                                    ...prev,
                                    [field.key]: [
                                      ...(prev[field.key] || []),
                                      option,
                                    ],
                                  }));
                                  // Auto select
                                  updateField(field.key, newItem);
                                }
                                if (config.config.onSuccess) {
                                  config.config.onSuccess(newItem);
                                }
                              },
                            },
                          });
                        },
                        extraOptions,
                      )}
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Productos Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <DocumentIcon className="w-6 h-6 text-emerald-400" />
              <div>
                <CardTitle>Productos</CardTitle>
                <CardDescription>
                  Agrega los productos para este documento
                </CardDescription>
              </div>
            </div>

            {/* Contador de productos válidos */}
            <div className="flex items-center gap-2">
              <Badge
                variant={productStats.validProducts > 0 ? "emerald" : "zinc"}
              >
                {productStats.validProducts}{" "}
                {productStats.validProducts === 1 ? "producto" : "productos"}
              </Badge>
              {productStats.allValid && productStats.validProducts > 0 && (
                <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="md:hidden">
            <MobileList
              columns={productColumns}
              data={formState.products}
              getRowId={(row) => row.id}
              canDeleteRow={() => true}
              onRowDelete={(id, index) => handleDeleteProductRow(index)}
            />
          </div>
          <div className="hidden md:block">
            <Table
              columns={productColumns}
              data={formState.products}
              getRowId={(row) => row.id}
              canDeleteRow={() => true}
              onRowDelete={(id, index) => handleDeleteProductRow(index)}
              canSelectRow={() => true}
              onRowEdit={() => true}
              renderExpandedContent={
                config.renderExpandedContent
                  ? (row, index) =>
                      config.renderExpandedContent(row, index, {
                        formState,
                        updateProductField: (field, val) =>
                          updateProductField(row.id, field, val),
                        updateProductRow: (updates) =>
                          updateProductRow(row.id, updates),
                      })
                  : undefined
              }
              mergeExpansionToggle={config.mergeExpansionToggle}
            />
          </div>

          {/* Mensaje de ayuda si no hay productos */}
          {productStats.totalProducts === 0 && (
            <div className="mt-4 p-4 bg-cyan-900/20 border border-cyan-500/30 rounded-lg">
              <p className="text-sm text-cyan-300">
                💡 Selecciona un producto en la tabla para comenzar
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campos adicionales */}
      {config.additionalFields && (
        <Card>
          <CardHeader>
            <CardTitle>Información adicional</CardTitle>
            <CardDescription>
              Completa los campos adicionales si es necesario
            </CardDescription>
          </CardHeader>
          <CardContent>
            {config.additionalFields({ formState, updateField })}
          </CardContent>
        </Card>
      )}

      {/* Crear Documento Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <DocumentCheckIcon className="w-6 h-6 text-emerald-400" />
            <div>
              <CardTitle>Crear Documento</CardTitle>
              <CardDescription>
                Revisa que todo esté correcto antes de crear
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Lista de validación visual */}
          <div className="space-y-3 mb-6">
            <ValidationItem
              label="Campos requeridos completados"
              valid={
                config.headerFields
                  ? config.headerFields.every((group) =>
                      group.every((field) => {
                        if (field.required === false) return true;
                        return (
                          formState[field.key] !== null &&
                          formState[field.key] !== undefined
                        );
                      }),
                    )
                  : true
              }
            />
            <ValidationItem
              label="Al menos un producto agregado"
              valid={productStats.totalProducts > 0}
            />
            <ValidationItem
              label="Todos los productos son válidos"
              valid={productStats.allValid}
            />
          </div>

          {/* Resumen si es válido */}
          {isFormValid && (
            <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Productos</p>
                  <p className="text-lg font-semibold text-white">
                    {productStats.validProducts}
                  </p>
                </div>
                {config.type === "sale" || config.type === "purchase" ? (
                  <div>
                    <p className="text-xs text-gray-400">Total estimado</p>
                    <p className="text-lg font-semibold text-emerald-400">
                      $
                      {formState.products
                        .filter((p) => p.product && p.quantity)
                        .reduce((acc, p) => acc + (p.total || 0), 0)
                        .toLocaleString()}
                    </p>
                  </div>
                ) : null}
                {productStats.totalQuantity !== undefined && (
                  <div>
                    <p className="text-xs text-gray-400">Cantidad total</p>
                    <p className="text-lg font-semibold text-white">
                      {productStats.totalQuantity.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col md:flex-row  gap-3">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex-1 md:flex-initial"
          >
            Cancelar
          </Button>

          <Button
            variant="emerald"
            onClick={handleSubmit}
            disabled={!isFormValid}
            loading={config.loading}
          >
            {config.loading ? "Creando..." : "Crear Documento"}
          </Button>
        </CardFooter>
      </Card>

      {/* Quick Create Modal */}
      {quickCreateConfig && (
        <QuickCreateModal
          isOpen={!!quickCreateConfig}
          onClose={() => setQuickCreateConfig(null)}
          config={quickCreateConfig.config}
          title={quickCreateConfig.title}
        />
      )}
    </div>
  );
}

// Helper para renderizar campos
function renderField(
  field,
  formState,
  updateField,
  setQuickCreateConfig,
  extraOptions,
) {
  const value = formState[field.key];

  console.log(field);

  switch (field.type) {
    case "select":
      const options =
        typeof field.options === "function"
          ? field.options(formState)
          : field.options || [];

      // Merge with extra options if any
      const currentExtraOptions = extraOptions?.[field.key] || [];
      const allOptions = [...currentExtraOptions, ...options];

      // Deduplicate by value (assuming value is object with id or just id)
      const uniqueOptions = Array.from(
        new Map(
          allOptions.map((item) => {
            const key = item.value?.id || item.value;
            return [key, item];
          }),
        ).values(),
      );

      return (
        <Select
          value={value}
          options={uniqueOptions}
          searchable={field.searchable}
          onChange={(v) => {
            updateField(field.key, v);
            if (field.onChange) {
              field.onChange(v, formState, updateField);
            }
          }}
          size={field.size || "md"}
          placeholder={field.placeholder}
          onSearch={field.onSearch}
          onLoadMore={field.onLoadMore}
          hasMore={field.hasMore}
          loading={field.loading}
          loadingMore={field.loadingMore}
          // Quick Create
          hasMenu={field.quickCreate ? field.hasMenu !== false : field.hasMenu}
          menuTitle={field.quickCreate ? "Crear nuevo" : field.menuTitle}
          onClickMenu={() => {
            if (field.quickCreate) {
              setQuickCreateConfig({
                config: {
                  ...field.quickCreate.config,
                  // onSuccess is handled in the wrapper passed to renderField
                },
                title: "Crear Nuevo",
              });
            } else if (field.onClickMenu) {
              field.onClickMenu();
            }
          }}
        />
      );

    case "date":
      return (
        <DatePicker
          mode="single"
          value={value}
          onChange={(date) => updateField(field.key, date)}
        />
      );
    case "input":
      return (
        <Input
          input={value}
          setInput={(value) => updateField(field.key, value)}
          placeholder={field.placeholder}
        />
      );

    case "custom":
      return field.render({ value, formState, updateField });
    default:
      return null;
  }
}

// Helper para crear producto vacío
function createEmptyProduct() {
  return {
    id: v4(),
    name: "",
    quantity: "",
    price: "",
    product: null,
    key: v4(),
    total: "",
  };
}

// Helper para obtener label del tipo de documento
function getDocumentTypeLabel(type) {
  const labels = {
    sale: "Venta",
    purchase: "Compra",
    in: "Entrada",
    out: "Salida",
    return: "Devolución",
    transform: "Transformación",
    "partial-invoice": "Factura Parcial",
  };
  return labels[type] || type;
}

// Helper para obtener color del tipo de documento
function getDocumentColor(type) {
  const colors = {
    sale: "cyan",
    purchase: "purple",
    in: "emerald",
    out: "orange",
    return: "yellow",
    transform: "blue",
  };
  return colors[type] || "zinc";
}

// Helper para obtener icono del tipo de documento
function getDocumentIcon(type) {
  const icons = {
    sale: ShoppingCartIcon,
    purchase: ShoppingBagIcon,
    in: ArrowDownTrayIcon,
    out: ArrowUpTrayIcon,
    return: ArrowUturnLeftIcon,
    transform: ArrowsRightLeftIcon,
  };
  return icons[type] || DocumentCheckIcon;
}

// Componente para item de validación
function ValidationItem({ label, valid }) {
  return (
    <div className="flex items-center gap-3">
      {valid ? (
        <CheckCircleIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
      ) : (
        <XCircleIcon className="w-5 h-5 text-gray-600 flex-shrink-0" />
      )}
      <span className={`text-sm ${valid ? "text-white" : "text-gray-500"}`}>
        {label}
      </span>
    </div>
  );
}
