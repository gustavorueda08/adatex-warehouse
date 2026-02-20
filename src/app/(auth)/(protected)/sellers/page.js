"use client";

import BulkEntitiesActions from "@/components/entities/BulkEntitiesActions";
import Entities from "@/components/entities/Entities";
import EntityFilters from "@/components/entities/EntityFilters";
import { useSellers } from "@/lib/hooks/useSellers";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import { useMemo, useState } from "react";
import Link from "next/link";
import moment from "moment-timezone";
import { addToast } from "@heroui/react";

export default function SellersPage() {
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
            { name: { $containsi: term } },
            { email: { $containsi: term } },
          ],
        }));
      }
    }
    return f;
  }, [search]);

  const {
    loading,
    isFetching,
    sellers,
    deleteSeller,
    refetch,
    pagination: { pageCount },
  } = useSellers({
    pagination,
    filters,
  });

  const columns = [
    {
      key: "name",
      label: "Nombre",
      render: (seller) => {
        return (
          <Link href={`/sellers/${seller.id}`}>
            <span className="text-default-900 font-medium hover:underline cursor-pointer">
              {seller.name}
            </span>
          </Link>
        );
      },
    },
    {
      key: "email",
      label: "Email",
      render: (seller) => {
        return (
          <Link href={`/sellers/${seller.id}`}>
            <span className="text-default-900 font-medium hover:underline cursor-pointer">
              {seller.email}
            </span>
          </Link>
        );
      },
    },
    {
      key: "phone",
      label: "Teléfono",
      render: (seller) => {
        return (
          <Link href={`/sellers/${seller.id}`}>
            <span className="text-default-900 font-medium hover:underline cursor-pointer">
              {seller.phone}
            </span>
          </Link>
        );
      },
    },
    {
      key: "nit",
      label: "NIT",
      render: (seller) => {
        return (
          <Link href={`/sellers/${seller.id}`}>
            <span className="text-default-900 font-medium hover:underline cursor-pointer">
              {seller.nit}
            </span>
          </Link>
        );
      },
    },
    {
      key: "updatedAt",
      label: "Última actualización",
      render: (seller) =>
        moment(seller.updatedAt).tz("America/Bogota").format("DD/MM/YYYY"),
    },
  ];

  const handleUpdate = () => {};

  const handleDelete = async () => {
    if (selectedKeys.size === 0 && selectedKeys !== "all") return;

    try {
      let idsToDelete = [];
      if (selectedKeys === "all") {
        idsToDelete = sellers.map((s) => s.id);
      } else {
        idsToDelete = Array.from(selectedKeys);
      }

      await Promise.all(idsToDelete.map((id) => deleteSeller(id)));

      addToast({
        title: "Vendedores eliminados",
        description: `Se han eliminado ${idsToDelete.length} vendedores correctamente.`,
        type: "success",
      });

      setSelectedKeys(new Set());
      refetch();
    } catch (error) {
      console.error("Error deleting sellers:", error);
      addToast({
        title: "Error al eliminar",
        description: "Ocurrió un error al intentar eliminar los vendedores.",
        type: "error",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-xl lg:text-3xl">Vendedores</h1>
      <EntityFilters
        pathname={"/new-seller"}
        search={search}
        setSearch={setSearch}
        showCreate={false}
      />
      <Entities
        screenSize={screenSize}
        loading={loading || isFetching}
        entities={sellers}
        columns={columns}
        pagination={pagination}
        setPagination={setPagination}
        pageCount={pageCount}
        selectedKeys={selectedKeys}
        setSelectedKeys={setSelectedKeys}
      />
      {(selectedKeys === "all" || selectedKeys?.size > 0) && (
        <BulkEntitiesActions
          entities={sellers}
          selectedKeys={selectedKeys}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          loading={loading || isFetching}
        />
      )}
    </div>
  );
}
