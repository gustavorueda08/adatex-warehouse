"use client";

import Filters from "@/components/ui/Filters";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import moment from "moment-timezone";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

/**
 * Componente reutilizable para listado de entidades (customers, suppliers, sellers, etc.)
 *
 * @param {Object} props
 * @param {Function} props.useHook - Hook personalizado (useCustomers, useSuppliers, useSellers)
 * @param {string} props.title - Título de la página
 * @param {string} props.entityName - Nombre de la entidad en singular
 * @param {string} props.entityNamePlural - Nombre de la entidad en plural
 * @param {Array} props.columns - Columnas para la tabla
 * @param {Function} props.getDetailPath - Función que recibe (entity) y retorna string path
 * @param {string} props.createPath - Path para crear nueva entidad
 * @param {Array} props.bulkActions - Array de acciones: ['delete']
 * @param {Function} props.canDeleteEntity - Función que recibe (entity) y retorna boolean
 * @param {string} props.searchPlaceholder - Placeholder para búsqueda
 */
export default function EntityListPage({
  useHook,
  title,
  entityName,
  entityNamePlural,
  columns,
  getDetailPath,
  createPath,
  bulkActions = [],
  canDeleteEntity = () => true,
  searchPlaceholder = "Buscar...",
}) {
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [range, setRange] = useState({ from: null, to: null });
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, range.from, range.to]);

  const buildDateFilter = (range) => {
    if (!range.from && !range.to) return {};

    const dateFilter = {};

    if (range.from) {
      const fromDate =
        range.from instanceof Date
          ? range.from.toISOString().split("T")[0]
          : range.from;
      dateFilter.$gte = fromDate;
    }

    if (range.to) {
      const toDate =
        range.to instanceof Date
          ? range.to.toISOString().split("T")[0]
          : range.to;
      dateFilter.$lte = toDate;
    }

    return { createdAt: dateFilter };
  };

  const {
    entities,
    meta,
    loading,
    pagination,
    deleteEntity,
    refetch,
  } = useHook({
    pagination: { page: currentPage, pageSize: 20 },
    sort: ["updatedAt:desc"],
    filters: {
      ...(debouncedSearch
        ? {
            $or: [
              {
                name: {
                  $containsi: debouncedSearch,
                },
              },
              {
                email: {
                  $containsi: debouncedSearch,
                },
              },
              {
                phone: {
                  $containsi: debouncedSearch,
                },
              },
              {
                nit: {
                  $containsi: debouncedSearch,
                },
              },
            ],
          }
        : {}),
      ...buildDateFilter(range),
    },
  });

  const handleEntitySelection = (selectedIds) => {
    setSelectedEntities(selectedIds);
  };

  const handleEntityEdit = (entity) => {
    console.log(`Editar ${entityName}:`, entity);
  };

  const handleDeleteEntity = async (entityId) => {
    const entity = entities.find((e) => e.id === entityId);
    if (!canDeleteEntity(entity)) {
      toast.error(`No se puede eliminar este ${entityName}`);
      return;
    }

    const result = await Swal.fire({
      title: `Eliminar ${entityName}`,
      html: `Se eliminará <strong>${entity.name}</strong><br/> Esta acción no se puede deshacer.`,
      icon: "warning",
      iconColor: "red",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      background: "#27272a",
      color: "#fff",
      confirmButtonColor: "red",
      cancelButtonColor: "#71717a",
    });

    if (!result.isConfirmed) return;

    const loadingToast = toast.loading(`Eliminando ${entityName}...`);
    try {
      const result = await deleteEntity(entity.id);
      toast.dismiss(loadingToast);
      if (result.success) {
        toast.success(`${entity.name} eliminado exitosamente`);
        setSelectedEntities([]);
      } else {
        toast.error(`Error al eliminar ${entity.name}`, { duration: 5000 });
      }
      await refetch();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(`Error al eliminar ${entityName}`);
      console.error("Error:", error);
    }
  };

  const handleDeleteSelectedEntities = async () => {
    if (selectedEntities.length === 0) {
      toast.error(`No hay ${entityNamePlural} seleccionados`);
      return;
    }

    const result = await Swal.fire({
      title: `Eliminar ${entityNamePlural}`,
      html: `Se eliminarán <strong>${selectedEntities.length}</strong> ${entityNamePlural} <br/> Esta acción no se puede deshacer.`,
      icon: "warning",
      iconColor: "red",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      background: "#27272a",
      color: "#fff",
      confirmButtonColor: "red",
      cancelButtonColor: "#71717a",
    });

    if (!result.isConfirmed) return;

    const loadingToast = toast.loading(`Eliminando ${entityNamePlural}...`);
    setBulkLoading(true);
    try {
      const promises = selectedEntities.map((entityId) =>
        deleteEntity(entityId)
      );
      const results = await Promise.all(promises);
      const allSuccess = results.every((r) => r.success);
      const failedCount = results.filter((r) => !r.success).length;

      toast.dismiss(loadingToast);

      if (allSuccess) {
        toast.success(
          `${selectedEntities.length} ${entityNamePlural} eliminados exitosamente`
        );
        setSelectedEntities([]);
      } else {
        toast.error(
          `${results.length - failedCount} eliminados, ${failedCount} fallaron`,
          { duration: 5000 }
        );
      }
      await refetch();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(`Error al eliminar ${entityNamePlural}`);
      console.error("Error:", error);
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="w-full px-4">
      <h1 className="py-5 text-3xl font-bold">{title}</h1>
      <Filters
        search={search}
        setSearch={setSearch}
        range={range}
        setRange={setRange}
        options={[]}
        setSelectedOptions={() => {}}
        linkPath={createPath}
        placeHolder={searchPlaceholder}
        dropdownOptions={[]}
      />
      <Table
        columns={columns}
        data={entities}
        onRowSelect={handleEntitySelection}
        onRowEdit={handleEntityEdit}
        loading={loading}
        pagination={pagination}
        getDetailPath={getDetailPath}
        onPageChange={setCurrentPage}
        onRowDelete={
          bulkActions.includes("delete") ? handleDeleteEntity : undefined
        }
        canDeleteRow={
          bulkActions.includes("delete") ? canDeleteEntity : undefined
        }
        emptyMessage={`No se encontraron ${entityNamePlural}`}
      />

      {bulkActions.length > 0 && (
        <div className="py-4 flex flex-col w-full md:w-auto md:flex-row gap-3 md:justify-end">
          {bulkActions.includes("delete") && (
            <Button
              variant="red"
              disabled={selectedEntities.length === 0 || bulkLoading}
              onClick={handleDeleteSelectedEntities}
              className="w-full md:w-auto"
            >
              Eliminar {entityNamePlural}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
