"use client";

import { useCallback, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { TagIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import Card, {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { useProducts } from "@/lib/hooks/useProducts";
import Checkbox from "../ui/Checkbox";

/**
 * Componente reutilizable para gestionar precios por producto
 * Usado en customers y suppliers como customSection
 *
 * Sigue el patrón de componente controlado: no mantiene estado propio,
 * solo recibe datos via props y notifica cambios via onChange.
 *
 * @param {Array} prices - Array de precios del formData
 * @param {Function} onChange - Callback para actualizar formData.prices
 * @param {string} entityType - Tipo de entidad ('customer' | 'supplier')
 */
export function PricesSection({
  prices = [],
  onChange,
  entityType = "customer",
}) {
  // Fetch products
  const { products = [], isLoading: isLoadingProducts } = useProducts();

  // Colores según el tipo de entidad
  const themeColors = {
    customer: {
      icon: "text-cyan-400",
      badge: "cyan",
      empty: "bg-cyan-900/20 border-cyan-500/30 text-cyan-300",
    },
    supplier: {
      icon: "text-purple-400",
      badge: "purple",
      empty: "bg-purple-900/20 border-purple-500/30 text-purple-300",
    },
  };

  const colors = themeColors[entityType] || themeColors.customer;

  // Crear fila vacía
  const createEmptyRow = useCallback(
    () => ({
      id: uuidv4(),
      product: null,
      unitPrice: "",
      ivaIncluded: false,
      invoicePercentage: "100",
      new: true,
    }),
    []
  );

  // Computar filas de visualización desde props (incluye fila vacía para UX)
  const displayRows = useMemo(() => {
    const rows = prices.map((price) => ({
      id: price.id || price.key || uuidv4(),
      product: price.product || null,
      unitPrice: price.unitPrice?.toString() || "",
      ivaIncluded: price.ivaIncluded || false,
      invoicePercentage: price.invoicePercentage || "100",
      new: false,
    }));

    // Siempre agregar una fila vacía al final para agregar nuevos precios
    // Solo es para display, no se envía al padre
    if (rows.length === 0 || rows.at(-1)?.product) {
      rows.push(createEmptyRow());
    }

    return rows;
  }, [prices, createEmptyRow]);

  // Obtener productos disponibles (excluir ya seleccionados)
  const getAvailableProducts = useCallback(
    (currentIndex) => {
      const selectedProductIds = displayRows
        .map((row, idx) =>
          idx !== currentIndex && row.product ? row.product.id : null
        )
        .filter((id) => id !== null);

      return products.filter((p) => !selectedProductIds.includes(p.id));
    },
    [displayRows, products]
  );

  // Manejar selección de producto
  const handleProductSelect = useCallback(
    (selectedProduct, index) => {
      // Actualizar el precio en el índice específico
      const updated = [...prices];

      if (index < prices.length) {
        // Actualizar precio existente
        updated[index] = {
          ...updated[index],
          product: selectedProduct,
        };
      } else {
        // Agregar nuevo precio (el usuario seleccionó en la fila vacía)
        updated.push({
          id: uuidv4(),
          product: selectedProduct,
          unitPrice: "",
          ivaIncluded: false,
          new: true,
        });
      }

      // Notificar al padre solo con filas que tienen producto
      onChange(updated.filter((row) => row.product));
    },
    [prices, onChange]
  );

  // Actualizar campo de una fila
  const updateField = useCallback(
    (rowId, field, value) => {
      const updated = prices.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row
      );

      // Notificar al padre
      onChange(updated);
    },
    [prices, onChange]
  );

  // Eliminar fila
  const handleDeleteRow = useCallback(
    (index) => {
      const updated = prices.filter((_, i) => i !== index);

      // Notificar al padre
      onChange(updated);
    },
    [prices, onChange]
  );

  // Columnas de la tabla
  const columns = useMemo(
    () => [
      {
        key: "product",
        label: "Producto",
        render: (_, row, index) => {
          const availableProducts = getAvailableProducts(index);
          const selectOptions = row.product
            ? [
                { label: row.product.name, value: row.product },
                ...availableProducts
                  .filter((p) => p.id !== row.product.id)
                  .map((p) => ({ label: p.name, value: p })),
              ]
            : availableProducts.map((p) => ({ label: p.name, value: p }));

          return (
            <Select
              className="md:min-w-80"
              options={selectOptions}
              value={row.product || null}
              onChange={(product) => handleProductSelect(product, index)}
              searchable
              placeholder="Seleccionar producto..."
              emptyMessage={
                isLoadingProducts
                  ? "Cargando..."
                  : "No hay productos disponibles"
              }
            />
          );
        },
      },
      {
        key: "unitPrice",
        label: "Precio Unitario",
        render: (_, row) => (
          <Input
            input={row.unitPrice}
            setInput={(value) => updateField(row.id, "unitPrice", value)}
            placeholder="$0.00"
            className="md:max-w-32"
            type="number"
            step="0.01"
            min="0"
            required={false}
          />
        ),
      },
      {
        key: "ivaIncluded",
        label: "IVA Incluido",
        render: (_, row) => (
          <Checkbox
            type="checkbox"
            checked={row.ivaIncluded}
            onCheck={(e) => updateField(row.id, "ivaIncluded", e)}
            className="w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
          />
        ),
      },
      {
        key: "invoicePercentage",
        label: "%",
        render: (_, row) => (
          <Input
            input={row.invoicePercentage}
            setInput={(value) =>
              updateField(row.id, "invoicePercentage", value)
            }
            placeholder="100%"
            required={false}
          />
        ),
      },
    ],
    [getAvailableProducts, handleProductSelect, updateField, isLoadingProducts]
  );

  // Estadísticas de precios (basadas en prices, no displayRows)
  const priceStats = useMemo(() => {
    const rowsWithProduct = prices.filter((row) => row.product);
    const validPrices = rowsWithProduct.filter(
      (row) => row.unitPrice && Number(row.unitPrice) > 0
    );

    return {
      totalRows: prices.length,
      rowsWithProduct: rowsWithProduct.length,
      validPrices: validPrices.length,
      allValid:
        rowsWithProduct.length > 0 &&
        rowsWithProduct.length === validPrices.length,
    };
  }, [prices]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <TagIcon className={`w-6 h-6 ${colors.icon}`} />
            <div>
              <CardTitle>Precios por Producto</CardTitle>
              <CardDescription>
                Define precios por defecto para productos específicos
              </CardDescription>
            </div>
          </div>

          {/* Contador de precios válidos */}
          <div className="flex items-center gap-2">
            <Badge variant={priceStats.validPrices > 0 ? colors.badge : "zinc"}>
              {priceStats.validPrices}{" "}
              {priceStats.validPrices === 1 ? "precio" : "precios"}
            </Badge>
            {priceStats.allValid && priceStats.validPrices > 0 && (
              <CheckCircleIcon className={`w-5 h-5 ${colors.icon}`} />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Table
          columns={columns}
          data={displayRows}
          mobileBlock
          getRowId={(row) => row.id}
          canDeleteRow={() => true}
          onRowDelete={(id, index) => handleDeleteRow(index)}
          canSelectRow={() => true}
          onRowEdit={() => true}
        />

        {/* Mensaje de ayuda si no hay precios */}
        {priceStats.rowsWithProduct === 0 && (
          <div className={`mt-4 p-4 border rounded-lg ${colors.empty}`}>
            <p className="text-sm">
              Selecciona un producto en la tabla para comenzar a definir precios
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
