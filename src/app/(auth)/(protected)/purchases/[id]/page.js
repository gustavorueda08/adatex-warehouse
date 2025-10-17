"use client";

import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import FileInput from "@/components/ui/FileInput";
import IconButton from "@/components/ui/IconButton";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";
import { useOrders } from "@/lib/hooks/useOrders";
import { useProducts } from "@/lib/hooks/useProducts";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { convertCode } from "@/lib/utils/convertCode";
import format from "@/lib/utils/format";
import unitsAreConsistent from "@/lib/utils/unitsConsistency";
import { ChevronUpIcon, TrashIcon } from "@heroicons/react/24/solid";
import moment from "moment-timezone";
import React, {
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  memo,
  useRef,
} from "react";
import { v4 } from "uuid";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import Bagde from "@/components/ui/Bagde";
import { getOrderStateDataFromState } from "@/lib/utils/orderStates";
import Textarea from "@/components/ui/Textarea";
import { generateLabels } from "@/lib/utils/generateLabels";
import { List } from "react-window";
import useDebouncedCallback from "@/lib/hooks/useDebounceCallback";
import { useUser } from "@/lib/hooks/useUser";
import { purchaseDocumentConfig } from "@/lib/config/documentConfigs";
import DocumentDetailBase from "@/components/documents/DocumentDetailBase";

export default function PurchaseDetailPage({ params }) {
  const { id } = use(params);
  const { orders, updateOrder, deleteOrder, removeItem } = useOrders({
    filters: { id: [id] },
    populate: [
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
      "supplier",
      "supplier.prices",
      "destinationWarehouse",
    ],
  });
  const { products: productsData = [] } = useProducts({});
  const { suppliers } = useSuppliers({
    populate: ["prices", "prices.product"],
  });
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const { warehouses } = useWarehouses({});
  const { user } = useUser({});
  const order = orders[0] || null;
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);

  // Fechas
  const [createdDate, setCreatedDate] = useState(
    moment().tz("America/Bogota").toDate()
  );
  const [actualDispatchDate, setActualDispatchDate] = useState(null);
  const [dateArrived, setDateArrived] = useState(null);
  useEffect(() => {
    if (order && suppliers) {
      setSelectedSupplier(order.supplier);
      setSelectedWarehouse(order.destinationWarehouse);
      setCreatedDate(order.createdDate || null);
      setActualDispatchDate(order.actualDispatchDate || null);
      setDateArrived(order.actualWarehouseDate || null);
    }
  }, [order, suppliers]);

  const handleComplete = useCallback(async () => {}, []);

  const handleUpdateSuccess = useCallback(async () => {}, []);

  // Función que prepara los datos adicionales del header para la actualización
  const prepareUpdateData = useCallback(() => {
    return {
      supplier: selectedSupplier?.id,
      destinationWarehouse: selectedWarehouse?.id,
      createdDate,
      actualDispatchDate,
    };
  }, [selectedSupplier, selectedWarehouse, createdDate, actualDispatchDate]);

  // Función para cargar items desde archivo
  const handleSetProductItemsFromFile = useCallback(
    (data, remove, setProducts) => {
      if (!Array.isArray(data)) return;
      console.log("datos masivos", data);

      const items = data.map((item) => ({
        productId: item["id"] || item["ID"] || null,
        name: item["NOMBRE"] || null,
        quantity: Number(item["CANTIDAD"]) || null,
        lotNumber: item["LOTE"] || "",
        itemNumber: item["NUMERO"] || "",
      }));

      console.log(items);

      if (items.some((item) => !item.quantity)) {
        toast.error("El formato del archivo no es válido");
        remove();
        return;
      }

      // Actualizar productos localmente (sin enviar al servidor)
      setProducts((currentProducts) => {
        return currentProducts.map((product) => {
          const productItems = items
            .filter(
              (item) =>
                item?.productId == product.product?.id ||
                item.name == product.product?.name
            )
            .map((item) => ({ ...item, id: v4(), key: v4() }));

          return productItems.length > 0
            ? { ...product, items: productItems }
            : product;
        });
      });

      toast.success(`Se han añadido ${items.length} items a la orden`);
    },
    []
  );

  const config = purchaseDocumentConfig;
  const isReadOnly =
    order?.state === "completed" || order?.state === "canceled";
  if (!order) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Cargando orden...</div>
      </div>
    );
  }
  return (
    <DocumentDetailBase
      document={order}
      user={user}
      updateDocument={updateOrder}
      deleteDocument={deleteOrder}
      allowManualEntry={true}
      availableProducts={productsData}
      documentType={config.documentType}
      title={`${order.code || ""} ${
        order.containerCode ? ` | ${order.containerCode}` : ""
      }`}
      redirectPath={config.redirectPath}
      headerFields={config.getHeaderFields({
        suppliers,
        warehouses,
        selectedSupplier,
        setSelectedSupplier,
        selectedWarehouse,
        setSelectedWarehouse,
        createdDate,
        actualDispatchDate,
        setActualDispatchDate,
        dateArrived,
      })}
      productColumns={config.getProductColumns}
      customSections={config.getCustomSections({
        handleSetProductItemsFromFile,
        document: order,
      })}
      onUpdate={handleUpdateSuccess}
      prepareUpdateData={prepareUpdateData}
      isReadOnly={isReadOnly}
    />
  );
}
