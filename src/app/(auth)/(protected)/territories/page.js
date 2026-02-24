"use client";

import BulkEntitiesActions from "@/components/entities/BulkEntitiesActions";
import Entities from "@/components/entities/Entities";
import EntityFilters from "@/components/entities/EntityFilters";
import { useTerritories } from "@/lib/hooks/useTerritories";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import { useMemo, useState } from "react";
import Link from "next/link";
import moment from "moment-timezone";
import { addToast } from "@heroui/react";
import RoleGuard from "@/components/auth/RoleGuard";

function TerritoriesPageInner() {
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
            { city: { $containsi: term } },
            { state: { $containsi: term } },
            { code: { $containsi: term } },
            { stateCode: { $containsi: term } },
          ],
        }));
      }
    }
    return f;
  }, [search]);

  const {
    loading,
    isFetching,
    territories,
    deleteTerritory,
    refetch,
    pagination: { pageCount },
  } = useTerritories(
    {
      pagination,
      filters,
    },
    {
      onError: (error) => {
        addToast({
          title: "Error al obtener territorios",
          description: "Ocurrió un error al intentar obtener los territorios.",
          type: "error",
        });
      },
    },
  );

  const columns = [
    {
      key: "city",
      label: "Ciudad",
      render: (territory) => {
        return (
          <Link href={`/territories/${territory.id}`}>
            <span className="text-default-900 font-medium hover:underline cursor-pointer">
              {territory.city}
            </span>
          </Link>
        );
      },
    },
    {
      key: "code",
      label: "Código de Ciudad",
    },
    {
      key: "state",
      label: "Departamento",
    },
    {
      key: "stateCode",
      label: "Código de Departamento",
    },
    {
      key: "updatedAt",
      label: "Última actualización",
      render: (territory) =>
        moment(territory.updatedAt).tz("America/Bogota").format("DD/MM/YYYY"),
    },
  ];

  const handleUpdate = () => {};

  const handleDelete = async () => {
    if (selectedKeys.size === 0 && selectedKeys !== "all") return;
    try {
      let idsToDelete = [];
      if (selectedKeys === "all") {
        idsToDelete = territories.map((t) => t.id);
      } else {
        idsToDelete = Array.from(selectedKeys);
      }
      await Promise.all(idsToDelete.map((id) => deleteTerritory(id)));
      addToast({
        title: "Territorios eliminados",
        description: `Se han eliminado ${idsToDelete.length} territorios correctamente.`,
        type: "success",
      });
      setSelectedKeys(new Set());
      refetch();
    } catch (error) {
      console.error("Error deleting territories:", error);
      addToast({
        title: "Error al eliminar",
        description: "Ocurrió un error al intentar eliminar los territorios.",
        type: "error",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-xl lg:text-3xl">Territorios</h1>
      <EntityFilters
        pathname={"/new-territory"}
        search={search}
        setSearch={setSearch}
      />
      <Entities
        screenSize={screenSize}
        loading={loading || isFetching}
        entities={territories}
        columns={columns}
        pagination={pagination}
        setPagination={setPagination}
        pageCount={pageCount}
        selectedKeys={selectedKeys}
        setSelectedKeys={setSelectedKeys}
        keyField="documentId"
      />
      {(selectedKeys === "all" || selectedKeys?.size > 0) && (
        <BulkEntitiesActions
          entities={territories}
          selectedKeys={selectedKeys}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          loading={loading || isFetching}
        />
      )}
    </div>
  );
}


export default function TerritoriesPage(params) {
  return (
    <RoleGuard forbiddenRoles={["seller"]} fallbackRoute="/">
      <TerritoriesPageInner {...params} />
    </RoleGuard>
  );
}
