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
import PInvoice from "@/components/documents/PInvoice";
import Comments from "@/components/documents/Comments";
import Actions from "@/components/documents/Actions";
import Products from "@/components/documents/Products";
import { addToast } from "@heroui/react";
import { ORDER_STATES } from "@/lib/utils/orderStates";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks/useUser";

export default function SaleDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const {
    orders,
    updateOrder,
    deleteOrder,
    refetch,
    addItem,
    removeItem,
    getInvoices,
  } = useOrders({
    filters: { id: [id] },
    populate: [
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
      "customer",
      "customer.parties",
      "customer.parties.taxes",
      "customer.prices",
      "customer.prices.product",
      "customer.taxes",
      "customerForInvoice",
      "customerForInvoice.prices",
      "customerForInvoice.prices.product",
      "customerForInvoice.taxes",
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
        listType: "customers",
        populate: [
          "parties",
          "parties.taxes",
          "prices",
          "prices.product",
          "taxes",
        ],
        label: "Cliente",
        type: "async-select",
        placeholder: "Selecciona un cliente",
        selectedOption: document?.customer,
        selectedOptionLabel: document?.customer
          ? `${document?.customer?.name} ${document?.customer?.lastName ? document?.customer?.lastName : ""}`
          : "",
        render: (customer) =>
          `${customer.name} ${customer.lastName ? customer.lastName : ""}`,
        filters: (search) => {
          if (!search) return {};
          const terms = search.split(/\s+/).filter(Boolean);
          if (terms.length === 0) return {};

          return {
            $and: terms.map((term) => ({
              $or: [
                { name: { $containsi: term } },
                { lastName: { $containsi: term } },
                { identification: { $containsi: term } },
                { email: { $containsi: term } },
              ],
            })),
          };
        },
        onChange: (customer) => {
          setDocument({
            ...document,
            customer,
          });
        },
        disabled:
          document?.state === ORDER_STATES.COMPLETED && user?.type !== "admin",
      },
      {
        listType: "customers",
        populate: [
          "parties",
          "parties.taxes",
          "prices",
          "prices.product",
          "taxes",
        ],
        label: "Cliente para Factura",
        type: "async-select",
        placeholder: "Selecciona un cliente para factura",
        selectedOption: document?.customerForInvoice,
        selectedOptionLabel: document?.customerForInvoice
          ? `${document?.customerForInvoice?.name} ${document?.customerForInvoice?.lastName ? document?.customerForInvoice?.lastName : ""}`
          : "",
        render: (customerForInvoice) =>
          `${customerForInvoice.name} ${customerForInvoice.lastName ? customerForInvoice.lastName : ""}`,
        filters: (search) => {
          if (!search) return {};
          const terms = search.split(/\s+/).filter(Boolean);
          if (terms.length === 0) return {};

          return {
            $and: terms.map((term) => ({
              $or: [
                { name: { $containsi: term } },
                { lastName: { $containsi: term } },
                { identification: { $containsi: term } },
                { email: { $containsi: term } },
              ],
            })),
          };
        },
        onChange: (customerForInvoice) => {
          setDocument({
            ...document,
            customerForInvoice,
          });
        },
        disabled:
          document?.state === ORDER_STATES.COMPLETED && user?.type !== "admin",
      },
      {
        listType: "warehouses",
        label: "Almacén",
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
          { key: "draft", label: "Pendiente" },
          { key: "confirmed", label: "Confirmada" },
          { key: "completed", label: "Despachada" },
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
        label: "Fecha Estimada de Despacho",
        type: "date-picker",
        value: document?.estimatedCompletedDate
          ? parseDate(
              moment(document?.estimatedCompletedDate).format("YYYY-MM-DD"),
            )
          : null,
        onChange: (date) => {
          setDocument({
            ...document,
            estimatedCompletedDate: moment(date.toString()).toDate(),
          });
        },
        disabled:
          document?.state === ORDER_STATES.COMPLETED && user?.type !== "admin",
      },
      {
        label: "Fecha de Despacho",
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
  }, [orders, document, user]);
  const handleDelete = async () => {
    try {
      setLoadings({
        ...loadings,
        isDeleting: true,
      });
      await deleteOrder(document.id);
      addToast({
        title: "Orden Eliminada",
        description: "La orden ha sido eliminada correctamente",
        type: "success",
      });
      router.push("/sales");
    } catch (error) {
      console.error(error);
      addToast({
        title: "Error al eliminar",
        description: "Ocurrió un error al eliminar la orden",
        type: "error",
      });
    } finally {
      setLoadings({
        ...loadings,
        isDeleting: false,
      });
    }
  };
  const handleUpdate = async (newState = null, emitInvoice = false) => {
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
        customer: document.customer?.id || document.customer,
        customerForInvoice:
          document.customerForInvoice?.id || document.customerForInvoice,
        sourceWarehouse:
          document.sourceWarehouse?.id || document.sourceWarehouse,
        createdDate: document.createdDate,
        confirmedDate: document.confirmedDate,
        completedDate:
          newState === "completed"
            ? moment.tz("America/Bogota").toDate()
            : document.completedDate,
        estimatedCompletedDate: document.estimatedCompletedDate,
        state: newState
          ? newState
          : confirmed && document.state === "draft"
            ? "confirmed"
            : document.state,
        emitInvoice: emitInvoice,
      };
      if (confirmed && document.state === "draft") {
        data.confirmedDate = moment.tz("America/Bogota").toDate();
      }
      await updateOrder(document.id, data);
      await refetch();

      addToast({
        title: "Orden de Venta Actualizada",
        description: "La orden de venta ha sido actualizada correctamente",
        type: "success",
      });
    } catch (error) {
      console.error(error);
      addToast({
        title: "Error al actualizar",
        description: "Ocurrió un error al actualizar la orden de venta",
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

  return (
    <Document
      title="Orden de Venta"
      type="sale"
      document={document}
      setDocument={setDocument}
      headerFields={headerFields}
    >
      <Section
        title="Productos"
        description="Productos de la orden de venta"
        color="primary"
        icon={<DocumentChartBarIcon className="w-6 h-6" />}
      >
        <Products
          products={document?.orderProducts || []}
          setDocument={setDocument}
          priceList={document?.customerForInvoice?.prices || []}
          disabled={
            document?.state === ORDER_STATES.COMPLETED && user?.type !== "admin"
          }
        />
      </Section>
      <Section
        title="Lista de Empaque"
        description="Lista de Empaque de la orden de venta"
        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
      >
        <PackingList
          document={document}
          setDocument={setDocument}
          onHeaderScan={addItem}
          onRemoveItem={removeItem}
          isHeaderInputEnabled={
            document?.state !== ORDER_STATES.COMPLETED || user?.type === "admin"
          }
          isItemEditable={false}
        />
      </Section>
      <Section
        title="Comentarios"
        description="Comentarios de la orden de venta"
        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
      >
        <Comments
          comments={document?.notes || ""}
          setDocument={setDocument}
          disabled={
            document?.state === ORDER_STATES.COMPLETED && user?.type !== "admin"
          }
        />
      </Section>
      <Section
        title="Factura"
        description="Factura de la orden de venta"
        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
      >
        <PInvoice
          document={document}
          setDocument={setDocument}
          taxes={document?.customerForInvoice?.taxes || []}
        />
      </Section>
      <Section
        title="Acciones"
        description="Acciones de la orden de venta"
        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
      >
        <Actions
          document={document}
          onUpdate={handleUpdate}
          onComplete={handleUpdate}
          onInvoice={handleUpdate}
          getInvoices={getInvoices}
          onDelete={handleDelete}
          loadings={loadings}
        />
      </Section>
    </Document>
  );
}
