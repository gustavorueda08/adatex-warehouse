"use client";

import BulkEntitiesActions from "@/components/entities/BulkEntitiesActions";
import Entities from "@/components/entities/Entities";
import EntityFilters from "@/components/entities/EntityFilters";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import { useMemo, useState } from "react";
import Link from "next/link";
import moment from "moment-timezone";
import { addToast } from "@heroui/react";

export default function SuppliersPage() {
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
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
          $or: [{ name: { $containsi: term } }],
        }));
      }
    }
    return f;
  }, [search]);

  const {
    loading,
    isFetching,
    suppliers,
    deleteSupplier,
    refetch,
    pagination: { pageCount },
  } = useSuppliers({
    pagination,
    filters,
  });

  const columns = [
    {
      key: "name",
      label: "Nombre",
      render: (supplier) => {
        return (
          <Link href={`/suppliers/${supplier.id}`}>
            <span className="text-default-900 font-medium hover:underline cursor-pointer">
              {supplier.name}
            </span>
          </Link>
        );
      },
    },
    {
      key: "updatedAt",
      label: "Última actualización",
      render: (supplier) =>
        moment(supplier.updatedAt).tz("America/Bogota").format("DD/MM/YYYY"),
    },
  ];

  const handleDelete = async () => {
    if (selectedKeys.size === 0 && selectedKeys !== "all") return;

    try {
      let idsToDelete = [];
      if (selectedKeys === "all") {
        idsToDelete = suppliers.map((s) => s.id);
      } else {
        idsToDelete = Array.from(selectedKeys);
      }

      await Promise.all(idsToDelete.map((id) => deleteSupplier(id)));

      addToast({
        title: "Proveedores eliminados",
        description: `Se han eliminado ${idsToDelete.length} proveedores correctamente.`,
        type: "success",
      });

      setSelectedKeys(new Set());
      refetch();
    } catch (error) {
      console.error("Error deleting suppliers:", error);
      addToast({
        title: "Error al eliminar",
        description: "Ocurrió un error al intentar eliminar los proveedores.",
        type: "error",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-xl lg:text-3xl">Proveedores</h1>
      <EntityFilters
        pathname={"/new-supplier"}
        search={search}
        setSearch={setSearch}
      />
      <Entities
        screenSize={screenSize}
        loading={loading || isFetching}
        entities={suppliers}
        columns={columns}
        pagination={pagination}
        setPagination={setPagination}
        pageCount={pageCount}
        selectedKeys={selectedKeys}
        setSelectedKeys={setSelectedKeys}
      />
      {(selectedKeys === "all" || selectedKeys?.size > 0) && (
        <BulkEntitiesActions
          entities={suppliers}
          selectedKeys={selectedKeys}
          onDelete={handleDelete}
          loading={loading || isFetching}
        />
      )}
    </div>
  );
}
