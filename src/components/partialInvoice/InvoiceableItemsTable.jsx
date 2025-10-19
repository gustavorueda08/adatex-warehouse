"use client";

import { useState, useEffect } from "react";
import Table from "@/components/ui/Table";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import format from "@/lib/utils/format";

/**
 * Componente para mostrar y seleccionar items facturables de una orden
 * Permite dos modos:
 * 1. Selección por items individuales (checkboxes)
 * 2. Ingreso de cantidades por producto (FIFO automático)
 */
export default function InvoiceableItemsTable({
  invoiceableData,
  onSelectionChange,
  mode = "items", // "items" | "quantity"
}) {
  const [selectedItems, setSelectedItems] = useState(new Map());
  const [productQuantities, setProductQuantities] = useState(new Map());

  useEffect(() => {
    // Notificar cambios al componente padre
    if (mode === "items") {
      onSelectionChange?.(Array.from(selectedItems.values()));
    } else {
      onSelectionChange?.(Array.from(productQuantities.entries()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItems, productQuantities, mode]);

  const handleItemToggle = (item, productId) => {
    const newSelected = new Map(selectedItems);
    const itemKey = `${productId}-${item.id}`;

    if (newSelected.has(itemKey)) {
      newSelected.delete(itemKey);
    } else {
      newSelected.set(itemKey, {
        itemId: item.id,
        productId,
        barcode: item.barcode,
        quantity: item.quantity,
        lotNumber: item.lotNumber,
      });
    }

    setSelectedItems(newSelected);
  };

  const handleQuantityChange = (productId, value) => {
    const newQuantities = new Map(productQuantities);
    const numValue = parseFloat(value) || 0;

    if (numValue > 0) {
      newQuantities.set(productId, numValue);
    } else {
      newQuantities.delete(productId);
    }

    setProductQuantities(newQuantities);
  };

  const getProductTotal = (product) => {
    return product.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  };

  const getSelectedTotal = (product) => {
    const productSelectedItems = Array.from(selectedItems.values()).filter(
      (item) => item.productId === product.product.id
    );
    return productSelectedItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Columnas para modo "items" (selección individual)
  const itemColumns = [
    {
      key: "select",
      label: "Seleccionar",
      render: (_, item, index, productId) => (
        <Checkbox
          variant="cyan"
          checked={selectedItems.has(`${productId}-${item.id}`)}
          onCheck={() => handleItemToggle(item, productId)}
        />
      ),
    },
    {
      key: "barcode",
      label: "Código/Barcode",
      render: (barcode) => <p className="font-mono text-sm">{barcode || "-"}</p>,
    },
    {
      key: "lotNumber",
      label: "Lote",
      render: (lot) => <p className="text-sm">{lot || "-"}</p>,
    },
    {
      key: "quantity",
      label: "Cantidad",
      render: (qty) => <p className="font-medium">{format(qty)}</p>,
    },
    {
      key: "state",
      label: "Estado",
      render: (state) => (
        <span className="px-2 py-1 rounded-full text-xs bg-yellow-500">
          {state === "sold" ? "Despachado" : state}
        </span>
      ),
    },
  ];

  // Columnas para modo "quantity" (ingreso de cantidad)
  const quantityColumns = [
    {
      key: "product",
      label: "Producto",
      render: (_, row) => (
        <div>
          <p className="font-medium">{row.product?.name}</p>
          <p className="text-xs text-zinc-400">{row.product?.code}</p>
        </div>
      ),
    },
    {
      key: "totalQuantity",
      label: "Cantidad Disponible",
      render: (_, row) => (
        <p className="font-medium">
          {format(getProductTotal(row))} {row.product?.unit}
        </p>
      ),
    },
    {
      key: "itemCount",
      label: "Items Disponibles",
      render: (_, row) => <p>{row.items?.length || 0}</p>,
    },
    {
      key: "quantityToInvoice",
      label: "Cantidad a Facturar",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            input={productQuantities.get(row.product?.id) || ""}
            setInput={(value) => handleQuantityChange(row.product?.id, value)}
            placeholder="0"
            className="max-w-28"
            min="0"
            max={getProductTotal(row)}
            step="0.01"
          />
          <span className="text-sm text-zinc-400">{row.product?.unit}</span>
        </div>
      ),
    },
  ];

  if (!invoiceableData || !invoiceableData.products) {
    return (
      <div className="p-4 bg-zinc-700 rounded-md">
        <p className="text-zinc-400">No hay items facturables disponibles.</p>
      </div>
    );
  }

  if (mode === "quantity") {
    // Modo de ingreso de cantidades
    return (
      <div className="space-y-4">
        <div className="p-3 bg-blue-900/20 border border-blue-500 rounded-md">
          <p className="text-sm text-blue-300">
            <strong>Modo FIFO:</strong> Ingresa la cantidad que deseas facturar por producto.
            El sistema seleccionará automáticamente los items más antiguos (First In, First Out).
          </p>
        </div>

        <Table
          columns={quantityColumns}
          data={invoiceableData.products || []}
          getRowId={(row) => row.product?.id}
        />

        <div className="p-3 bg-zinc-700 rounded-md">
          <p className="text-sm">
            <strong>Total a facturar:</strong>{" "}
            {Array.from(productQuantities.values()).reduce((sum, qty) => sum + qty, 0).toFixed(2)} unidades
          </p>
        </div>
      </div>
    );
  }

  // Modo de selección de items individuales
  return (
    <div className="space-y-6">
      <div className="p-3 bg-blue-900/20 border border-blue-500 rounded-md">
        <p className="text-sm text-blue-300">
          <strong>Modo manual:</strong> Selecciona individualmente los items que deseas facturar.
        </p>
      </div>

      {invoiceableData.products?.map((productData) => (
        <div key={productData.product?.id} className="space-y-2">
          <div className="flex justify-between items-center p-3 bg-zinc-700 rounded-md">
            <div>
              <h4 className="font-bold text-lg">{productData.product?.name}</h4>
              <p className="text-sm text-zinc-400">{productData.product?.code}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-zinc-400">Seleccionado</p>
              <p className="font-bold text-cyan-400">
                {format(getSelectedTotal(productData))} / {format(getProductTotal(productData))}{" "}
                {productData.product?.unit}
              </p>
            </div>
          </div>

          <Table
            columns={itemColumns.map((col) => ({
              ...col,
              render: (value, item, index) =>
                col.render(value, item, index, productData.product?.id),
            }))}
            data={productData.items || []}
            getRowId={(item) => item.id}
          />
        </div>
      ))}

      <div className="p-3 bg-zinc-700 rounded-md">
        <p className="text-sm">
          <strong>Total seleccionado:</strong>{" "}
          {Array.from(selectedItems.values()).reduce((sum, item) => sum + item.quantity, 0).toFixed(2)}{" "}
          unidades en {selectedItems.size} items
        </p>
      </div>
    </div>
  );
}
