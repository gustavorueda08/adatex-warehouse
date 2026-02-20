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
import { useRouter } from "next/navigation";

export default function TransformationDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { orders, updateOrder, deleteOrder, refetch } = useOrders({
    filters: { id: [id] },
    populate: [
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
      "orderProducts.items.product",
      "orderProducts.items.parentItem",
      "orderProducts.items.parentItem.product",
      "orderProducts.items.transformedFromItem",
      "orderProducts.items.transformedFromItem.product",
      "sourceItems",
      "sourceItems.product",
      "sourceWarehouse",
      "destinationWarehouse",
    ],
  });

  const [document, setDocument] = useState(null);
  const [loadings, setLoadings] = useState({
    isUpdating: false,
    isDeleting: false,
  });

  // Inicializar el estado del documento desde orders[0]
  // Mapear items del order → rows para TransformProducts
  useEffect(() => {
    if (orders.length > 0) {
      const order = orders[0];
      console.log(order, JSON.stringify(order));

      // Extract generated items from orderProducts.items
      // Los items fuente están en order.sourceItems
      // order.orderProducts contiene el producto destino
      const generatedItems = (order.orderProducts || []).flatMap(
        (op) => op.items || [],
      );
      const sourceItemsMap = {};
      (order.sourceItems || []).forEach((si) => {
        sourceItemsMap[si.id] = si;
      });

      // Construir un mapa de orderProduct por producto ID
      const orderProductsByProductId = {};
      (order.orderProducts || []).forEach((op) => {
        const prodId = op.product?.id || op.id;
        if (prodId) orderProductsByProductId[prodId] = op;
      });

      // Determinar primero si es transformación o partición general mirando el primer item
      let defaultTransformType = "cut";
      if (generatedItems.length > 0) {
        const firstItem = generatedItems[0];
        const targetProdId = firstItem.product?.id;
        const sourceRef =
          firstItem.parentItem || firstItem.transformedFromItem || null;
        let sourceProdId = null;
        if (sourceRef) {
          sourceProdId =
            sourceItemsMap[sourceRef.id]?.product?.id || sourceRef.product?.id;
        }
        if (sourceProdId && targetProdId && sourceProdId !== targetProdId) {
          defaultTransformType = "transform";
        }
      }

      // Agrupar items.
      // - Si es transformación: agrupar por producto destino (orderProduct) (o tratar cada uno por separado).
      // - Si es partición (corte): agrupar por PRODUCTO DESTINO Y SOURCE_ITEM.
      const groups = {};

      generatedItems.forEach((item) => {
        const targetProduct = item.product;
        if (!targetProduct) return;

        const sourceItemRef =
          item.parentItem || item.transformedFromItem || null;
        const sourceItemObj = sourceItemRef
          ? sourceItemsMap[sourceItemRef.id] || sourceItemRef
          : null;
        // fallback
        const sourceProduct = sourceItemObj?.product || targetProduct;

        const isPartition = sourceProduct?.id === targetProduct?.id;

        let groupKey;
        if (isPartition) {
          groupKey = `cut_${targetProduct.id}_${sourceItemObj?.id || "unknown"}`;
        } else {
          groupKey = `transform_${item.id}`; // Para transformación cada uno en una fila por ahora, como estaba el código original
        }

        if (!groups[groupKey]) {
          groups[groupKey] = {
            targetProduct,
            sourceProduct,
            sourceItemObj,
            isPartition,
            orderProduct: orderProductsByProductId[targetProduct.id],
            items: [],
          };
        }
        groups[groupKey].items.push(item);
      });

      const rows = [];
      Object.values(groups).forEach((group) => {
        const {
          targetProduct,
          sourceProduct,
          sourceItemObj,
          isPartition,
          orderProduct,
          items,
        } = group;

        if (isPartition) {
          // Para cortes: una fila con array de items para CutItemsModal
          const cutItems = items.map((item) => ({
            id: item.id || uuidv4(),
            quantity: String(item.currentQuantity ?? item.quantity ?? 0),
            sourceQuantityConsumed: item.sourceQuantityConsumed || 0, // importante mantener
            _originalItem: item,
          }));

          rows.push({
            id: orderProduct?.id || uuidv4(), // Esto falla si hay múltiples items del mismo orderProduct. Usamos uuid base también.
            rowId: uuidv4(), // Add unique rowId for tracking multiple cuts of same product
            sourceProduct: sourceProduct,
            sourceItem: sourceItemObj,
            targetProduct: targetProduct,
            sourceQuantity: String(
              items.reduce(
                (sum, i) => sum + (Number(i.sourceQuantityConsumed) || 0),
                0,
              ),
            ),
            targetQuantity: String(
              items.reduce(
                (sum, i) =>
                  sum + (Number(i.currentQuantity ?? i.quantity) || 0),
                0,
              ),
            ),
            items: cutItems,
            _originalItems: items,
          });
        } else {
          // Para transformaciones: cada item es una fila separada
          items.forEach((item) => {
            rows.push({
              id: item.id || uuidv4(),
              rowId: uuidv4(),
              sourceProduct: sourceProduct,
              sourceItem: sourceItemObj,
              targetProduct: targetProduct,
              sourceQuantity: String(item.sourceQuantityConsumed || 0),
              targetQuantity: String(
                item.currentQuantity ?? item.quantity ?? 0,
              ),
              _originalItem: item,
            });
          });
        }
      });

      // Fix IDs so that `id` is unique per row, not just orderProduct id which can be duplicated in partition if there are multiple origin items for same dest.
      const processedRows = rows.map((r) => ({
        ...r,
        id: r.rowId || uuidv4(),
      }));

      setDocument({
        ...order,
        transformType: defaultTransformType,
        products: processedRows,
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

  const transformType = useMemo(() => {
    if (document?.transformType) return document.transformType;
    if (!document || !document.products || document.products.length === 0)
      return "cut";
    const firstRow = document.products[0];
    if (firstRow.sourceProduct && firstRow.targetProduct) {
      return firstRow.sourceProduct.id !== firstRow.targetProduct.id
        ? "transform"
        : "cut";
    }
    return "cut";
  }, [document]);

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
        filters: (search) => {
          const base = { $and: [{ type: { $eq: "stock" } }] };
          if (!search) return base;
          const terms = search.split(/\s+/).filter(Boolean);
          if (terms.length === 0) return base;
          return {
            $and: [
              { type: { $eq: "stock" } },
              ...terms.map((term) => ({
                $or: [{ name: { $containsi: term } }],
              })),
            ],
          };
        },
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
        filters: (search) => {
          const base = { $and: [{ type: { $eq: "stock" } }] };
          if (!search) return base;
          const terms = search.split(/\s+/).filter(Boolean);
          if (terms.length === 0) return base;
          return {
            $and: [
              { type: { $eq: "stock" } },
              ...terms.map((term) => ({
                $or: [{ name: { $containsi: term } }],
              })),
            ],
          };
        },
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
        label: "Tipo de Transformación",
        type: "select",
        value: transformType,
        disabled: true,
        options: [
          { key: "cut", label: "Corte" },
          { key: "transform", label: "Conversión" },
        ],
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
  }, [document, isReadOnly, transformType]);

  const handleDelete = async () => {
    try {
      setLoadings((prev) => ({ ...prev, isDeleting: true }));
      await deleteOrder(document.id);
      addToast({
        title: "Transformación Eliminada",
        description: "La transformación ha sido eliminada correctamente",
        type: "success",
      });
      router.push("/transformations");
    } catch (error) {
      console.error(error);
      addToast({
        title: "Error al eliminar",
        description: "Ocurrió un error al eliminar la transformación",
        type: "error",
      });
    } finally {
      setLoadings((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const handleUpdate = async (newState = null) => {
    try {
      setLoadings({ isUpdating: true });
      // Agrupar filas por producto destino
      const groupedProducts = {};
      (document.products || []).forEach((row) => {
        if (!row.sourceProduct || !row.sourceItem) return;
        // Determinar el producto destino
        let targetProduct = row.targetProduct;
        if (!targetProduct && transformType === "cut") {
          targetProduct = row.sourceProduct;
        }
        if (!targetProduct) return;

        const productId = targetProduct.id;

        if (!groupedProducts[productId]) {
          groupedProducts[productId] = {
            product: productId,
            requestedQuantity: 0,
            items: [],
          };
        }

        // Manejar items del CutItemsModal o fila simple
        const itemsToProcess =
          row.items && row.items.length > 0
            ? row.items
            : [
                {
                  quantity: row.targetQuantity,
                  _originalItem: row._originalItem,
                },
              ];

        itemsToProcess.forEach((item) => {
          const quantity = Number(item.quantity || item.targetQuantity || 0);
          const originalItem = item._originalItem || row._originalItem || null;

          if (originalItem && originalItem.id) {
            // Item existente — para actualizar solo mandamos id y currentQuantity
            groupedProducts[productId].requestedQuantity += quantity;
            groupedProducts[productId].items.push({
              id: originalItem.id,
              currentQuantity: quantity,
            });
          } else {
            // Item nuevo — enviar payload completo sin ID
            if (quantity > 0) {
              groupedProducts[productId].requestedQuantity += quantity;
              groupedProducts[productId].items.push({
                sourceItemId: row.sourceItem.id || row.sourceItem,
                quantity: quantity,
                targetQuantity: quantity,
                sourceQuantityConsumed:
                  transformType === "cut"
                    ? quantity
                    : Number(row.sourceQuantity || 0) || quantity,
              });
            }
          }
        });
      });

      const data = {
        products: Object.values(groupedProducts),
        sourceWarehouse:
          document.sourceWarehouse?.id || document.sourceWarehouse,
        destinationWarehouse:
          document.destinationWarehouse?.id || document.destinationWarehouse,
        notes: document.notes || "",
        createdDate: document.createdDate,
      };

      // Si se solicita completar
      if (newState === "completed") {
        data.state = "completed";
        data.completedDate = moment.tz("America/Bogota").toDate();
      }

      await updateOrder(document.id, data);
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
        <Comments
          comments={document?.notes || ""}
          setDocument={setDocument}
          disabled={isReadOnly}
        />
      </Section>

      <Section
        title="Acciones"
        description="Acciones de la transformación"
        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
      >
        <Actions
          document={document}
          onUpdate={handleUpdate}
          onComplete={handleUpdate}
          onDelete={handleDelete}
          loadings={loadings}
        />
      </Section>
    </Document>
  );
}
