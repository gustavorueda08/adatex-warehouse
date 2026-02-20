"use client";

import BulkActions from "@/components/documents/BulkActions";
import Documents from "@/components/documents/Documents";
import Filters from "@/components/ui/Filters";
import { useOrders } from "@/lib/hooks/useOrders";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import { EllipsisHorizontalCircleIcon } from "@heroicons/react/24/solid";
import { getLocalTimeZone } from "@internationalized/date";
import moment from "moment-timezone";
import { useMemo, useState } from "react";

export default function SalesPage() {
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
  });
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const filters = useMemo(() => {
    const f = {
      type: "sale",
    };

    if (search) {
      const searchTerms = search
        .split(" ")
        .filter((term) => term.trim() !== "");
      if (searchTerms.length > 0) {
        f.$and = searchTerms.map((term) => ({
          $or: [
            { code: { $containsi: term } },
            { invoiceNumberTypeA: { $containsi: term } },
            { invoiceNumberTypeB: { $containsi: term } },
            { customer: { name: { $containsi: term } } },
            { customer: { lastName: { $containsi: term } } },
            { customer: { companyName: { $containsi: term } } },
          ],
        }));
      }
    }

    const statesArray = Array.from(selectedStates);
    const hasDespachados = statesArray.includes("despachados");
    const hasCompleted = statesArray.includes("completed");
    const standardStates = statesArray.filter(
      (s) => s !== "despachados" && s !== "completed",
    );

    if (statesArray.length > 0) {
      const orConditions = [];

      // Despachados: completed state, NO invoices/siigo keys
      if (hasDespachados) {
        orConditions.push({
          $and: [
            { state: "completed" },
            { invoiceNumberTypeA: { $null: true } },
            { invoiceNumberTypeB: { $null: true } },
            { siigoIdTypeA: { $null: true } },
            { siigoIdTypeB: { $null: true } },
          ],
        });
      }

      // Completed: completed state, HAS AT LEAST ONE invoice/siigo key
      if (hasCompleted) {
        orConditions.push({
          $and: [
            { state: "completed" },
            {
              $or: [
                { invoiceNumberTypeA: { $null: false } },
                { invoiceNumberTypeB: { $null: false } },
                { siigoIdTypeA: { $null: false } },
                { siigoIdTypeB: { $null: false } },
              ],
            },
          ],
        });
      }

      // Other states (draft, confirmed, etc.)
      if (standardStates.length > 0) {
        orConditions.push({
          state: { $in: standardStates },
        });
      }

      // Apply conditions
      if (orConditions.length === 1) {
        // Flatten the top level object if it's only one block to avoid outer $or
        Object.assign(f, orConditions[0]);
      } else if (orConditions.length > 1) {
        f.$or = orConditions;
      }
    }

    if (dateRange?.start && dateRange?.end) {
      f.createdAt = {
        $gte: moment(dateRange.start.toDate(getLocalTimeZone()))
          .tz("America/Bogota")
          .startOf("day")
          .toISOString(),
        $lte: moment(dateRange.end.toDate(getLocalTimeZone()))
          .tz("America/Bogota")
          .endOf("day")
          .toISOString(),
      };
    }
    return f;
  }, [search, selectedStates, dateRange]);
  const {
    orders,
    loading = true,
    isFetching,
    pagination: { pageCount },
    updateOrder,
    deleteOrder,
    invalidateAndRefetch,
  } = useOrders(
    {
      pagination,
      filters,
      populate: [
        "customer",
        "customerForInvoice",
        "orderProducts",
        "orderProducts.product",
        "orderProducts.items",
      ],
    },
    {},
  );

  const screenSize = useScreenSize();
  const columns = useMemo(() => {
    if (screenSize !== "lg") {
      return [
        {
          label: (
            <EllipsisHorizontalCircleIcon className="w-5 h-5 md:w-6 md:h-6 mx-2.5" />
          ),
          key: "more",
        },
        {
          label: "Factura",
          key: "invoice",
        },
        {
          label: "Items",
          key: "items",
        },
        {
          label: "Estado",
          key: "state",
        },
        {
          label: "Cliente",
          key: "customer",
        },
      ];
    }
    return [
      {
        label: "Código",
        key: "code",
      },
      {
        label: "No Factura",
        key: "invoice",
      },
      {
        label: (
          <EllipsisHorizontalCircleIcon className="w-5 h-5 md:w-6 md:h-6 mx-2" />
        ),
        key: "more",
      },
      {
        label: "Cliente",
        key: "customer",
      },
      {
        label: "Estado",
        key: "state",
      },
      {
        label: "No Items",
        key: "items",
      },
      {
        label: "Creado",
        key: "createdAt",
      },
      {
        label: "Actualizado",
        key: "updatedAt",
      },
      {
        label: "",
        key: "actions",
      },
    ];
  }, [screenSize]);

  const handleUpdate = async (document, updates = {}) => {
    try {
      const products = document?.orderProducts || [];
      const confirmed = products
        .filter((p) => p.product)
        .map((p) => ({
          ...p,
          items: (p.items || []).filter(
            (i) => i.quantity !== 0 && i.quantity !== "",
          ),
        }))
        .every(
          (product) =>
            Array.isArray(product.items) &&
            product.items.length > 0 &&
            product.items.every((item) => {
              const q = item.quantity;
              return (
                q !== null && q !== undefined && q !== "" && !isNaN(Number(q))
              );
            }),
        );

      const formattedProducts = products
        .filter((p) => p.product)
        .map((p) => {
          const validItems = (p.items || []).filter(
            (i) => i.quantity !== 0 && i.quantity !== "",
          );
          // Calculate confirmedQuantity sum
          const confirmedQuantity = validItems.reduce(
            (sum, item) => sum + (Number(item.quantity) || 0),
            0,
          );
          const items = validItems.map((item) => ({
            id: item.id,
            quantity: item.quantity,
          }));

          return {
            product: p.product.id || p.product,
            items: items,
            confirmedQuantity,
            requestedQuantity: p.requestedQuantity,
            price: p.price,
            ivaIncluded: p.ivaIncluded,
            invoicePercentage: p.invoicePercentage,
          };
        });

      // Determine state logic if not explicitly provided in updates
      let newState = document.state;
      if (updates.state) {
        newState = updates.state;
      } else if (confirmed && document.state === "draft") {
        newState = "confirmed";
      }

      // Merge base data with updates
      const data = {
        products: formattedProducts,
        customer: document.customer?.id || document.customer,
        customerForInvoice:
          document.customerForInvoice?.id || document.customerForInvoice,
        sourceWarehouse:
          document.sourceWarehouse?.id || document.sourceWarehouse,
        createdDate: document.createdDate,
        confirmedDate: document.confirmedDate,
        completedDate: document.completedDate,
        actualDispatchDate: document.actualDispatchDate,
        state: newState,
        emitInvoice: document.emitInvoice || false,
        ...updates, // Allow overriding any field
      };

      // Auto-set dates based on state transitions if needed
      if (newState === "confirmed" && document.state === "draft") {
        data.confirmedDate = moment.tz("America/Bogota").toDate();
      }
      if (newState === "completed" && document.state !== "completed") {
        data.completedDate = moment.tz("America/Bogota").toDate();
        data.actualDispatchDate = moment.tz("America/Bogota").toDate();
      }
      await updateOrder(document.id, data);
    } catch (error) {
      console.error("Error updating order:", error);
      throw error; // Re-throw for BulkActions to catch
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-xl lg:text-3xl">Ordenes de Venta</h1>
      <Filters
        pathname={"/new-sale"}
        search={search}
        setSearch={setSearch}
        dateRange={dateRange}
        setDateRange={setDateRange}
        selectedStates={selectedStates}
        setSelectedStates={setSelectedStates}
        extraStates={[{ key: "despachados", label: "Despachados" }]}
      />
      <Documents
        screenSize={screenSize}
        loading={loading || isFetching}
        documents={orders}
        columns={columns}
        pagination={pagination}
        setPagination={setPagination}
        pageCount={pageCount}
        selectedKeys={selectedKeys}
        setSelectedKeys={setSelectedKeys}
      />
      {(selectedKeys === "all" || selectedKeys?.size > 0) && (
        <BulkActions
          documents={orders}
          selectedKeys={selectedKeys}
          onUpdate={handleUpdate}
          onDelete={deleteOrder}
          refreshOrders={invalidateAndRefetch}
          loading={loading || isFetching}
          showInvoiceButton={true}
        />
      )}
    </div>
  );
}
