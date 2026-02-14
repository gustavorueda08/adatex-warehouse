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
import ReturnProducts from "@/components/documents/ReturnProducts";
import Comments from "@/components/documents/Comments";
import Actions from "@/components/documents/Actions";
import { addToast } from "@heroui/react";
import { buildInvoiceLabel } from "@/lib/utils/invoiceLabel";
import { useRouter } from "next/navigation";
import { ORDER_STATES } from "@/lib/utils/orderStates";

export default function ReturnDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { orders, updateOrder, refetch, deleteOrder } = useOrders({
    filters: { id: [id] },
    populate: [
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
      "orderProducts.items.warehouse",
      "orderProducts.items.parentItem",
      "destinationWarehouse",
      "parentOrder",
      "parentOrder.customer",
      "parentOrder.orderProducts",
      "parentOrder.orderProducts.product",
      "parentOrder.orderProducts.items",
      "parentOrder.orderProducts.items.product",
    ],
  });

  const returnOrder = orders[0] || null;

  const { orders: parentOrders } = useOrders({
    filters: returnOrder?.parentOrder?.id
      ? { id: [returnOrder.parentOrder.id] }
      : { id: [-1] },
    populate: [
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
      "orderProducts.items.warehouse",
      "customer",
    ],
  });

  const [document, setDocument] = useState(null);
  const [loadings, setLoadings] = useState({
    isUpdating: false,
  });

  useEffect(() => {
    if (returnOrder && parentOrders.length > 0) {
      const fullParentOrder = parentOrders[0];
      // Crear un Map con los barcodes de items del return document
      const returnItemsByBarcode = new Map();
      (returnOrder.orderProducts || []).forEach((op) => {
        (op.items || []).forEach((item) => {
          if (item.barcode) {
            returnItemsByBarcode.set(item.barcode, {
              returnQuantity: item.currentQuantity || item.quantity || 0,
              returnItemId: item.id,
            });
          }
        });
      });
      // Usar los orderProducts del parentOrder como base
      // y marcar como selected los items que coinciden por barcode
      const mergedOrderProducts = (fullParentOrder.orderProducts || []).map(
        (parentOp) => ({
          ...parentOp,
          items: (parentOp.items || []).map((parentItem) => {
            const returnData = returnItemsByBarcode.get(parentItem.barcode);
            if (returnData) {
              return {
                ...parentItem,
                selected: true,
                returnQuantity: returnData.returnQuantity,
                currentQuantity:
                  parentItem.quantity || parentItem.currentQuantity || 0,
                returnItemId: returnData.returnItemId,
              };
            }
            return {
              ...parentItem,
              selected: false,
              returnQuantity: 0,
              currentQuantity:
                parentItem.quantity || parentItem.currentQuantity || 0,
            };
          }),
        }),
      );

      setDocument({
        ...returnOrder,
        parentOrder: fullParentOrder,
        orderProducts: mergedOrderProducts,
      });
    }
  }, [returnOrder, parentOrders]);

  const headerFields = useMemo(() => {
    return [
      {
        label: "Orden de Venta Original",
        type: "async-select",
        placeholder: "Buscar orden...",
        disabled: true,
        selectedOption: document?.parentOrder,
        selectedOptionLabel: document?.parentOrder
          ? buildInvoiceLabel(document.parentOrder)
          : "",
        render: (order) => {
          const customerName = order.customer
            ? `${order.customer.name} ${order.customer.lastName || ""}`
            : "Sin cliente";
          return `${buildInvoiceLabel(order)} - ${customerName}`;
        },
        filters: (search) => {
          if (!search) return {};
          return {
            $or: [
              { code: { $containsi: search } },
              { "customer.name": { $containsi: search } },
              { "customer.lastName": { $containsi: search } },
            ],
          };
        },
        onChange: (parentOrder) => {
          setDocument({
            ...document,
            parentOrder,
          });
        },
      },
      {
        label: "Cliente",
        type: "input",
        disabled: true,
        value: document?.parentOrder?.customer
          ? `${document.parentOrder.customer.name} ${document.parentOrder.customer.lastName || ""}`
          : "",
        placeholder: "-",
        onChange: () => {},
      },
      {
        listType: "warehouses",
        label: "Bodega Destino",
        type: "async-select",
        placeholder: "Selecciona una bodega",
        disabled:
          document?.state === "completed" || document?.state === "cancelled",
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
          setDocument({
            ...document,
            destinationWarehouse,
          });
        },
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
      {
        label: "Fecha de Devolución",
        type: "date-picker",
        disabled: true,
        value: document?.completedDate
          ? parseDate(moment(document.completedDate).format("YYYY-MM-DD"))
          : null,
        onChange: () => {},
      },
    ];
  }, [document]);
  const handleDelete = async () => {
    try {
      setLoadings({
        ...loadings,
        isDeleting: true,
      });
      await deleteOrder(document.id);
      addToast({
        title: "Devolución Eliminada",
        description: "La devolución ha sido eliminada correctamente",
        type: "success",
      });
      router.push("/returns");
    } catch (error) {
      console.error(error);
      addToast({
        title: "Error al eliminar",
        description: "Ocurrió un error al eliminar la devolución",
        type: "error",
      });
    } finally {
      setLoadings({
        ...loadings,
        isDeleting: false,
      });
    }
  };
  const handleUpdate = async (newState = null) => {
    try {
      setLoadings({
        isUpdating: true,
      });
      // Agrupar items seleccionados por producto
      const productsMap = new Map();
      document.orderProducts.forEach((op) => {
        const productId = op.product?.id;
        if (!productId) return;

        (op.items || []).forEach((item) => {
          if (!item.selected || Number(item.returnQuantity) <= 0) {
            return;
          }

          if (!productsMap.has(productId)) {
            productsMap.set(productId, {
              product: productId,
              requestedQuantity: 0,
              items: [],
            });
          }

          const entry = productsMap.get(productId);
          entry.requestedQuantity += Number(
            item.currentQuantity || item.quantity || 0,
          );
          entry.items.push({
            id: item.id,
            quantity: Number(item.returnQuantity),
          });
        });
      });
      const data = {
        products: Array.from(productsMap.values()),
        destinationWarehouse:
          document.destinationWarehouse?.id || document.destinationWarehouse,
        parentOrder: document.parentOrder?.id || document.parentOrder,
        notes: document.notes,
        createdDate: document.createdDate,
        completedDate:
          newState === "completed"
            ? moment.tz("America/Bogota").toDate()
            : document.completedDate,
        state: newState ? newState : document.state,
      };
      await updateOrder(document.id, data);
      await refetch();
      addToast({
        title: "Devolución Actualizada",
        description: "La devolución ha sido actualizada correctamente",
        type: "success",
      });
    } catch (error) {
      console.error(error);
      addToast({
        title: "Error al actualizar",
        description: "Ocurrió un error al actualizar la devolución",
        type: "error",
      });
    } finally {
      setLoadings({
        isUpdating: false,
      });
    }
  };

  if (!document) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Cargando devolución...</div>
      </div>
    );
  }

  const isEditable =
    document.state === "draft" || document.state === "confirmed";

  return (
    <Document
      title="Orden de Devolución"
      type="return"
      document={document}
      setDocument={setDocument}
      headerFields={headerFields}
    >
      <Section
        title="Productos devueltos"
        description="Items que están siendo devueltos"
        color="primary"
        icon={<DocumentChartBarIcon className="w-6 h-6" />}
      >
        <ReturnProducts
          orderProducts={document?.orderProducts || []}
          setDocument={isEditable ? setDocument : null}
          disabled={document?.state === ORDER_STATES.COMPLETED}
        />
      </Section>

      <Section
        title="Comentarios"
        description="Notas sobre la devolución"
        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
      >
        <Comments
          comments={document?.notes || ""}
          setDocument={isEditable ? setDocument : null}
          disabled={document?.state === ORDER_STATES.COMPLETED}
        />
      </Section>

      <Section
        title="Acciones"
        description="Acciones de la orden de devolución"
        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
      >
        <Actions
          document={document}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          loadings={loadings}
          onComplete={handleUpdate}
        />
      </Section>
    </Document>
  );
}
