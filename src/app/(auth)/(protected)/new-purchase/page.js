"use client";

import { useOrders } from "@/lib/hooks/useOrders";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Document from "@/components/documents/Document";
import { useMemo, useState } from "react";
import moment from "moment-timezone";
import Section from "@/components/ui/Section";
import Products from "@/components/documents/Products";
import { DocumentChartBarIcon } from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import { parseDate } from "@internationalized/date";

export default function NewPurchasePage() {
  const router = useRouter();
  const { createOrder, creating } = useOrders(
    {},
    {
      enabled: false,
      onCreate: (createdOrder) => {
        console.log("Orden creada exitosamente:", createdOrder);
        router.push(`/purchases/${createdOrder.id}`);
      },
      onError: (error) => {
        console.log(error);
        toast.error(
          "Error: La orden no pudo ser creada, verifique que el código de la órden sea unico",
        );
      },
    },
  );

  const screenSize = useScreenSize();
  const [document, setDocument] = useState({
    supplier: null,
    destinationWarehouse: null,
    containerCode: "",
    state: "draft",
    createdDate: moment().toDate(),
    completedDate: null,
    orderProducts: [],
  });

  const headerFields = useMemo(() => {
    return [
      {
        listType: "suppliers",
        label: "Proveedor",
        type: "async-select",
        placeholder: "Selecciona un proveedor",
        selectedOption: document?.supplier,
        selectedOptionLabel: document?.supplier
          ? `${document?.supplier?.name} ${document?.supplier?.lastName || ""}`
          : "",
        render: (supplier) => `${supplier.name} ${supplier.lastName || ""}`,
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
        onChange: (supplier) => {
          setDocument({
            ...document,
            supplier,
          });
        },
      },
      {
        label: "Código de la Orden",
        type: "input",
        placeholder: "Ej: ADX20-2025",
        value: document?.containerCode || "",
        onChange: (value) => setDocument({ ...document, containerCode: value }),
      },
      {
        listType: "warehouses",
        label: "Bodega Destino",
        type: "async-select",
        placeholder: "Selecciona una bodega",
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
      },
      {
        label: "Estado de la Orden",
        type: "select",
        options: [
          { key: "draft", label: "Pendiente" },
          { key: "confirmed", label: "Confirmada" },
          { key: "completed", label: "Recibida" },
        ],
        disabled: true,
        value: document?.state,
        onChange: async (state) => {
          // Logic for state change if needed, disabled for new purchase
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
        label: "Fecha Estimada de Transito",
        type: "date-picker",
        value: parseDate(
          document?.estimatedTransitDate
            ? moment(document?.estimatedTransitDate).format("YYYY-MM-DD")
            : moment().add(30, "days").format("YYYY-MM-DD"),
        ),
        onChange: (date) => {
          setDocument({
            ...document,
            estimatedTransitDate: moment(date).toDate(),
          });
        },
      },
      {
        label: "Fecha Estimada de Recepción",
        type: "date-picker",
        value: parseDate(
          document?.estimatedCompletedDate
            ? moment(document?.estimatedCompletedDate).format("YYYY-MM-DD")
            : moment().add(65, "days").format("YYYY-MM-DD"),
        ),
        fullWidth: true,
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
    <Document title="Nueva Orden de Compra" headerFields={headerFields}>
      <Section
        title="Productos"
        description="Productos de la orden de compra"
        color="primary"
        icon={<DocumentChartBarIcon className="w-6 h-6" />}
      >
        <Products
          products={document?.orderProducts || []}
          setDocument={setDocument}
          priceList={[]} // Purchases don't typically use a customer price list
        />
      </Section>
      <div className="flex md:justify-end justify-center mt-4">
        <Button
          color="success"
          onPress={async () => {
            const isValid =
              document.supplier &&
              document.destinationWarehouse &&
              document.containerCode &&
              document.orderProducts?.length > 0 &&
              document.orderProducts.some(
                (p) => p.product && Number(p.requestedQuantity) > 0,
              );

            if (isValid) {
              const payload = {
                type: "purchase", // Important: Purchase type
                products: document.orderProducts
                  .filter((p) => p.product)
                  .map((p) => ({
                    requestedQuantity: Number(p.requestedQuantity),
                    product: p.product.id,
                    price: Number(p.price || 0), // Cost price if available
                    name: p.name,
                    ivaIncluded: p.ivaIncluded || false,
                    // invoicePercentage might not be relevant for purchases or defaults to 100
                  })),
                destinationWarehouse: document.destinationWarehouse.id,
                supplier: document.supplier.id,
                containerCode: document.containerCode,
                createdDate: document.createdDate,
                estimatedTransitDate: document.estimatedTransitDate,
                estimatedCompletedDate: document.estimatedCompletedDate,
              };
              await createOrder(payload);
            }
          }}
          isDisabled={
            !(
              document.supplier &&
              document.destinationWarehouse &&
              document.containerCode &&
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
