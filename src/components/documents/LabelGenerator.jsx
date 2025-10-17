import React, { useState, useMemo } from "react";
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import { generateLabels } from "@/lib/utils/generateLabels";
import format from "@/lib/utils/format";
import toast from "react-hot-toast";

/**
 * Componente para generar etiquetas PDF con códigos de barras
 * de productos con items identificables
 *
 * @param {Array} products - Array de productos con estructura:
 *   [{ id, product: { id, name, unit }, items: [{ id, itemNumber, barcode, quantity, lotNumber }] }]
 */
export default function LabelGenerator({ products }) {
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Preparar datos de productos con items que tienen códigos de barras
  const productsWithBarcodes = useMemo(() => {
    return products
      .map((p) => ({
        id: p.id,
        productId: p.product?.id,
        productName: p.product?.name || "Sin nombre",
        unit: p.product?.unit || "und",
        items: (p.items || []).filter((item) => item.itemNumber || item.barcode),
        totalQuantity: (p.items || []).reduce(
          (acc, item) => acc + (item.quantity || 0),
          0
        ),
        itemsCount: (p.items || []).filter(
          (item) => item.itemNumber || item.barcode
        ).length,
      }))
      .filter((p) => p.itemsCount > 0);
  }, [products]);

  // Columnas para la tabla
  const columns = [
    {
      key: "productName",
      label: "Producto",
      render: (_, row) => (
        <div className="font-medium text-white">{row.productName}</div>
      ),
    },
    {
      key: "itemsCount",
      label: "Items con código",
      render: (_, row) => (
        <div className="text-center">
          <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-sm font-semibold">
            {row.itemsCount}
          </span>
        </div>
      ),
    },
    {
      key: "totalQuantity",
      label: "Cantidad Total",
      render: (_, row) => (
        <div className="text-white">
          {format(row.totalQuantity)} {row.unit}
        </div>
      ),
    },
  ];

  // Manejar selección de productos
  const handleSelectionChange = (selectedIds) => {
    setSelectedProductIds(selectedIds);
  };

  // Generar labels de productos seleccionados
  const handleGenerateLabels = async (separateFiles = false) => {
    if (selectedProductIds.length === 0) {
      toast.error("Por favor selecciona al menos un producto");
      return;
    }

    setIsGenerating(true);

    try {
      // Preparar datos para generateLabels
      const selectedProducts = productsWithBarcodes
        .filter((p) => selectedProductIds.includes(p.id))
        .map((p) => ({
          id: p.productId,
          name: p.productName,
          unit: p.unit,
          items: p.items.map((item) => ({
            id: item.id,
            barcode: item.itemNumber || item.barcode,
            quantity: item.quantity || 0,
            lotNumber: item.lotNumber || item.lot,
          })),
        }));

      await generateLabels(selectedProducts, {
        width: 10,
        height: 5,
        separateFiles,
      });

      toast.success(
        separateFiles
          ? `${selectedProducts.length} archivo(s) PDF generado(s)`
          : "Etiquetas generadas exitosamente"
      );
    } catch (error) {
      console.error("Error generando etiquetas:", error);
      toast.error("Error al generar las etiquetas");
    } finally {
      setIsGenerating(false);
    }
  };

  // Contenido expandible para cada fila
  const renderExpandedContent = (row) => (
    <div className="bg-neutral-800 rounded-lg p-4">
      <h4 className="text-white font-semibold mb-3">
        Items con código de barras:
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {row.items.map((item, idx) => (
          <div
            key={item.id || idx}
            className="bg-neutral-700 border border-neutral-600 rounded-lg p-3"
          >
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Código:</span>
                <span className="text-sm text-white font-mono font-semibold">
                  {item.itemNumber || item.barcode}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Cantidad:</span>
                <span className="text-sm text-emerald-400 font-semibold">
                  {format(item.quantity)} {row.unit}
                </span>
              </div>
              {(item.lotNumber || item.lot) && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Lote:</span>
                  <span className="text-sm text-cyan-400">
                    {item.lotNumber || item.lot}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generador de Etiquetas con Códigos de Barras</CardTitle>
        <CardDescription>
          Selecciona los productos para generar etiquetas PDF con códigos de
          barras. Haz clic en las filas para ver los detalles de cada item.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {productsWithBarcodes.length === 0 ? (
          <div className="text-center py-12 bg-neutral-800 rounded-lg border border-neutral-700">
            <div className="text-5xl mb-3">📦</div>
            <p className="text-gray-400 text-sm">
              No hay productos con códigos de barras disponibles
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Los productos deben tener items con números de identificación
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-400">
                <span className="font-semibold text-white">
                  {productsWithBarcodes.length}
                </span>{" "}
                producto(s) disponible(s)
                {selectedProductIds.length > 0 && (
                  <span className="ml-3">
                    <span className="font-semibold text-emerald-400">
                      {selectedProductIds.length}
                    </span>{" "}
                    seleccionado(s)
                  </span>
                )}
              </div>
            </div>

            <Table
              data={productsWithBarcodes}
              columns={columns}
              getRowId={(row) => row.id}
              onRowSelect={handleSelectionChange}
              renderExpandedContent={renderExpandedContent}
              emptyMessage="No hay productos con códigos de barras"
            />
          </>
        )}
      </CardContent>

      {productsWithBarcodes.length > 0 && (
        <CardFooter className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="emerald"
            onClick={() => handleGenerateLabels(false)}
            disabled={selectedProductIds.length === 0 || isGenerating}
            loading={isGenerating}
            className="flex-1"
          >
            {isGenerating ? "Generando..." : "Generar PDF Único"}
          </Button>
          <Button
            variant="cyan"
            onClick={() => handleGenerateLabels(true)}
            disabled={selectedProductIds.length === 0 || isGenerating}
            loading={isGenerating}
            className="flex-1"
          >
            Generar PDFs Separados
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
