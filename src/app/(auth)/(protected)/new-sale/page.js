"use client";

import { useOrders } from "@/lib/hooks/useOrders";
import { useRouter } from "next/navigation";
import Document from "@/components/documents/Document";
import { useMemo, useState } from "react";
import moment from "moment-timezone";
import Section from "@/components/ui/Section";
import Products from "@/components/documents/Products";
import { DocumentChartBarIcon } from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import { parseDate } from "@internationalized/date";

export default function NewSalePage() {
  const router = useRouter();
  const { createOrder, creating } = useOrders(
    {},
    {
      enabled: false,
      onCreate: (createdOrder) => {
        console.log("Orden creada exitosamente:", createdOrder);
        router.push(`/sales/${createdOrder.id}`);
      },
    },
  );
  const screenSize = useScreenSize();
  const [document, setDocument] = useState({
    customer: null,
    customerForInvoice: null,
    sourceWarehouse: null,
    state: "draft",
    createdDate: moment().toDate(),
    completedDate: null,
    orderProducts: [],
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
            customerForInvoice: customer,
          });
        },
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
            createdDate: moment(date).toDate(),
          });
        },
      },
      {
        label: "Fecha estimada de Despacho",
        type: "date-picker",
        value: parseDate(
          moment(document?.estimatedCompletedDate).format("YYYY-MM-DD"),
        ),
        onChange: (date) => {
          setDocument({
            ...document,
            estimatedCompletedDate: moment(date).toDate(),
          });
        },
      },
    ];
  }, [document]);

  return (
    <Document title="Nueva Orden Venta" headerFields={headerFields}>
      <Section
        title="Productos"
        description="Productos de la orden de venta"
        color="primary"
        icon={<DocumentChartBarIcon className="w-6 h-6" />}
      >
        <Products
          products={document?.orderProducts || []}
          setDocument={setDocument}
          priceList={
            Array.isArray(document?.customerForInvoice?.prices)
              ? document.customerForInvoice.prices
              : document?.customerForInvoice?.prices?.data || []
          }
        />
      </Section>
      <div className="flex md:justify-end justify-center mt-4">
        <Button
          color="success"
          onPress={async () => {
            const isValid =
              document.customer &&
              document.customerForInvoice &&
              document.sourceWarehouse &&
              document.orderProducts?.length > 0 &&
              document.orderProducts.some(
                (p) => p.product && Number(p.requestedQuantity) > 0,
              );

            if (isValid) {
              const payload = {
                type: "sale",
                products: document.orderProducts
                  .filter((p) => p.product)
                  .map((p) => ({
                    requestedQuantity: Number(p.requestedQuantity),
                    product: p.product.id,
                    price: Number(p.price),
                    name: p.name,
                    ivaIncluded: p.ivaIncluded,
                    invoicePercentage: p.invoicePercentage,
                  })),
                sourceWarehouse: document.sourceWarehouse.id,
                customer: document.customer.id,
                customerForInvoice: document.customerForInvoice.id,
                createdDate: document.createdDate,
                estimatedCompletedDate: document.estimatedCompletedDate,
                // generatedBy: user.id // user is not available in context yet
              };
              await createOrder(payload);
            }
          }}
          isDisabled={
            !(
              document.customer &&
              document.customerForInvoice &&
              document.sourceWarehouse &&
              document.orderProducts?.length > 0 &&
              document.orderProducts.some(
                (p) => p.product && Number(p.requestedQuantity) > 0,
              )
            ) || creating
          }
          isLoading={creating}
          fullWidth={screenSize === "sm" ? true : false}
        >
          Crear Orden
        </Button>
      </div>
    </Document>
  );
}
