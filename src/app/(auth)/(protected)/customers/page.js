"use client";

import BulkEntitiesActions from "@/components/entities/BulkEntitiesActions";
import Entities from "@/components/entities/Entities";
import EntityFilters from "@/components/entities/EntityFilters";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import { useMemo, useState } from "react";
import Link from "next/link";
import moment from "moment-timezone";

export default function CustomersPage() {
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
  });
  const screenSize = useScreenSize();
  const filters = useMemo(() => {
    const f = {};
    if (search) {
      const searchTerms = search
        .split(" ")
        .filter((term) => term.trim() !== "");
      if (searchTerms.length > 0) {
        f.$and = searchTerms.map((term) => ({
          $or: [
            { identification: { $containsi: term } },
            { name: { $containsi: term } },
            { lastName: { $containsi: term } },
            { territory: { city: { $containsi: term } } },
          ],
        }));
      }
    }
    return f;
  }, [search]);
  const {
    loading,
    isFetching,
    customers,
    deleteCustomer,
    refetch,
    pagination: { pageCount },
  } = useCustomers({
    pagination,
    filters,
    populate: ["territory"],
  });
  const columns = [
    {
      key: "identification",
      label: "Identificación",
      render: (customer) => {
        return (
          <Link href={`/customers/${customer.id}`}>
            <span className="text-default-900 font-medium hover:underline cursor-pointer">
              {customer.identification}
            </span>
          </Link>
        );
      },
    },
    {
      key: "name",
      label: "Nombre",
      render: (customer) => {
        return (
          <Link href={`/customers/${customer.id}`}>
            <span className="text-default-900 font-medium hover:underline cursor-pointer">
              {`${customer.name} ${customer.lastName || ""}`}
            </span>
          </Link>
        );
      },
    },
    {
      key: "city",
      label: "Ciudad",
      render: (customer) => {
        return (
          <Link href={`/customers/${customer.id}`}>
            <span className="text-default-900 font-medium hover:underline cursor-pointer">
              {customer?.territory?.city || "-"}
            </span>
          </Link>
        );
      },
    },
    {
      key: "address",
      label: "Dirección",
    },
    {
      key: "updatedAt",
      label: "Última actualización",
      render: (customer) => {
        return (
          <Link href={`/customers/${customer.id}`}>
            <span className="text-default-900 font-medium hover:underline cursor-pointer">
              {moment(customer.updatedAt).format("DD/MM/YYYY")}
            </span>
          </Link>
        );
      },
    },
  ];

  const handleDelete = async () => {
    if (selectedKeys.size === 0 && selectedKeys !== "all") return;

    try {
      let idsToDelete = [];
      if (selectedKeys === "all") {
        // If all selected, use current page items (or fetch all if needed, but for now current view)
        idsToDelete = customers.map((c) => c.id);
      } else {
        idsToDelete = Array.from(selectedKeys);
      }

      // Execute deletions
      // We could use Promise.all but might want to be careful with rate limits if many
      await Promise.all(idsToDelete.map((id) => deleteCustomer(id)));

      addToast({
        title: "Clientes eliminados",
        description: `Se han eliminado ${idsToDelete.length} clientes correctamente.`,
        type: "success",
      });

      setSelectedKeys(new Set());
      refetch();
    } catch (error) {
      console.error("Error deleting customers:", error);
      addToast({
        title: "Error al eliminar",
        description: "Ocurrió un error al intentar eliminar los clientes.",
        type: "error",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-xl lg:text-3xl">Clientes</h1>
      <EntityFilters
        pathname={"/new-customer"}
        search={search}
        setSearch={setSearch}
      />
      <Entities
        screenSize={screenSize}
        loading={loading || isFetching}
        entities={customers}
        columns={columns}
        pagination={pagination}
        setPagination={setPagination}
        pageCount={pageCount}
        selectedKeys={selectedKeys}
        setSelectedKeys={setSelectedKeys}
      />
      {(selectedKeys === "all" || selectedKeys?.size > 0) && (
        <BulkEntitiesActions
          entities={customers}
          selectedKeys={selectedKeys}
          onDelete={handleDelete}
          loading={loading || isFetching}
        />
      )}
    </div>
  );
}
