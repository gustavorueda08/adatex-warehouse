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
import { ORDER_STATES } from "@/lib/utils/orderStates";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function NationalizationDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const { orders, updateOrder, deleteOrder, addItem, removeItem } = useOrders({
    filters: { id: [id] },
    populate: [
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
      "sourceWarehouse",
      "destinationWarehouse",
      "parentOrder",
    ],
  });

  const [document, setDocument] = useState(orders[0] || null);

  const headerFields = useMemo(
    () => [
      {
        label: "Contenedor (Orden de Compra)",
        type: "input",
        value: document?.parentOrder?.containerCode || "",
        disabled: true,
        fullWidth: true,
      },
      {
        label: "Bodega Origen (Zona Franca)",
        type: "input",
        value: document?.sourceWarehouse?.name || "",
        disabled: true,
      },
      {
        listType: "warehouses",
        label: "Bodega Destino (Stock)",
        type: "async-select",
        placeholder: "Selecciona una bodega stock",
        selectedOption: document?.destinationWarehouse,
        selectedOptionLabel: document?.destinationWarehouse?.name || "",
        render: (warehouse) => warehouse?.name,
        filters: (search) => {
          const base = { type: { $in: ["stock"] } };
          if (!search) return base;
          const terms = search.split(/\s+/).filter(Boolean);
          if (terms.length === 0) return base;
          return {
            $and: [
              base,
              ...terms.map((term) => ({
                $or: [{ name: { $containsi: term } }],
              })),
            ],
          };
        },
        onChange: (destinationWarehouse) => {
          setDocument({ ...document, destinationWarehouse });
        },
        disabled: document?.state === ORDER_STATES.COMPLETED,
      },
      {
        label: "Fecha de Creación",
        type: "date-picker",
        disabled: true,
        value: document?.createdDate
          ? parseDate(moment(document.createdDate).format("YYYY-MM-DD"))
          : null,
      },
      {
        label: "Fecha de Completado",
        type: "date-picker",
        disabled: true,
        value: document?.completedDate
          ? parseDate(moment(document.completedDate).format("YYYY-MM-DD"))
          : null,
      },
    ],
    [orders, document],
  );

  const handleDelete = () => {
    router.push("/nationalizations");

    const deletePromise = deleteOrder(document.id, { background: true }).then(
      (result) => {
        if (!result.success)
          throw new Error("Error al eliminar la nacionalización");
        return result;
      },
    );

    toast.promise(deletePromise, {
      loading: "Eliminando orden...",
      success: "Nacionalización eliminada exitosamente",
      error: "Error al eliminar la nacionalización",
    });
  };

  const handleUpdate = async (newState = null) => {
    const products = document?.orderProducts || [];

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
        return {
          product: p.product.id || p.product,
          items: validItems.map((item) => ({
            id: item.id,
            quantity: Number(item.currentQuantity),
          })),
          confirmedQuantity: validItems.reduce(
            (sum, item) => sum + (Number(item.currentQuantity) || 0),
            0,
          ),
          requestedQuantity: p.requestedQuantity
            ? Number(p.requestedQuantity)
            : 0,
          price: 0,
        };
      });

    const data = {
      products: formattedProducts,
      sourceWarehouse: document.sourceWarehouse?.id || document.sourceWarehouse,
      destinationWarehouse:
        document.destinationWarehouse?.id || document.destinationWarehouse,
      createdDate: document.createdDate,
      confirmedDate: document.confirmedDate,
      completedDate:
        newState === ORDER_STATES.COMPLETED
          ? moment.tz("America/Bogota").toDate()
          : document.completedDate,
      state: newState || document.state,
    };

    const promise = updateOrder(document.id, data, { background: true }).then(
      (result) => {
        if (!result.success)
          throw new Error(result.error?.message || "Error al actualizar");
        return result;
      },
    );

    toast.promise(promise, {
      loading: "Actualizando...",
      success: "Nacionalización actualizada exitosamente",
      error: (err) => err.message || "Error al actualizar",
    });
  };

  useEffect(() => {
    if (orders.length > 0) {
      setDocument(orders[0]);
    }
  }, [orders]);

  return (
    <Document
      title="Nacionalización de Mercancía"
      type="nationalization"
      document={document}
      setDocument={setDocument}
      headerFields={headerFields}
    >
      <Section
        title="Productos"
        description="Productos incluidos en esta nacionalización"
        color="primary"
        icon={<DocumentChartBarIcon className="w-6 h-6" />}
      >
        <Products
          products={document?.orderProducts || []}
          setDocument={setDocument}
          disabled={document?.state === ORDER_STATES.COMPLETED}
        />
      </Section>
      <Section
        title="Lista de Empaque"
        description="Items físicos de la zona franca a nacionalizar"
        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
      >
        <PackingList
          document={document}
          setDocument={setDocument}
          onHeaderScan={addItem}
          onRemoveItem={removeItem}
          isHeaderInputEnabled={document?.state !== ORDER_STATES.COMPLETED}
          isItemEditable={false}
        />
      </Section>
      <Section
        title="Notas"
        description="Observaciones de la nacionalización"
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
        description="Gestionar el estado de la nacionalización"
        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
      >
        <Actions
          document={document}
          onUpdate={handleUpdate}
          onComplete={handleUpdate}
          onDelete={handleDelete}
          showAdminActions={true}
        />
      </Section>
    </Document>
  );
}
