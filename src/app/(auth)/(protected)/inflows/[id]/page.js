"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useOrders } from "@/lib/hooks/useOrders";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { useProductSelector } from "@/lib/hooks/useProductSelector";
import { useProducts } from "@/lib/hooks/useProducts";
import Document from "@/components/documents/Document";
import Section from "@/components/ui/Section";
import Actions from "@/components/documents/Actions";
import Products from "@/components/documents/Products";
import Comments from "@/components/documents/Comments";
import PackingList from "@/components/documents/PackingList";
import {
  ClipboardDocumentListIcon,
  DocumentArrowUpIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/outline";
import { parseDate } from "@internationalized/date";
import moment from "moment-timezone";
import { addToast } from "@heroui/react";
import BulkPackingListUploader from "@/components/documents/BulkPackingListUploader";
import { mapBulkItems } from "@/lib/utils/mapBulkItems";
import { ORDER_STATES } from "@/lib/utils/orderStates";

export default function InflowDetailPage({ params }) {
  const { id } = use(params);
  const { orders, updateOrder, deleteOrder, refetch } = useOrders({
    filters: { id: [id] },
    populate: [
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
      "destinationWarehouse",
    ],
  });
  const [document, setDocument] = useState(orders[0] || null);
  const [loadings, setLoadings] = useState({
    isUpdating: false,
  });
  const { products } = useProducts({});
  const headerFields = useMemo(() => {
    return [
      {
        listType: "warehouses",
        label: "Almacén",
        type: "async-select",
        placeholder: "Selecciona un almacén",
        selectedOption: document?.destinationWarehouse,
        selectedOptionLabel: document?.destinationWarehouse?.name,
        render: (warehouse) => warehouse.name,
        filters: (search) => ({
          name: {
            $containsi: search,
          },
        }),
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
          { key: "completed", label: "Despachada" },
        ],
        disabled: document?.state === ORDER_STATES.COMPLETED,
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
            createdDate: moment(date).toDate(),
          });
        },
      },
      {
        label: "Fecha de Ingreso",
        type: "date-picker",
        value: document?.completedDate
          ? parseDate(moment(document?.completedDate).format("YYYY-MM-DD"))
          : null,
        onChange: (date) => {
          setDocument({
            ...document,
            completedDate: moment(date).toDate(),
          });
        },
        disabled: document?.status !== "completed",
      },
    ];
  }, [document]);
  const handleDelete = async () => {
    if (!document) return;
    try {
      setLoadings({
        isDeleting: true,
      });
      await deleteOrder(document.id);
      addToast({
        title: "Orden eliminada",
        message: "La orden ha sido eliminada correctamente",
        type: "success",
      });
      refetch();
    } catch (error) {
      addToast({
        title: "Error al eliminar la orden",
        message: "La orden no ha podido ser eliminada",
        type: "error",
      });
    } finally {
      setLoadings({
        isDeleting: false,
      });
    }
  };
  const handleUpdate = async (newState = null) => {
    if (!document) return;
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

          // Product must have at least one valid item with quantity, lot, and itemNumber
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
          // Calculate confirmedQuantity sum
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
            price: p.price ? Number(p.price) : 0,
            ivaIncluded: p.ivaIncluded || false,
            invoicePercentage: p.invoicePercentage
              ? Number(p.invoicePercentage)
              : 100,
          };
        });
      const data = {
        products: formattedProducts,
        destinationWarehouse:
          document.destinationWarehouse?.id || document.destinationWarehouse,
        createdDate: document.createdDate,
        confirmedDate: document.confirmedDate,
        completedDate:
          newState === "completed"
            ? moment.tz("America/Bogota").toDate()
            : document.completedDate,
        actualDispatchDate: document.actualDispatchDate,
        state: newState
          ? newState
          : confirmed && document.state === "draft"
            ? "confirmed"
            : document.state,
      };
      if (confirmed && document.state === "draft") {
        data.confirmedDate = moment.tz("America/Bogota").toDate();
      }
      await updateOrder(document.id, data);
      addToast({
        title: "Orden de Entrada Actualizada",
        description: "La orden de entrada ha sido actualizada correctamente",
        type: "success",
      });
    } catch (error) {
      console.error(error);
      addToast({
        title: "Error al actualizar",
        description: "Ocurrió un error al actualizar la orden de entrada",
        type: "error",
      });
    } finally {
      setLoadings({
        isUpdating: false,
      });
    }
  };
  const handleBulkUpload = async (data) => {
    if (!Array.isArray(data)) return;

    const parsedItems = data.map((item) => ({
      productId: item["id"] || item["ID"] || item["Code"] || null,
      name: item["NOMBRE"] || item["Nombre"] || null,
      quantity: Number(item["CANTIDAD"]) || null,
      lotNumber: item["LOTE"] || "",
      itemNumber: item["NUMERO"] || "",
    }));

    await mapBulkItems({
      items: parsedItems,
      currentProducts: document?.orderProducts || [],
      fetchedProducts: products || [],
      setProducts: (productsUpdater) => {
        setDocument((prev) => ({
          ...prev,
          orderProducts:
            typeof productsUpdater === "function"
              ? productsUpdater(prev.orderProducts || [])
              : productsUpdater,
        }));
      },
      toast: {
        success: (msg) =>
          addToast({ title: "Éxito", description: msg, type: "success" }),
        error: (msg) =>
          addToast({ title: "Error", description: msg, type: "error" }),
      },
    });
  };

  useEffect(() => {
    if (orders.length > 0) {
      setDocument(orders[0]);
    }
  }, [orders]);

  return (
    <Document
      title="Orden de Entrada"
      type="inflow"
      document={document}
      setDocument={setDocument}
      headerFields={headerFields}
    >
      <Section
        title="Productos"
        description="Productos de la orden de entrada"
        color="primary"
        icon={<DocumentChartBarIcon className="w-6 h-6" />}
      >
        <Products
          products={document?.orderProducts || []}
          setDocument={setDocument}
          priceList={[]}
          disabled={document?.state === ORDER_STATES.COMPLETED}
        />
      </Section>
      <Section
        title="Lista de Empaque"
        description="Lista de Empaque de la orden de entrada"
        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
      >
        <PackingList
          document={document}
          setDocument={setDocument}
          isHeaderInputEnabled={false}
          isItemEditable={document?.state !== ORDER_STATES.COMPLETED}
        />
      </Section>
      <Section
        title="Carga Masiva de Lista de Empaque"
        description="Carga masiva de lista de empaque de la orden de entrada"
        icon={<DocumentArrowUpIcon className="w-6 h-6" />}
      >
        <BulkPackingListUploader
          onFileLoaded={handleBulkUpload}
          isReadOnly={document?.state === ORDER_STATES.COMPLETED}
        />
      </Section>
      <Section
        title="Comentarios"
        description="Comentarios de la orden de entrada"
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
        description="Acciones de la orden de entrada"
        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
      >
        <Actions
          document={document}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onComplete={handleUpdate}
          loadings={loadings}
          showAdminActions={true}
        />
      </Section>
    </Document>
  );
}
