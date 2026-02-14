"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useOrders } from "@/lib/hooks/useOrders";
import Document from "@/components/documents/Document";
import moment from "moment-timezone";
import { parseDate } from "@internationalized/date";
import Section from "@/components/ui/Section";
import {
  ClipboardDocumentListIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/outline";
import TransformProducts from "@/components/documents/TransformProducts";
import Comments from "@/components/documents/Comments";
import Actions from "@/components/documents/Actions";
import { addToast } from "@heroui/react";
import { v4 as uuidv4 } from "uuid";

export default function TransformationDetailPage({ params }) {
  const { id } = use(params);
  const { orders, updateOrder, refetch } = useOrders({
    filters: { id: [id] },
    populate: [
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
      "orderProducts.items.transformedFromItem",
      "orderProducts.items.transformedFromItem.product",
      "orderProducts.items.parentItem",
      "orderProducts.items.parentItem.product",
      "sourceWarehouse",
      "destinationWarehouse",
    ],
  });

  const [document, setDocument] = useState(null);
  const [loadings, setLoadings] = useState({
    isUpdating: false,
  });

  // Inicializar el estado del documento desde orders[0]
  // Mapear orderProducts → rows para TransformProducts
  useEffect(() => {
    if (orders.length > 0) {
      const order = orders[0];
      console.log("ORDEN", order);

      // Convertir orderProducts a filas de transformación
      const rows = [];
      (order.orderProducts || []).forEach((op) => {
        (op.items || []).forEach((item) => {
          // Determinar el sourceItem (transformedFromItem para transformación, parentItem para partición)
          const sourceItemObj =
            item.transformedFromItem || item.parentItem || null;
          const sourceProduct = sourceItemObj?.product || op.product;

          rows.push({
            id: item.id || uuidv4(),
            sourceProduct: sourceProduct,
            sourceItem: sourceItemObj,
            product: op.product,
            sourceQuantity: String(item.sourceQuantityConsumed || 0),
            targetQuantity: String(item.currentQuantity ?? item.quantity ?? 0),
            // Keep reference to original item for updates
            _originalItem: item,
          });
        });
      });

      setDocument({
        ...order,
        products: rows,
      });
    }
  }, [orders]);

  const isReadOnly = useMemo(() => {
    return (
      document?.state === "completed" ||
      document?.state === "cancelled" ||
      document?.state === "processing"
    );
  }, [document?.state]);

  const headerFields = useMemo(() => {
    if (!document) return [];
    return [
      {
        listType: "warehouses",
        label: "Bodega Origen",
        type: "async-select",
        placeholder: "Selecciona bodega origen",
        disabled: isReadOnly,
        selectedOption: document?.sourceWarehouse,
        selectedOptionLabel: document?.sourceWarehouse?.name || "",
        render: (warehouse) => warehouse.name,
        filters: (search) => ({
          $and: [
            {
              $or: [{ type: "stock" }, { type: "printlab" }],
            },
            {
              name: {
                $containsi: search,
              },
            },
          ],
        }),
        onChange: (sourceWarehouse) => {
          setDocument((prev) => ({
            ...prev,
            sourceWarehouse,
          }));
        },
      },
      {
        listType: "warehouses",
        label: "Bodega Destino",
        type: "async-select",
        placeholder: "Selecciona bodega destino",
        disabled: isReadOnly,
        selectedOption: document?.destinationWarehouse,
        selectedOptionLabel: document?.destinationWarehouse?.name || "",
        render: (warehouse) => warehouse.name,
        filters: (search) => ({
          $and: [
            {
              $or: [{ type: "stock" }, { type: "printlab" }],
            },
            {
              name: {
                $containsi: search,
              },
            },
          ],
        }),
        onChange: (destinationWarehouse) => {
          setDocument((prev) => ({
            ...prev,
            destinationWarehouse,
          }));
        },
      },
      {
        label: "Estado",
        type: "select",
        options: [
          { key: "draft", label: "Borrador" },
          { key: "confirmed", label: "Confirmada" },
          { key: "processing", label: "En Proceso" },
          { key: "completed", label: "Completada" },
          { key: "cancelled", label: "Cancelada" },
        ],
        disabled: true,
        value: document?.state,
        onChange: () => {},
      },
      {
        label: "Fecha de Creación",
        type: "date-picker",
        disabled: true,
        value: document?.createdDate
          ? parseDate(moment(document.createdDate).format("YYYY-MM-DD"))
          : null,
        onChange: () => {},
      },
    ];
  }, [document, isReadOnly]);

  const transformType = useMemo(() => {
    if (!document || !document.products || document.products.length === 0)
      return "cut";
    const firstRow = document.products[0];
    if (firstRow.sourceProduct && firstRow.product) {
      // If source and target products are DIFFERENT, it's a transform.
      // If SAME, it's a cut.
      return firstRow.sourceProduct.id !== firstRow.product.id
        ? "transform"
        : "cut";
    }
    return "cut";
  }, [document]);

  const handleUpdate = async (doc) => {
    try {
      setLoadings({ isUpdating: true });

      // Agrupar filas por producto destino
      const groupedProducts = {};
      const originalItemIds = new Set();

      // Collect all original item IDs from the initial document state to track deletions
      (document.products || []).forEach((row) => {
        if (row._originalItem && row._originalItem.id) {
          originalItemIds.add(row._originalItem.id);
        }
      });

      const currentItemIds = new Set();

      (doc.products || []).forEach((row) => {
        // Validate row completeness
        if (!row.sourceProduct || !row.sourceItem) return;

        // Determine target product based on transform type or fallback
        // In detail page, product is already set on the row usually
        let targetProduct = row.product || row.targetProduct;

        // For cuts, if no target product set, assume source product
        if (!targetProduct && transformType === "cut") {
          targetProduct = row.sourceProduct;
        }

        if (!targetProduct) return;

        const productId = targetProduct.id;

        if (!groupedProducts[productId]) {
          groupedProducts[productId] = {
            product: productId,
            items: [],
          };
        }

        // Handle items array from CutItemsModal
        const itemsToProcess =
          row.items && row.items.length > 0
            ? row.items
            : [
                {
                  quantity: row.targetQuantity,
                  id: row.id, // ID from the row itself
                  _originalItem: row._originalItem, // original item ref
                },
              ];

        itemsToProcess.forEach((item) => {
          const quantity = Number(item.quantity);
          // Check if it's an existing item (has _originalItem with ID)
          const originalItem =
            item._originalItem ||
            (row._originalItem && row.id === item.id
              ? row._originalItem
              : null);

          if (originalItem && originalItem.id) {
            // Existing item - send with ID to KEEP it.
            currentItemIds.add(originalItem.id);
            groupedProducts[productId].items.push({
              id: originalItem.id,
            });
          } else {
            // New item - send full payload WITHOUT ID
            if (quantity > 0) {
              const itemPayload = {
                sourceItemId: row.sourceItem.id || row.sourceItem,
                quantity: quantity,
                targetQuantity: quantity,
                sourceQuantityConsumed:
                  Number(row.sourceQuantity || 0) || quantity, // Fallback logic
                warehouse: doc.destinationWarehouse?.id,
              };
              groupedProducts[productId].items.push(itemPayload);
            }
          }
        });
      });

      const data = {
        products: Object.values(groupedProducts),
        sourceWarehouse: doc.sourceWarehouse?.id || doc.sourceWarehouse,
        destinationWarehouse:
          doc.destinationWarehouse?.id || doc.destinationWarehouse,
        notes: doc.notes || "",
        createdDate: doc.createdDate,
      };

      await updateOrder(doc.id, data);
      await refetch();
      addToast({
        title: "Transformación Actualizada",
        description: "La transformación ha sido actualizada correctamente",
        type: "success",
      });
    } catch (error) {
      console.error(error);
      addToast({
        title: "Error al actualizar",
        description: "Ocurrió un error al actualizar la transformación",
        type: "error",
      });
    } finally {
      setLoadings({ isUpdating: false });
    }
  };

  if (!document) return null;

  return (
    <Document
      title="Transformación"
      type="transform"
      document={document}
      setDocument={setDocument}
      headerFields={headerFields}
    >
      <Section
        title="Transformación"
        description="Items consumidos y productos generados"
        color="primary"
        icon={<DocumentChartBarIcon className="w-6 h-6" />}
      >
        <TransformProducts
          products={document.products || []}
          setDocument={setDocument}
          sourceWarehouse={document.sourceWarehouse}
          disabled={isReadOnly}
          transformType={transformType}
        />
      </Section>

      <Section
        title="Comentarios"
        description="Notas sobre la transformación"
        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
      >
        <Comments comments={document?.notes || ""} setDocument={setDocument} />
      </Section>

      <Section
        title="Acciones"
        description="Acciones de la transformación"
        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
      >
        <Actions
          document={document}
          onUpdate={handleUpdate}
          onInvoice={async () => {
            try {
              await updateOrder(document.id, {
                state: "completed",
                completedDate: moment.tz("America/Bogota").toDate(),
              });
              await refetch();
              addToast({
                title: "Transformación Completada",
                description:
                  "La transformación ha sido marcada como completada",
                type: "success",
              });
            } catch (error) {
              console.error(error);
              addToast({
                title: "Error",
                description: "Ocurrió un error al completar la transformación",
                type: "error",
              });
            }
          }}
          onDelete={async () => {
            try {
              const res = await fetch(`/api/strapi/orders/${document.id}`, {
                method: "DELETE",
              });
              if (!res.ok) throw new Error("Error deleting order");

              addToast({
                title: "Transformación Eliminada",
                description:
                  "La transformación ha sido eliminada correctamente",
                type: "success",
              });
              window.location.href = "/transformations";
            } catch (error) {
              console.error(error);
              addToast({
                title: "Error al eliminar",
                description: "Ocurrió un error al eliminar la transformación",
                type: "error",
              });
            }
          }}
          loadings={loadings}
        />
      </Section>
    </Document>
  );
}
