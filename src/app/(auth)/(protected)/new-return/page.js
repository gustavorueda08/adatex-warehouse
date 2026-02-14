"use client";

import { useOrders } from "@/lib/hooks/useOrders";
import { useRouter } from "next/navigation";
import Document from "@/components/documents/Document";
import { useMemo, useState } from "react";
import moment from "moment-timezone";
import Section from "@/components/ui/Section";
import ReturnProducts from "@/components/documents/ReturnProducts";
import { DocumentChartBarIcon } from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import { parseDate } from "@internationalized/date";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { buildInvoiceLabel } from "@/lib/utils/invoiceLabel";
import { ORDER_STATES } from "@/lib/utils/orderStates";

export default function NewReturnPage() {
  const router = useRouter();
  const { createOrder, creating } = useOrders(
    {},
    {
      enabled: false,
      onCreate: (createdOrder) => {
        console.log("Devolución creada exitosamente:", createdOrder);
        router.push(`/returns/${createdOrder.id}`);
      },
    },
  );
  const screenSize = useScreenSize();
  const { warehouses = [] } = useWarehouses({});

  const [document, setDocument] = useState({
    customer: null,
    selectedOrder: null,
    destinationWarehouse: null,
    returnReason: null,
    state: "draft",
    createdDate: moment().toDate(),
    orderProducts: [],
    parentOrder: null,
  });

  const headerFields = useMemo(() => {
    return [
      {
        label: "Orden de Venta",
        type: "async-select",
        listType: "orders",
        placeholder: "Buscar orden...",
        selectedOption: document?.parentOrder,
        selectedOptionLabel: document?.parentOrder
          ? buildInvoiceLabel(document.parentOrder)
          : "",
        render: (order) => {
          const customerName = order?.customer
            ? `${order.customer.name} ${order.customer.lastName || ""}`
            : "Sin cliente";
          return `${buildInvoiceLabel(order)} - ${customerName}`;
        },
        filters: (search) => {
          if (!search) return { type: "sale", state: "completed" };
          return {
            type: "sale",
            state: "completed",
            $or: [
              { code: { $containsi: search } },
              { customer: { name: { $containsi: search } } },
              { customer: { lastName: { $containsi: search } } },
            ],
          };
        },
        onChange: (parentOrder) => {
          if (parentOrder) {
            // Cargar los orderProducts de la orden seleccionada
            const orderProductsWithSelection = (
              parentOrder.orderProducts || []
            ).map((op) => ({
              ...op,
              items: (op.items || []).map((item) => ({
                ...item,
                selected: false,
                returnQuantity: 0,
                originalQuantity: item.quantity || item.currentQuantity || 0,
              })),
            }));

            setDocument({
              ...document,
              parentOrder,
              customer: parentOrder.customer,
              orderProducts: orderProductsWithSelection,
            });
          } else {
            setDocument({
              ...document,
              parentOrder: null,
              customer: null,
              orderProducts: [],
            });
          }
        },
        populate: [
          "customer",
          "sourceWarehouse",
          "orderProducts",
          "orderProducts.items",
          "orderProducts.product",
        ],
      },
      {
        label: "Cliente",
        type: "input",
        disabled: true,
        value: document.customer
          ? `${document.customer.name} ${document.customer.lastName || ""}`
          : "",
        placeholder: "Seleccione una orden",
        onChange: () => {},
      },
      {
        listType: "warehouses",
        label: "Bodega Destino (para devolución)",
        type: "async-select",
        placeholder: "Selecciona una bodega",
        selectedOption: document?.destinationWarehouse,
        selectedOptionLabel: document?.destinationWarehouse?.name || "",
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
    ];
  }, [document]);

  // Validación
  const isValid = useMemo(() => {
    if (!document.parentOrder || !document.destinationWarehouse) {
      return false;
    }

    // Verificar que haya al menos un item seleccionado con cantidad válida
    const hasValidItems = document.orderProducts.some((op) =>
      (op.items || []).some(
        (item) => item.selected && Number(item.returnQuantity) > 0,
      ),
    );

    return hasValidItems;
  }, [document]);

  return (
    <Document title="Nueva Devolución" headerFields={headerFields}>
      <Section
        title="Items a devolver"
        description="Selecciona los productos y cantidades a devolver"
        color="primary"
        icon={<DocumentChartBarIcon className="w-6 h-6" />}
      >
        <ReturnProducts
          orderProducts={document?.orderProducts || []}
          setDocument={setDocument}
          disabled={creating}
        />
      </Section>
      <div className="flex md:justify-end justify-center mt-4">
        <Button
          color="success"
          onPress={async () => {
            if (isValid) {
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

              const payload = {
                type: "return",
                products: Array.from(productsMap.values()),
                destinationWarehouse: document.destinationWarehouse.id,
                parentOrder: document.parentOrder.id,
                notes: document.returnReason,
                createdDate: document.createdDate,
                state: ORDER_STATES.CONFIRMED,
              };
              await createOrder(payload);
            }
          }}
          isDisabled={!isValid || creating}
          isLoading={creating}
          fullWidth={screenSize === "sm" ? true : false}
        >
          Crear Devolución
        </Button>
      </div>
    </Document>
  );
}
