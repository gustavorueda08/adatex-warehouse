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
import RoleGuard from "@/components/auth/RoleGuard";

function NewInflowPageInner() {
  const router = useRouter();
  const { createOrder, creating } = useOrders(
    {},
    {
      enabled: false,
      onCreate: (createdOrder) => {
        console.log("Orden creada exitosamente:", createdOrder);
        router.push(`/inflows/${createdOrder.id}`);
      },
      onError: (error) => {
        console.log(error);
        toast.error("Error: La orden no pudo ser creada");
      },
    },
  );

  const screenSize = useScreenSize();

  const [document, setDocument] = useState({
    type: "in",
    destinationWarehouse: null,
    state: "draft",
    createdDate: moment().toDate(),
    orderProducts: [],
  });

  const headerFields = useMemo(() => {
    return [
      {
        listType: "warehouses",
        label: "Bodega Destino",
        type: "async-select",
        placeholder: "Selecciona una bodega",
        selectedOption: document?.destinationWarehouse,
        selectedOptionLabel: document?.destinationWarehouse?.name,
        render: (warehouse) => `${warehouse.name}`,
        onChange: (warehouse) => {
          setDocument({
            ...document,
            destinationWarehouse: warehouse,
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

  const productColumns = [
    { key: "name", label: "Producto" },
    { key: "requestedQuantity", label: "Cantidad" },
    { key: "remove", label: "Eliminar" },
  ];

  return (
    <Document title="Nueva Entrada de Inventario" headerFields={headerFields}>
      <Section
        title="Productos"
        description="Productos a ingresar"
        color="primary"
        icon={<DocumentChartBarIcon className="w-6 h-6" />}
      >
        <Products
          products={document?.orderProducts || []}
          setDocument={setDocument}
          columns={productColumns}
        />
      </Section>
      <div className="flex md:justify-end justify-center mt-4">
        <Button
          color="success"
          onPress={async () => {
            const isValid =
              document.destinationWarehouse &&
              document.orderProducts?.length > 0 &&
              document.orderProducts.some(
                (p) => p.product && Number(p.requestedQuantity) > 0,
              );

            if (isValid) {
              const payload = {
                type: "in",
                products: document.orderProducts
                  .filter((p) => p.product)
                  .map((p) => ({
                    requestedQuantity: Number(p.requestedQuantity),
                    product: p.product.id,
                    price: 0,
                  })),
                destinationWarehouse: document.destinationWarehouse.id,
                createdDate: document.createdDate,
              };
              await createOrder(payload);
            }
          }}
          isDisabled={
            !(
              document.destinationWarehouse &&
              document.orderProducts?.length > 0 &&
              document.orderProducts.some(
                (p) => p.product && Number(p.requestedQuantity) > 0,
              )
            ) || creating
          }
          isLoading={creating}
          fullWidth={screenSize === "sm" ? true : false}
        >
          Crear Entrada
        </Button>
      </div>
    </Document>
  );
}


export default function NewInflowPage(params) {
  return (
    <RoleGuard forbiddenRoles={["seller"]} fallbackRoute="/">
      <NewInflowPageInner {...params} />
    </RoleGuard>
  );
}
