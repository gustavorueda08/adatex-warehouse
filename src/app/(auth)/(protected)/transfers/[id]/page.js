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
import { useRouter } from "next/navigation";

export default function TransferDetailPage({ params }) {
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
        "destinationWarehouse",
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
        label: "Bodega Origen",
        type: "async-select",
        placeholder: "Selecciona una bodega",
        selectedOption: document?.sourceWarehouse,
        selectedOptionLabel: document?.sourceWarehouse?.name || "",
        render: (warehouse) => `${warehouse?.name}`,
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
          setDocument({
            ...document,
            sourceWarehouse,
          });
        },
        disabled: document?.state === ORDER_STATES.COMPLETED,
      },
      {
        listType: "warehouses",
        label: "Bodega Destino",
        type: "async-select",
        placeholder: "Selecciona una bodega",
        selectedOption: document?.destinationWarehouse,
        selectedOptionLabel: document?.destinationWarehouse?.name || "",
        render: (warehouse) => `${warehouse?.name}`,
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
          setDocument({
            ...document,
            destinationWarehouse,
          });
        },
        disabled: document?.state === ORDER_STATES.COMPLETED,
      },
      {
        label: "Estado de la Orden",
        type: "select",
        options: [
          { key: "draft", label: "Pendiente" },
          { key: "confirmed", label: "Confirmada" },
          { key: "completed", label: "Completada" },
        ],
        disabled: true,
        value: document?.state,
        onChange: async (state) => {
          const newDocument = { ...document, state };
          await handleUpdate(newDocument);
          setDocument(newDocument);
        },
      },
      {
        label: "Fecha de Creación",
        type: "date-picker",
        disabled: true,
        value: parseDate(moment(document?.createdDate).format("YYYY-MM-DD")),
        onChange: (date) => {
          setDocument({
            ...document,
            createdDate: moment(date.toString()).toDate(),
          });
        },
      },
      {
        label: "Fecha de Completado",
        type: "date-picker",
        fullWidth: true,
        value: document?.completedDate
          ? parseDate(moment(document?.completedDate).format("YYYY-MM-DD"))
          : null,
        onChange: (date) => {
          setDocument({
            ...document,
            completedDate: moment(date.toString()).toDate(),
          });
        },
        disabled: true,
      },
    ];
  }, [orders, document]);

  const handleDelete = async () => {
    try {
      setLoadings({
        ...loadings,
        isDeleting: true,
      });
      await deleteOrder(document.id);
      addToast({
        title: "Transferencia Eliminada",
        description: "La transferencia ha sido eliminada correctamente",
        type: "success",
      });
      router.push("/transfers");
    } catch (error) {
      console.error(error);
      addToast({
        title: "Error al eliminar",
        description: "Ocurrió un error al eliminar la transferencia",
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
          return (
            validItems.length > 0 &&
            validItems.every((item) => {
              const qty = Number(item.currentQuantity);
              return (
                qty > 0 &&
                item.lotNumber !== "" &&
                item.lotNumber !== null &&
                item.lotNumber !== undefined &&
                item.itemNumber !== "" &&
                item.itemNumber !== null &&
                item.itemNumber !== undefined
              );
            })
          );
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
          const confirmedQuantity = validItems.reduce(
            (sum, item) => sum + (Number(item.currentQuantity) || 0),
            0,
          );
          const items = validItems.map((item) => ({
            id: item.id,
            quantity: Number(item.currentQuantity),
            lot: Number(item.lotNumber) || null,
            itemNumber: Number(item.itemNumber) || null,
          }));

          return {
            product: p.product.id || p.product,
            items: items,
            confirmedQuantity,
            requestedQuantity: p.requestedQuantity
              ? Number(p.requestedQuantity)
              : 0,
            price: 0,
          };
        });
      const data = {
        products: formattedProducts,
        sourceWarehouse:
          document.sourceWarehouse?.id || document.sourceWarehouse,
        destinationWarehouse:
          document.destinationWarehouse?.id || document.destinationWarehouse,
        createdDate: document.createdDate,
        confirmedDate: document.confirmedDate,
        completedDate:
          newState === "completed"
            ? moment.tz("America/Bogota").toDate()
            : document.completedDate,
        state: newState
          ? newState
          : confirmed && document.state === "draft"
            ? "confirmed"
            : document.state,
      };
      if (confirmed && document.state === "draft") {
        data.confirmedDate = moment.tz("America/Bogota").toDate();
      }
      const result = await updateOrder(document.id, data);
      if (!result.success) {
        throw result.error;
      }

      addToast({
        title: "Transferencia Actualizada",
        description: "La transferencia ha sido actualizada correctamente",
        type: "success",
      });
      await refetch();
    } catch (error) {
      console.error(error);
      let isNegativeStock = false;
      let negativeStockMessage = "";

      try {
        const errObj = JSON.parse(error.message);
        if (errObj.code === "NEGATIVE_STOCK") {
          isNegativeStock = true;
          negativeStockMessage = errObj.message;
        }
      } catch (e) {
        // Not a JSON error
      }

      if (isNegativeStock) {
        addToast({
          title: "Error de Inventario",
          description: negativeStockMessage,
          color: "danger",
        });
      } else {
        addToast({
          title: "Error al actualizar",
          description: "Ocurrió un error al actualizar la transferencia",
          type: "error",
        });
      }
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

  return (
    <Document
      title="Transferencia de Inventario"
      type="transfer"
      document={document}
      setDocument={setDocument}
      headerFields={headerFields}
    >
      <Section
        title="Productos"
        description="Productos de la transferencia"
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
        description="Lista de empaque de la transferencia"
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
        title="Comentarios"
        description="Comentarios de la transferencia"
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
        description="Acciones de la transferencia"
        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
      >
        <Actions
          document={document}
          onUpdate={handleUpdate}
          onComplete={handleUpdate}
          onDelete={handleDelete}
          loadings={loadings}
          showAdminActions={true}
        />
      </Section>
    </Document>
  );
}
