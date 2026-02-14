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
import { useWarehouses } from "@/lib/hooks/useWarehouses";

export default function NewTransferPage() {
  const router = useRouter();
  const { createOrder, creating } = useOrders(
    {},
    {
      enabled: false,
      onCreate: (createdOrder) => {
        console.log("Orden creada exitosamente:", createdOrder);
        router.push(`/transfers/${createdOrder.id}`);
      },
      onError: (error) => {
        console.log(error);
        toast.error("Error: La orden no pudo ser creada");
      },
    },
  );

  const screenSize = useScreenSize();
  const { warehouses = [] } = useWarehouses({});

  const [document, setDocument] = useState({
    sourceWarehouse: null,
    destinationWarehouse: null,
    state: "draft",
    createdDate: moment().toDate(),
    orderProducts: [],
  });

  const headerFields = useMemo(() => {
    return [
      {
        listType: "warehouses",
        label: "Bodega Origen",
        type: "select",
        placeholder: "Selecciona una bodega",
        selectedOption: document?.sourceWarehouse,
        options: warehouses
          .filter((w) => w.type === "stock" || w.type === "printlab")
          .map((w) => ({ label: w.name, value: w })),
        value: document?.sourceWarehouse?.id,
        onChange: (id) => {
          setDocument({
            ...document,
            sourceWarehouse: warehouses.find((w) => w.id === id),
          });
        },
      },
      {
        listType: "warehouses",
        label: "Bodega Destino",
        type: "select",
        placeholder: "Selecciona una bodega",
        selectedOption: document?.destinationWarehouse,
        options: warehouses
          .filter((w) => w.type === "stock" || w.type === "printlab")
          .map((w) => ({ label: w.name, value: w })),
        value: document?.destinationWarehouse?.id,
        onChange: (id) => {
          setDocument({
            ...document,
            destinationWarehouse: warehouses.find((w) => w.id === id),
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
  }, [document, warehouses]);

  const productColumns = [
    { key: "name", label: "Producto" },
    { key: "requestedQuantity", label: "Cantidad" },
    { key: "remove", label: "Eliminar" },
  ];

  return (
    <Document
      title="Nueva Transferencia de Inventario"
      headerFields={headerFields}
    >
      <Section
        title="Productos"
        description="Productos a transferir"
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
              document.sourceWarehouse &&
              document.destinationWarehouse &&
              document.orderProducts?.length > 0 &&
              document.orderProducts.some(
                (p) => p.product && Number(p.requestedQuantity) > 0,
              );

            if (isValid) {
              const payload = {
                type: "transfer",
                products: document.orderProducts
                  .filter((p) => p.product)
                  .map((p) => ({
                    requestedQuantity: Number(p.requestedQuantity),
                    product: p.product.id,
                    price: 0,
                  })),
                sourceWarehouse: document.sourceWarehouse.id,
                destinationWarehouse: document.destinationWarehouse.id,
                createdDate: document.createdDate,
              };
              await createOrder(payload);
            }
          }}
          isDisabled={
            !(
              document.sourceWarehouse &&
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
          Crear Transferencia
        </Button>
      </div>
    </Document>
  );
}
