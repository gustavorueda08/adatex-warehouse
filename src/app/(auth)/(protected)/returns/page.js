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

function ReturnsPageInner() {
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
      type: "return",
    };

    if (search) {
      const searchTerms = search
        .split(" ")
        .filter((term) => term.trim() !== "");
      if (searchTerms.length > 0) {
        f.$and = searchTerms.map((term) => ({
          $or: [
            { code: { $containsi: term } },
            { parentOrder: { code: { $containsi: term } } },
            { parentOrder: { customer: { name: { $containsi: term } } } },
            { parentOrder: { customer: { lastName: { $containsi: term } } } },
          ],
        }));
      }
    }

    const statesArray = Array.from(selectedStates);
    if (statesArray.length > 0) {
      f.state = {
        $in: statesArray,
      };
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
        parentOrder: {
          populate: {
            customer: true,
          },
        },
        destinationWarehouse: true,
        orderProducts: {
          populate: {
            items: { count: true },
          },
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
        {
          label: "Código",
          key: "code",
        },
        {
          label: "Orden Original",
          key: "parentOrder",
        },
        {
          label: "Estado",
          key: "state",
        },
      ];
    }
    return [
      {
        label: "Código",
        key: "code",
      },
      {
        label: (
          <EllipsisHorizontalCircleIcon className="w-5 h-5 md:w-6 md:h-6 mx-2" />
        ),
        key: "more",
      },
      {
        label: "Orden Original",
        key: "parentOrder",
      },
      {
        label: "Estado",
        key: "state",
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

  // Handle update is generic for state updates
  const handleUpdate = async (document, updates = {}) => {
    try {
      await updateOrder(document.id, updates);
    } catch (error) {
      console.error("Error updating order:", error);
      throw error;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-xl lg:text-3xl">Devoluciones</h1>
      <Filters
        pathname={"/new-return"}
        search={search}
        setSearch={setSearch}
        dateRange={dateRange}
        setDateRange={setDateRange}
        selectedStates={selectedStates}
        setSelectedStates={setSelectedStates}
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


export default function ReturnsPage(params) {
  return (
    <RoleGuard forbiddenRoles={["seller"]} fallbackRoute="/">
      <ReturnsPageInner {...params} />
    </RoleGuard>
  );
}
