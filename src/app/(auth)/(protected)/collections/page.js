"use client";

import BulkEntitiesActions from "@/components/entities/BulkEntitiesActions";
import Entities from "@/components/entities/Entities";
import EntityFilters from "@/components/entities/EntityFilters";
import { useCollections } from "@/lib/hooks/useCollections";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import { useMemo, useState } from "react";
import Link from "next/link";
import { addToast, Chip } from "@heroui/react";
import RoleGuard from "@/components/auth/RoleGuard";

function CollectionsPageInner() {
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
          name: { $containsi: term },
        }));
      }
    }
    return f;
  }, [search]);

  const {
    loading,
    isFetching,
    collections,
    deleteCollection,
    refetch,
    pagination: { pageCount },
  } = useCollections({
    pagination,
    filters,
    populate: ["products", "line"],
  });

  const columns = [
    {
      key: "name",
      label: "Nombre",
      render: (collection) => {
        return (
          <Link href={`/collections/${collection.id}`}>
            <span className="text-default-900 font-medium hover:underline cursor-pointer">
              {collection.name}
            </span>
          </Link>
        );
      },
    },
    {
      key: "products",
      label: "Productos",
      render: (collection) => collection.products?.length || 0,
    },
    {
      key: "line",
      label: "Línea",
      render: (collection) => {
        return (
          <Link href={`/collections/${collection.id}`}>
            <span className="text-default-900 font-medium hover:underline cursor-pointer">
              {collection?.line?.name || "-"}
            </span>
          </Link>
        );
      },
    },
  ];

  const handleUpdate = () => {};

  const handleDelete = async () => {
    if (selectedKeys.size === 0 && selectedKeys !== "all") return;

    try {
      let idsToDelete = [];
      if (selectedKeys === "all") {
        idsToDelete = collections.map((c) => c.id);
      } else {
        idsToDelete = Array.from(selectedKeys);
      }

      await Promise.all(idsToDelete.map((id) => deleteCollection(id)));

      addToast({
        title: "Colecciones eliminadas",
        description: `Se han eliminado ${idsToDelete.length} colecciones correctamente.`,
        type: "success",
      });

      setSelectedKeys(new Set());
      refetch();
    } catch (error) {
      console.error("Error deleting collections:", error);
      addToast({
        title: "Error al eliminar",
        description: "Ocurrió un error al intentar eliminar las colecciones.",
        type: "error",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-xl lg:text-3xl">Colecciones</h1>
      <EntityFilters
        pathname={"/new-collection"} // Changed path to typical creation route or use modal if preferred, likely similar to territories
        search={search}
        setSearch={setSearch}
      />
      <Entities
        screenSize={screenSize}
        loading={loading || isFetching}
        entities={collections}
        columns={columns}
        pagination={pagination}
        setPagination={setPagination}
        pageCount={pageCount}
        selectedKeys={selectedKeys}
        setSelectedKeys={setSelectedKeys}
      />
      {(selectedKeys === "all" || selectedKeys?.size > 0) && (
        <BulkEntitiesActions
          entities={collections}
          selectedKeys={selectedKeys}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          loading={loading || isFetching}
        />
      )}
    </div>
  );
}


export default function CollectionsPage(params) {
  return (
    <RoleGuard forbiddenRoles={["seller"]} fallbackRoute="/">
      <CollectionsPageInner {...params} />
    </RoleGuard>
  );
}
