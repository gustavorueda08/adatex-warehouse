"use client";

import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";
import { useUser } from "@/lib/hooks/useUser";
import moment from "moment-timezone";
import { useRouter } from "next/navigation";
import { useState, useCallback, useMemo, useEffect } from "react";
import { v4 } from "uuid";
import Input from "../ui/Input";

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
    ...config.initialState,
  }));

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
    [config]
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

  const getAvailableProductsForRow = useCallback(
    (currentIndex, allProducts) => {
      const selectedProductIds = formState.products
        .map((p, idx) =>
          idx !== currentIndex && p.product ? p.product.id : null
        )
        .filter((id) => id !== null);

      return allProducts.filter((p) => !selectedProductIds.includes(p.id));
    },
    [formState.products]
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
    if (config.productColumns) {
      return config.productColumns({
        formState,
        updateProductField,
        handleProductSelect,
        getAvailableProductsForRow,
        user,
      });
    }
    return [];
  }, [
    config,
    formState,
    updateProductField,
    handleProductSelect,
    getAvailableProductsForRow,
    user,
  ]);

  return (
    <div>
      <h1 className="font-bold text-3xl py-4">{config.title}</h1>

      {/* Header Fields */}
      <div className="space-y-3">
        {config.headerFields &&
          config.headerFields.map((fieldGroup, groupIndex) => (
            <div
              key={groupIndex}
              className="w-full md:flex md:flex-row md:gap-3"
            >
              {fieldGroup.map((field) => (
                <div
                  key={field.key}
                  className={`flex flex-col gap-1 ${
                    groupIndex > 0 ? "mt-3 md:mt-0" : ""
                  } ${field.className || "md:flex-1"}`}
                >
                  <h2 className="font-medium">{field.label}</h2>
                  {renderField(field, formState, updateField)}
                </div>
              ))}
            </div>
          ))}
      </div>

      {/* Botón crear (móvil - arriba) */}
      <div className="block w-full pt-4 md:hidden">
        <Button
          className="w-full"
          variant="emerald"
          onClick={handleSubmit}
          disabled={!isFormValid}
          loading={config.loading}
        >
          Crear
        </Button>
      </div>

      {/* Tabla de productos */}
      <div className="py-4">
        <Table
          columns={productColumns}
          data={formState.products}
          mobileBlock
          getRowId={(row) => row.id}
          canDeleteRow={() => true}
          onRowDelete={(id, index) => handleDeleteProductRow(index)}
          canSelectRow={() => true}
          onRowEdit={() => true}
        />
      </div>

      {/* Campos adicionales */}
      {config.additionalFields && (
        <div className="py-4">
          {config.additionalFields({ formState, updateField })}
        </div>
      )}

      {/* Botón crear (desktop - abajo) */}
      <div className="hidden w-full pt-4 md:block">
        <Button
          variant="emerald"
          onClick={handleSubmit}
          disabled={!isFormValid}
          loading={config.loading}
        >
          Crear
        </Button>
      </div>
    </div>
  );
}

// Helper para renderizar campos
function renderField(field, formState, updateField) {
  const value = formState[field.key];

  console.log(field);

  switch (field.type) {
    case "select":
      const options =
        typeof field.options === "function"
          ? field.options(formState)
          : field.options || [];

      return (
        <Select
          value={value}
          options={options}
          searchable={field.searchable}
          onChange={(v) => {
            updateField(field.key, v);
            if (field.onChange) {
              field.onChange(v, formState, updateField);
            }
          }}
          size={field.size || "md"}
          placeholder={field.placeholder}
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
