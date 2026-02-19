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
import PackingList from "@/components/documents/PackingList";
import Comments from "@/components/documents/Comments";
import Actions from "@/components/documents/Actions";
import Products from "@/components/documents/Products";
import { addToast } from "@heroui/react";
import { ORDER_STATES } from "@/lib/utils/orderStates";
import { ORDER_TYPES } from "@/lib/utils/orderTypes";
import { useRouter } from "next/navigation";

export default function OutflowDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { orders, updateOrder, deleteOrder, refetch, addItem, removeItem } =
    useOrders({
      filters: { id: [id] },
      populate: [
        "orderProducts",
        "orderProducts.product",
        "orderProducts.items",
        "sourceWarehouse",
      ],
    });
  const [document, setDocument] = useState(orders[0] || null);
  const [loadings, setLoadings] = useState({
    isUpdating: false,
    isDeleting: false,
  });
  const headerFields = useMemo(() => {
    return [
      {
        listType: "warehouses",
        label: "Almacén de Origen",
        type: "async-select",
        placeholder: "Selecciona un almacén",
        selectedOption: document?.sourceWarehouse,
        selectedOptionLabel: document?.sourceWarehouse?.name,
        render: (warehouse) => warehouse.name,
        filters: (search) => ({
          name: {
            $containsi: search,
          },
        }),
        onChange: (sourceWarehouse) => {
          setDocument({
            ...document,
            sourceWarehouse,
          });
        },
        disabled: true,
      },
      {
        label: "Estado de la Orden",
        type: "select",
        options: [
          { key: "draft", label: "Borrador" },
          { key: "confirmed", label: "Confirmada" },
          { key: "completed", label: "Completada" },
        ],
        disabled: true,
        value: document?.state,
      },
      {
        label: "Fecha de Creación",
        type: "date-picker",
        disabled: true,
        value: document?.createdDate
          ? parseDate(moment(document?.createdDate).format("YYYY-MM-DD"))
          : null,
      },
      {
        label: "Fecha de Salida",
        type: "date-picker",
        disabled: true,
        value: document?.completedDate
          ? parseDate(moment(document?.completedDate).format("YYYY-MM-DD"))
          : null,
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
        title: "Salida Eliminada",
        description: "La orden de salida ha sido eliminada correctamente",
        type: "success",
      });
      router.push("/outflows");
    } catch (error) {
      console.error(error);
      addToast({
        title: "Error al eliminar",
        description: "Ocurrió un error al eliminar la orden de salida",
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
      const products = document?.orderProducts || [];

      // Determine if the order is confirmed (has valid items)
      const confirmed = products
        .filter((p) => p.product)
        .every((product) => {
          const validItems = (product.items || []).filter((i) => {
            const qty = Number(i.currentQuantity);
            return (
              i.currentQuantity !== "" &&
              i.currentQuantity !== null &&
              i.currentQuantity !== undefined &&
              !isNaN(qty) &&
              qty !== 0
            );
          });
          // Product must have at least one valid item
          return validItems.length > 0;
        });

      const formattedProducts = products
        .filter((p) => p.product)
        .map((p) => {
          const validItems = (p.items || []).filter((i) => {
            const qty = Number(i.currentQuantity);
            return (
              i.currentQuantity !== "" &&
              i.currentQuantity !== null &&
              i.currentQuantity !== undefined &&
              !isNaN(qty) &&
              qty !== 0
            );
          });

          // Calculate quantities
          const confirmedQuantity = validItems.reduce(
            (sum, item) => sum + (Number(item.currentQuantity) || 0),
            0,
          );

          const items = validItems.map((item) => ({
            id: item.id, // Keep existing ID if present
            quantity: Number(item.currentQuantity),
            // Outflows might not always need lot/itemNumber strictness like Sales depending on specific business logic,
            // but usually yes for traceability. Keeping it flexible or strict based on requirement?
            // Sales logic requires them. For "Out", we will pass what we have.
            lot: Number(item.lotNumber) || null,
            itemNumber: Number(item.itemNumber) || null,
            warehouse: item.warehouse || document.sourceWarehouse?.id, // Ensure warehouse is set if it's a new item
          }));

          return {
            product: p.product.id || p.product,
            items: items,
            requestedQuantity: p.requestedQuantity, // Keep requested as is, or update? usually requested is what was planned.
            confirmedQuantity: confirmedQuantity,
          };
        });

      const data = {
        products: formattedProducts,
        sourceWarehouse:
          document.sourceWarehouse?.id || document.sourceWarehouse,
        createdDate: document.createdDate,
        // Logic for dates updates
        completedDate:
          newState === "completed"
            ? moment.tz("America/Bogota").toDate()
            : document.completedDate,

        state: newState
          ? newState
          : confirmed && document.state === "draft"
            ? "confirmed"
            : document.state,
        notes: document.notes || "", // Handle notes if any
      };

      if (confirmed && document.state === "draft") {
        data.confirmedDate = moment.tz("America/Bogota").toDate();
      }

      await updateOrder(document.id, data);

      addToast({
        title: "Orden de Salida Actualizada",
        description: "La orden de salida ha sido actualizada correctamente",
        type: "success",
      });

      await refetch(); // Refresh data to get latest state from backend/DB triggers
    } catch (error) {
      console.error(error);
      addToast({
        title: "Error al actualizar",
        description: "Ocurrió un error al actualizar la orden de salida",
        type: "error",
      });
    } finally {
      setLoadings({
        isUpdating: false,
      });
    }
  };
  useEffect(() => {
    if (orders.length > 0) {
      setDocument(orders[0]);
    }
  }, [orders]);

  if (!document) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Cargando orden...</div>
      </div>
    );
  }

  return (
    <Document
      title="Orden de Salida"
      type={ORDER_TYPES.OUT}
      document={document}
      setDocument={setDocument}
      headerFields={headerFields}
    >
      <Section
        title="Productos"
        description="Productos de la orden de salida"
        color="primary"
        icon={<DocumentChartBarIcon className="w-6 h-6" />}
      >
        <Products
          products={document?.orderProducts || []}
          setDocument={setDocument}
          // No price list for Outflows usually
          disabled={document?.state === ORDER_STATES.COMPLETED}
        />
      </Section>
      <Section
        title="Lista de Empaque"
        description="Lista de Empaque de la orden de salida"
        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
      >
        <PackingList
          document={document}
          setDocument={setDocument}
          onHeaderScan={addItem}
          onRemoveItem={removeItem}
          isHeaderInputEnabled={document?.state !== ORDER_STATES.COMPLETED}
          isItemEditable={document?.state !== ORDER_STATES.COMPLETED}
        />
      </Section>
      <Section
        title="Comentarios"
        description="Comentarios de la orden de salida"
        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
      >
        <Comments
          comments={document?.notes || ""}
          setDocument={setDocument}
          disabled={document?.state === ORDER_STATES.COMPLETED}
        />
      </Section>
      <Section
        title="Acciones"
        description="Acciones de la orden de salida"
        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
      >
        <Actions
          document={document}
          onUpdate={handleUpdate}
          onComplete={() => handleUpdate("completed")}
          // No Invoice action for Outflows
          onDelete={handleDelete}
          loadings={loadings}
        />
      </Section>
    </Document>
  );
}
