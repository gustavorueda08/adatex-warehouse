"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useOrders } from "@/lib/hooks/useOrders";
import { useProducts } from "@/lib/hooks/useProducts";
import Document from "@/components/documents/Document";
import Section from "@/components/ui/Section";
import Actions from "@/components/documents/Actions";
import Products from "@/components/documents/Products";
import PInvoice from "@/components/documents/PInvoice";
import Comments from "@/components/documents/Comments";
import PackingList from "@/components/documents/PackingList";
import NationalizationPanel from "@/components/documents/NationalizationPanel";
import {
  ClipboardDocumentListIcon,
  DocumentArrowUpIcon,
  DocumentChartBarIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { parseDate } from "@internationalized/date";
import moment from "moment-timezone";
import { addToast } from "@heroui/react";
import toast from "react-hot-toast";
import BulkPackingListUploader from "@/components/documents/BulkPackingListUploader";
import { mapBulkItems } from "@/lib/utils/mapBulkItems";
import { ORDER_STATES } from "@/lib/utils/orderStates";
import RoleGuard from "@/components/auth/RoleGuard";
import { getPartyLabel } from "@/lib/utils/getPartyLabel";
import { useRouter } from "next/navigation";

export default function PurchaseDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  // Solo fetch del documento con todas sus relaciones
  const {
    orders,
    updateOrder,
    deleteOrder,
    createNationalization,
    getNationalizableItems,
    createPurchaseInvoice,
    updatePurchaseInvoice,
  } = useOrders({
    filters: { id: [id] },
    populate: [
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
      "orderProducts.items.warehouse",
      "supplier",
      "supplier.prices",
      "destinationWarehouse",
    ],
  });

  const [document, setDocument] = useState(orders[0] || null);

  // Hook para obtener productos para mapBulkItems
  const { products } = useProducts({});

  // Auto-populate siigoCostCenterName from containerCode when not set
  useEffect(() => {
    if (
      document?.containerCode &&
      !document?.siigoCostCenterName &&
      !document?.siigoCostCenterId
    ) {
      const derivedName = document.containerCode.replace(/-\d+$/, "");
      setDocument((prev) => ({ ...prev, siigoCostCenterName: derivedName }));
    }
  }, [document?.containerCode]);

  useEffect(() => {
    if (orders.length > 0) {
      const order = orders[0];
      // Auto-assign estimated dates if missing, using the same defaults as the date-pickers
      if (!order.estimatedTransitDate) {
        order.estimatedTransitDate = moment(order.createdDate)
          .add(35, "days")
          .toDate();
      }
      if (!order.estimatedCompletedDate) {
        order.estimatedCompletedDate = moment(order.createdDate)
          .add(65, "days")
          .toDate();
      }
      setDocument(order);
    }
  }, [orders]);

  const headerFields = useMemo(() => {
    return [
      {
        listType: "suppliers",
        populate: ["prices", "prices.product"],
        label: "Proveedor",
        type: "async-select",
        placeholder: "Selecciona un proveedor",
        selectedOption: document?.supplier,
        selectedOptionLabel: getPartyLabel(document?.supplier),
        render: (supplier) => getPartyLabel(supplier),
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
        disabled: document?.state === ORDER_STATES.COMPLETED,
      },
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
        disabled: false,
        value: document?.state,
        onChange: (state) => {
          const newDocument = { ...document, state };
          handleUpdate(newDocument);
          setDocument(newDocument);
        },
        disabled: document?.state === ORDER_STATES.COMPLETED,
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
        label: "Fecha Estimada de Tránsito",
        type: "date-picker",
        disabled: document?.state === ORDER_STATES.COMPLETED,
        value: parseDate(
          document?.estimatedTransitDate
            ? moment(document?.estimatedTransitDate).format("YYYY-MM-DD")
            : moment(document?.createdDate)
                .add(35, "days")
                .format("YYYY-MM-DD"),
        ),
        onChange: (date) => {
          setDocument({
            ...document,
            estimatedTransitDate: moment(date.toString()).toDate(),
          });
        },
      },
      {
        label: "Fecha de Tránsito",
        type: "date-picker",
        value: document?.transitDate
          ? parseDate(moment(document?.transitDate).format("YYYY-MM-DD"))
          : null,
        onChange: (date) => {
          setDocument({
            ...document,
            transitDate: moment(date.toString()).toDate(),
          });
        },
        disabled: document?.state === ORDER_STATES.COMPLETED,
      },
      {
        label: "Fecha Estimada de Recepción",
        type: "date-picker",
        disabled: document?.state === ORDER_STATES.COMPLETED,
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
      },
      {
        label: "Fecha de Recepción",
        type: "date-picker",
        value: document?.completedDate
          ? parseDate(moment(document?.completedDate).format("YYYY-MM-DD"))
          : null,
        onChange: (date) => {
          setDocument({
            ...document,
            completedDate: moment(date.toString()).toDate(),
          });
        },
        disabled: document?.state === ORDER_STATES.COMPLETED,
      },
      {
        label: "Prefijo Factura Proveedor",
        type: "input",
        placeholder: "Ej: FP",
        value: document?.supplierInvoicePrefix || "",
        disabled: !!document?.purchaseSiigoId,
        onChange: (e) => {
          setDocument({ ...document, supplierInvoicePrefix: e.target.value });
        },
      },
      {
        label: "N° Factura Proveedor",
        type: "input",
        placeholder: "Ej: 1234",
        value: document?.supplierInvoiceNumber || "",
        disabled: !!document?.purchaseSiigoId,
        onChange: (e) => {
          setDocument({ ...document, supplierInvoiceNumber: e.target.value });
        },
      },
      {
        label: document?.siigoCostCenterId
          ? `Centro de Costos Siigo (ID: ${document.siigoCostCenterId})`
          : "Centro de Costos Siigo",
        type: "input",
        placeholder: "Ej: ADX23-2025 (auto-detectado del contenedor)",
        value: document?.siigoCostCenterName || "",
        disabled: !!document?.siigoCostCenterId,
        onChange: (e) => {
          setDocument({
            ...document,
            siigoCostCenterName: e.target.value,
            siigoCostCenterId: null,
          });
        },
      },
    ];
  }, [document]);
  const handleDelete = () => {
    router.push("/purchases");

    const deletePromise = deleteOrder(document.id, { background: true }).then(
      (result) => {
        if (!result.success) throw new Error("Error al eliminar");
        return result;
      },
    );
    toast.promise(deletePromise, {
      loading: "Eliminando orden...",
      success: "Orden eliminada exitosamente",
      error: "Error al eliminar la orden",
    });
  };
  const handleUpdate = (newState = null) => {
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
      supplier: document?.supplier?.id || document?.supplier,
      destinationWarehouse:
        document?.destinationWarehouse?.id || document?.destinationWarehouse,
      supplierInvoicePrefix: document?.supplierInvoicePrefix || null,
      supplierInvoiceNumber: document?.supplierInvoiceNumber || null,
      siigoCostCenterName: document?.siigoCostCenterName || null,
      siigoCostCenterId: document?.siigoCostCenterId || null,
      createdDate: document?.createdDate,
      confirmedDate: document?.confirmedDate,
      completedDate:
        newState === "completed"
          ? moment.tz("America/Bogota").toDate()
          : document?.completedDate,
      estimatedTransitDate: document?.estimatedTransitDate,
      transitDate: document?.transitDate,
      estimatedCompletedDate: document?.estimatedCompletedDate,
      state: newState
        ? newState
        : confirmed && document?.state === "draft"
          ? "confirmed"
          : document?.state,
    };
    if (confirmed && document?.state === "draft") {
      data.confirmedDate = moment.tz("America/Bogota").toDate();
    }

    const promise = updateOrder(document?.id, data, { background: true }).then(
      (result) => {
        if (!result.success)
          throw new Error(result.error?.message || "Error al actualizar");
        return result;
      },
    );
    toast.promise(promise, {
      loading: "Actualizando...",
      success: "Orden actualizada exitosamente",
      error: (err) => err.message || "Error al actualizar",
    });
  };

  const handleCreatePurchaseInvoice = () => {
    const promise = createPurchaseInvoice(document.id).then((result) => {
      if (!result.success)
        throw new Error(
          result.error?.message || "Error al crear el soporte contable",
        );
      if (result.data) {
        setDocument((prev) => ({
          ...prev,
          purchaseSiigoId: result.data.purchaseSiigoId ?? prev.purchaseSiigoId,
          purchaseInvoiceNumber:
            result.data.purchaseInvoiceNumber ?? prev.purchaseInvoiceNumber,
        }));
      }
      return result;
    });
    toast.promise(promise, {
      loading: "Creando soporte contable en Siigo...",
      success: "Soporte contable creado exitosamente",
      error: (err) => err.message || "Error al crear el soporte contable",
    });
  };

  const handleUpdatePurchaseInvoice = () => {
    const promise = updatePurchaseInvoice(document.id).then((result) => {
      if (!result.success)
        throw new Error(
          result.error?.message || "Error al actualizar el soporte contable",
        );
      return result;
    });
    toast.promise(promise, {
      loading: "Actualizando soporte contable en Siigo...",
      success: "Soporte contable actualizado exitosamente",
      error: (err) => err.message || "Error al actualizar el soporte contable",
    });
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

  return (
    <RoleGuard forbiddenRoles={["seller"]} fallbackRoute="/sales">
      <Document
        title="Orden de Compra"
        type="purchase"
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
            priceList={document?.supplier?.prices || []}
            disabled={document?.state === ORDER_STATES.COMPLETED}
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
            isHeaderInputEnabled={false}
            isItemEditable={document?.state !== ORDER_STATES.COMPLETED}
          />
        </Section>
        {document?.state !== ORDER_STATES.COMPLETED && (
          <Section
            title="Carga Masiva de Lista de Empaque"
            description="Carga masiva de lista de empaque de la orden de venta"
            icon={<DocumentArrowUpIcon className="w-6 h-6" />}
          >
            <BulkPackingListUploader
              onFileLoaded={handleBulkUpload}
              isReadOnly={document?.state === ORDER_STATES.COMPLETED}
            />
          </Section>
        )}

        <Section
          title="Comentarios"
          description="Comentarios de la orden de venta"
          icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
        >
          <Comments
            comments={document?.notes || ""}
            setDocument={setDocument}
            disabled={document?.state === ORDER_STATES.COMPLETED}
          />
        </Section>
        <Section
          title="Factura"
          description="Factura de la orden de compra"
          icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
        >
          <PInvoice
            document={document}
            setDocument={setDocument}
            taxes={document?.supplier?.taxes || []}
          />
        </Section>
        {/* Nationalización: solo visible cuando la orden está completada en zona franca */}
        {document?.state === ORDER_STATES.COMPLETED &&
          document?.destinationWarehouse?.type === "freeTradeZone" && (
            <Section
              title="Nacionalización Parcial"
              description="Mueve mercancía de esta zona franca a una bodega stock"
              icon={<GlobeAltIcon className="w-6 h-6" />}
              defaultOpen={false}
            >
              <NationalizationPanel
                document={document}
                createNationalization={createNationalization}
                getNationalizableItems={getNationalizableItems}
                onSuccess={(order) => {
                  router.push(`/nationalizations/${order.id}`);
                }}
              />
            </Section>
          )}
        <Section
          title="Acciones"
          description="Acciones de la orden de compra"
          icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
        >
          <Actions
            document={document}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onComplete={handleUpdate}
            onCreatePurchaseInvoice={handleCreatePurchaseInvoice}
            onUpdatePurchaseInvoice={handleUpdatePurchaseInvoice}
          />
        </Section>
      </Document>
    </RoleGuard>
  );
}
