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
import RoleGuard from "@/components/auth/RoleGuard";

function NationalizationsPageInner() {
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50 });
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState(new Set());

  const filters = useMemo(() => {
    const f = { type: "nationalization" };

    if (search) {
      const terms = search.split(" ").filter((t) => t.trim() !== "");
      if (terms.length > 0) {
        f.$and = terms.map((term) => ({
          $or: [
            { code: { $containsi: term } },
            { sourceWarehouse: { name: { $containsi: term } } },
            { destinationWarehouse: { name: { $containsi: term } } },
          ],
        }));
      }
    }

    const statesArray = Array.from(selectedStates);
    if (statesArray.length > 0) {
      f.state = { $in: statesArray };
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
      populate: {
        sourceWarehouse: true,
        destinationWarehouse: true,
        orderProducts: {
          populate: { items: { count: true } },
        },
      },
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
        { label: "Código", key: "code" },
        { label: "Items", key: "items" },
        { label: "Estado", key: "state" },
        { label: "Origen (ZF)", key: "sourceWarehouse" },
        { label: "Destino", key: "destinationWarehouse" },
      ];
    }
    return [
      { label: "Código", key: "code" },
      {
        label: (
          <EllipsisHorizontalCircleIcon className="w-5 h-5 md:w-6 md:h-6 mx-2" />
        ),
        key: "more",
      },
      { label: "Bodega Origen (ZF)", key: "sourceWarehouse" },
      { label: "Bodega Destino", key: "destinationWarehouse" },
      { label: "Estado", key: "state" },
      { label: "No Items", key: "items" },
      { label: "Creado", key: "createdAt" },
      { label: "Actualizado", key: "updatedAt" },
      { label: "", key: "actions" },
    ];
  }, [screenSize]);

  const handleUpdate = async (document, updates = {}) => {
    try {
      const products = document?.orderProducts || [];
      const formattedProducts = products
        .filter((p) => p.product)
        .map((p) => {
          const validItems = (p.items || []).filter(
            (i) => i.quantity !== 0 && i.quantity !== "",
          );
          return {
            product: p.product.id || p.product,
            items: validItems.map((item) => ({
              id: item.id,
              quantity: item.quantity,
            })),
            confirmedQuantity: validItems.reduce(
              (sum, item) => sum + (Number(item.quantity) || 0),
              0,
            ),
            requestedQuantity: p.requestedQuantity,
            price: p.price,
          };
        });

      let newState = document.state;
      if (updates.state) {
        newState = updates.state;
      }

      const data = {
        products: formattedProducts,
        sourceWarehouse:
          document.sourceWarehouse?.id || document.sourceWarehouse,
        destinationWarehouse:
          document.destinationWarehouse?.id || document.destinationWarehouse,
        createdDate: document.createdDate,
        confirmedDate: document.confirmedDate,
        completedDate: document.completedDate,
        state: newState,
        ...updates,
      };

      if (newState === "completed" && document.state !== "completed") {
        data.completedDate = moment.tz("America/Bogota").toDate();
      }

      await updateOrder(document.id, data);
    } catch (error) {
      throw error;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-xl lg:text-3xl">Nacionalizaciones</h1>
      <Filters
        search={search}
        setSearch={setSearch}
        dateRange={dateRange}
        setDateRange={setDateRange}
        selectedStates={selectedStates}
        setSelectedStates={setSelectedStates}
        showCreate={false}
      />
      <Documents
        screenSize={screenSize}
        loading={loading}
        isFetching={isFetching}
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
        />
      )}
    </div>
  );
}

export default function NationalizationsPage(params) {
  return (
    <RoleGuard forbiddenRoles={["seller"]} fallbackRoute="/">
      <NationalizationsPageInner {...params} />
    </RoleGuard>
  );
}
