"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import moment from "moment-timezone";
import { parseDate } from "@internationalized/date";
import {
  ClipboardDocumentListIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/outline";
import { addToast, Button } from "@heroui/react";

import Document from "@/components/documents/Document";
import Section from "@/components/ui/Section";
import Comments from "@/components/documents/Comments";
import TransformProducts from "@/components/documents/TransformProducts";
import { useOrders } from "@/lib/hooks/useOrders";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import RoleGuard from "@/components/auth/RoleGuard";

function NewTransformPageInner() {
  const router = useRouter();
  const screenSize = useScreenSize();

  const { createOrder, creating } = useOrders(
    {},
    {
      enabled: false,
      onCreate: (createdOrder) => {
        addToast({
          title: "Transformación Creada",
          description: "La transformación ha sido creada correctamente",
          type: "success",
        });
        router.push(`/transformations/${createdOrder.id}`);
      },
      onError: (error) => {
        console.error(error);
        addToast({
          title: "Error al crear",
          description: "La transformación no pudo ser creada",
          type: "error",
        });
      },
    },
  );

  const [document, setDocument] = useState({
    state: "draft",
    sourceWarehouse: null,
    destinationWarehouse: null,
    createdDate: moment().toDate(),
    notes: "",
    products: [],
    transformType: "cut", // Initialize with default
  });

  const headerFields = useMemo(() => {
    return [
      {
        listType: "warehouses",
        label: "Bodega Origen",
        type: "async-select",
        placeholder: "Selecciona bodega origen",
        selectedOption: document?.sourceWarehouse,
        selectedOptionLabel: document?.sourceWarehouse?.name || "",
        render: (warehouse) => warehouse.name,
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
          setDocument((prev) => ({
            ...prev,
            sourceWarehouse,
          }));
        },
      },
      {
        listType: "warehouses",
        label: "Bodega Destino",
        type: "async-select",
        placeholder: "Selecciona bodega destino",
        selectedOption: document?.destinationWarehouse,
        selectedOptionLabel: document?.destinationWarehouse?.name || "",
        render: (warehouse) => warehouse.name,
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
          setDocument((prev) => ({
            ...prev,
            destinationWarehouse,
          }));
        },
      },
      {
        label: "Fecha de Creación",
        type: "date-picker",
        disabled: true,
        value: parseDate(moment(document?.createdDate).format("YYYY-MM-DD")),
        onChange: () => {},
      },
      {
        label: "Tipo de Transformación",
        type: "select",
        value: document?.transformType || "cut",
        onChange: (transformType) => {
          setDocument((prev) => ({
            ...prev,
            transformType,
          }));
        },
        options: [
          {
            key: "cut",
            label: "Corte",
          },
          {
            key: "transform",
            label: "Conversión",
          },
        ],
      },
    ];
  }, [document]);

  const isValid = useMemo(() => {
    const type = document.transformType || "cut";
    const isDestinationValid =
      type === "cut"
        ? true // For cuts, destination is optional/same as source
        : !!document.destinationWarehouse;

    // Filter out rows that are completely empty/ghost rows (missing source)
    const activeRows = (document.products || []).filter(
      (p) => p.sourceItem && p.sourceProduct,
    );

    const validRows = activeRows.filter((p) => {
      // Specific validation based on type
      if (type === "cut") {
        return (
          p.items &&
          p.items.length > 0 &&
          p.items.some((item) => Number(item.quantity) > 0)
        );
      } else {
        // For transforms: check targetProduct, sourceQuantity, targetQuantity
        return (
          p.targetProduct &&
          Number(p.sourceQuantity) > 0 &&
          Number(p.targetQuantity) > 0
        );
      }
    });

    return (
      document.sourceWarehouse && isDestinationValid && validRows.length > 0
    );
  }, [document]);

  const handleCreate = async () => {
    if (!isValid) return;

    // Agrupar items por producto destino
    const groupedProducts = {};
    const activeRows = (document.products || []).filter(
      (row) => row.sourceProduct && row.sourceItem,
    );

    activeRows.forEach((row) => {
      // Determine target product based on transform type or fallback
      let targetProduct = row.targetProduct;
      // For cuts, target product IS source product
      if (document.transformType === "cut") {
        targetProduct = row.sourceProduct;
      }

      if (!targetProduct) return;

      const targetProductId = targetProduct.id;
      if (!groupedProducts[targetProductId]) {
        groupedProducts[targetProductId] = {
          product: targetProductId,
          requestedQuantity: 0,
          items: [],
        };
      }

      // Handle items array from CutItemsModal
      const itemsToProcess =
        row.items && row.items.length > 0
          ? row.items
          : [{ quantity: row.targetQuantity }];

      itemsToProcess.forEach((item) => {
        const quantity = Number(item.quantity);
        if (quantity > 0) {
          groupedProducts[targetProductId].requestedQuantity += quantity;

          // Construct the item payload
          const itemPayload = {
            sourceItemId: row.sourceItem.id || row.sourceItem,
            quantity: quantity,
            targetQuantity: quantity,
            // For cuts, sourceQuantityConsumed equals the new item quantity usually
            // For transforms, it comes from sourceQuantity input
            sourceQuantityConsumed:
              document.transformType === "cut"
                ? quantity
                : Number(row.sourceQuantity || 0),
          };
          groupedProducts[targetProductId].items.push(itemPayload);
        }
      });
    });

    const payload = {
      type: "transform",
      state: "confirmed", // Set directly to confirmed as per requirement usually, or draft
      sourceWarehouse: document.sourceWarehouse?.id,
      destinationWarehouse: document.destinationWarehouse?.id,
      products: Object.values(groupedProducts),
      notes: document.notes || "",
      createdDate: document.createdDate,
    };

    console.log(payload, JSON.stringify(payload));

    await createOrder(payload);
  };

  return (
    <Document title="Nueva Transformación" headerFields={headerFields}>
      <Section
        title="Transformación"
        description="Define los items a consumir y los productos a generar"
        color="primary"
        icon={<DocumentChartBarIcon className="w-6 h-6" />}
      >
        <TransformProducts
          products={document.products}
          setDocument={setDocument}
          sourceWarehouse={document.sourceWarehouse}
          disabled={creating}
          transformType={document.transformType || "cut"}
        />
      </Section>

      <Section
        title="Comentarios"
        description="Notas sobre la transformación"
        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
      >
        <Comments comments={document?.notes || ""} setDocument={setDocument} />
      </Section>

      <div className="flex md:justify-end justify-center mt-4">
        <Button
          color="success"
          isLoading={creating}
          isDisabled={!isValid || creating}
          onPress={handleCreate}
          fullWidth={screenSize === "sm"}
        >
          Crear Transformación
        </Button>
      </div>
    </Document>
  );
}


export default function NewTransformPage(params) {
  return (
    <RoleGuard forbiddenRoles={["seller"]} fallbackRoute="/">
      <NewTransformPageInner {...params} />
    </RoleGuard>
  );
}
