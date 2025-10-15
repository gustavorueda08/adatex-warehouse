"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import InvoiceableItemsTable from "@/components/partialInvoice/InvoiceableItemsTable";
import { useInvoiceableItems, useCreatePartialInvoice } from "@/lib/hooks/useConsignment";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

export default function CreatePartialInvoicePage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const { items: invoiceableData, loading, error } = useInvoiceableItems(id);
  const { creating, createByItems, createByQuantity } = useCreatePartialInvoice();

  const [mode, setMode] = useState("quantity"); // "items" | "quantity"
  const [selectedData, setSelectedData] = useState(null);
  const [notes, setNotes] = useState("");

  const handleSelectionChange = (data) => {
    setSelectedData(data);
  };

  const handleCreate = async () => {
    if (!selectedData || (Array.isArray(selectedData) && selectedData.length === 0)) {
      toast.error("Debes seleccionar al menos un item o ingresar una cantidad");
      return;
    }

    // Confirmar con el usuario
    const result = await Swal.fire({
      title: "Crear factura parcial",
      html: `Se creará una orden de facturación parcial.<br/>¿Deseas continuar?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, crear",
      cancelButtonText: "Cancelar",
      background: "#27272a",
      color: "#fff",
      confirmButtonColor: "#06b6d4",
      cancelButtonColor: "#71717a",
    });

    if (!result.isConfirmed) return;

    const loadingToast = toast.loading("Creando factura parcial...");

    try {
      let response;

      if (mode === "quantity") {
        // Modo cantidad (FIFO automático)
        const products = Array.from(selectedData).map(([productId, quantity]) => ({
          product: productId,
          quantity,
        }));

        response = await createByQuantity({
          parentOrder: parseInt(id),
          customer: invoiceableData.order?.customer?.id,
          customerForInvoice: invoiceableData.order?.customer?.id,
          notes,
          products,
        });
      } else {
        // Modo items (selección manual)
        const productsMap = new Map();

        selectedData.forEach((item) => {
          if (!productsMap.has(item.productId)) {
            productsMap.set(item.productId, {
              product: item.productId,
              items: [],
            });
          }

          productsMap.get(item.productId).items.push({
            id: item.itemId,
          });
        });

        const products = Array.from(productsMap.values());

        response = await createByItems({
          type: "partial-invoice",
          parentOrder: parseInt(id),
          customer: invoiceableData.order?.customer?.id,
          customerForInvoice: invoiceableData.order?.customer?.id,
          notes,
          products,
        });
      }

      toast.dismiss(loadingToast);

      if (response.success) {
        toast.success("Factura parcial creada exitosamente");
        router.push(`/partial-invoices/${response.data.id}`);
      } else {
        toast.error(response.error || "Error al crear la factura parcial");
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Error al crear la factura parcial");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Cargando items facturables...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8">
        <div className="p-4 bg-red-900/20 border border-red-500 rounded-md">
          <p className="text-red-400">Error: {error}</p>
          <Button
            variant="red"
            onClick={() => router.push(`/sales/${id}`)}
            className="mt-4"
          >
            Volver a la orden
          </Button>
        </div>
      </div>
    );
  }

  if (!invoiceableData || !invoiceableData.products || invoiceableData.products.length === 0) {
    return (
      <div className="px-4 py-8">
        <div className="p-4 bg-zinc-700 rounded-md">
          <p className="text-zinc-400 mb-4">
            No hay items facturables disponibles en esta orden.
          </p>
          <Button variant="zinc" onClick={() => router.push(`/sales/${id}`)}>
            Volver a la orden
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Crear Factura Parcial</h1>
        <p className="text-zinc-400 mt-2">
          Orden de venta: <span className="font-mono">{invoiceableData.order?.code}</span>
        </p>
        <p className="text-zinc-400">
          Cliente: <span className="font-medium">{invoiceableData.order?.customer?.name}</span>
        </p>
        <p className="text-zinc-400">
          Fecha de despacho:{" "}
          {invoiceableData.order?.dispatchDate
            ? new Date(invoiceableData.order.dispatchDate).toLocaleDateString()
            : "-"}
        </p>
      </div>

      {/* Modo de selección */}
      <div className="p-4 bg-zinc-700 rounded-md">
        <h3 className="font-bold mb-3">Modo de facturación</h3>
        <div className="flex gap-4">
          <button
            onClick={() => setMode("quantity")}
            className={`px-4 py-2 rounded-md transition-colors ${
              mode === "quantity"
                ? "bg-cyan-600 text-white font-bold"
                : "bg-zinc-600 text-zinc-300 hover:bg-zinc-500"
            }`}
          >
            Por cantidad (FIFO automático)
          </button>
          <button
            onClick={() => setMode("items")}
            className={`px-4 py-2 rounded-md transition-colors ${
              mode === "items"
                ? "bg-cyan-600 text-white font-bold"
                : "bg-zinc-600 text-zinc-300 hover:bg-zinc-500"
            }`}
          >
            Selección manual de items
          </button>
        </div>
      </div>

      {/* Tabla de items facturables */}
      <div>
        <h3 className="text-xl font-bold mb-3">Items Facturables</h3>
        <InvoiceableItemsTable
          invoiceableData={invoiceableData}
          onSelectionChange={handleSelectionChange}
          mode={mode}
        />
      </div>

      {/* Notas */}
      <div>
        <h3 className="text-xl font-bold mb-3">Notas</h3>
        <Textarea
          placeholder="Agrega notas o comentarios sobre esta facturación parcial"
          value={notes}
          setValue={setNotes}
        />
      </div>

      {/* Acciones */}
      <div className="flex flex-col md:flex-row gap-4">
        <Button
          variant="cyan"
          onClick={handleCreate}
          loading={creating}
          disabled={!selectedData || (Array.isArray(selectedData) && selectedData.length === 0)}
        >
          Crear factura parcial
        </Button>
        <Button
          variant="zinc"
          onClick={() => router.push(`/sales/${id}`)}
          disabled={creating}
        >
          Cancelar
        </Button>
      </div>

      {/* Resumen */}
      {invoiceableData.summary && (
        <div className="p-4 bg-zinc-700 rounded-md">
          <h3 className="font-bold mb-2">Resumen de la orden</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <p>
              <span className="text-zinc-400">Total productos:</span>{" "}
              <span className="font-medium">{invoiceableData.summary.totalProducts}</span>
            </p>
            <p>
              <span className="text-zinc-400">Total items:</span>{" "}
              <span className="font-medium">{invoiceableData.summary.totalItems}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
