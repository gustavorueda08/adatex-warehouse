"use client";

import Filters from "@/components/ui/Filters";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { useEffect, useState, memo } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

/**
 * Componente reutilizable para listado de entidades (customers, suppliers, sellers, etc.)
 * Optimizado con React.memo para prevenir re-renders innecesarios
 *
 * @param {Object} props
 * @param {Function} props.useHook - Hook personalizado (useCustomers, useSuppliers, useSellers)
 * @param {Object} props.config - Objeto de configuración (opcional, reemplaza las props individuales)
 *   Si se pasa config, las props individuales se ignoran
 * @param {string} props.title - Título de la página
 * @param {string} props.description - Descripción de la página (opcional)
 * @param {string} props.entityName - Nombre de la entidad en singular
 * @param {string} props.entityNamePlural - Nombre de la entidad en plural
 * @param {Array} props.columns - Columnas para la tabla
 * @param {Function} props.getDetailPath - Función que recibe (entity) y retorna string path
 * @param {string} props.createPath - Path para crear nueva entidad
 * @param {Array} props.bulkActions - Array de acciones: ['delete']
 * @param {Array} props.customActions - Array de acciones personalizadas:
 *   [{
 *     label: string,
 *     variant: string,
 *     onClick: (selectedIds, helpers) => void,
 *     disabled: (selectedIds, helpers) => boolean,
 *     loading: boolean
 *   }]
 *   El objeto helpers incluye:
 *   - entities: Lista completa de entidades
 *   - refetch: Función para recargar datos
 *   - setSelectedEntities: Función para limpiar selección
 *   - setBulkLoading: Función para manejar estado de carga
 *   - ...todas las propiedades adicionales del hook (ej: syncAllCustomersFromSiigo, syncing, etc.)
 * @param {Function} props.canDeleteEntity - Función que recibe (entity) y retorna boolean
 * @param {string} props.searchPlaceholder - Placeholder para búsqueda
 */
function EntityListPage({
  useHook,
  config,
  // Props individuales (para retrocompatibilidad)
  title: titleProp,
  description: descriptionProp,
  entityName: entityNameProp,
  entityNamePlural: entityNamePluralProp,
  columns: columnsProp,
  getDetailPath: getDetailPathProp,
  createPath: createPathProp,
  bulkActions: bulkActionsProp = [],
  customActions: customActionsProp = [],
  canDeleteEntity: canDeleteEntityProp = () => true,
  searchPlaceholder: searchPlaceholderProp = "Buscar...",
}) {
  // Determinar si usar config o props individuales
  const title = config?.title || titleProp;
  const description = config?.description || descriptionProp;
  const entityName = config?.entityName || entityNameProp;
  const entityNamePlural = config?.entityNamePlural || entityNamePluralProp;
  const columns = config?.columns || columnsProp;
  const getDetailPath = config?.getDetailPath || getDetailPathProp;
  const createPath = config?.createPath || createPathProp;
  const bulkActions = config?.bulkActions || bulkActionsProp;
  const canDeleteEntity = config?.canDeleteEntity || canDeleteEntityProp;
  const searchPlaceholder = config?.searchPlaceholder || searchPlaceholderProp;

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
    ...restOfHook // Captura todas las propiedades adicionales del hook (ej: syncAllCustomersFromSiigo, syncing, etc.)
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
                identification: {
                  $containsi: debouncedSearch,
                },
              },
              {
                address: {
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
      console.log(`🗑️ Deleting entity ${entityId}...`);
      const result = await deleteEntity(entityId);
      console.log(`📋 Delete result:`, result);

      if (result.success) {
        // Refetch para asegurar que los datos estén sincronizados
        console.log(`🔄 Refetching entities after successful delete...`);
        await refetch();
        toast.dismiss(loadingToast);
        toast.success(`${entity.name} eliminado exitosamente`);
        setSelectedEntities([]);
      } else {
        toast.dismiss(loadingToast);
        toast.error(
          result.error?.message || `Error al eliminar ${entity.name}`,
          { duration: 5000 }
        );
        console.error(`❌ Delete failed:`, result.error);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(`Error al eliminar ${entityName}`);
      console.error("❌ Error deleting entity:", error);
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

  // Helpers para customActions
  // Incluye todas las propiedades del hook + utilidades de UI
  const actionHelpers = {
    entities,
    refetch,
    setSelectedEntities,
    setBulkLoading,
    ...restOfHook, // Spread de todas las propiedades adicionales del hook
  };

  // Si config tiene getCustomActions, usarlo para generar las acciones personalizadas
  const customActions = config?.getCustomActions
    ? config.getCustomActions({ helpers: actionHelpers })
    : customActionsProp;

  return (
    <div className="w-full px-4 pb-6">
      {/* Header con título */}
      <div className="py-6">
        <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
        {description && <p className="text-gray-400 text-sm">{description}</p>}
      </div>

      {/* Card principal con filtros */}
      <Card className="mb-6">
        <CardHeader className="border-b border-zinc-700">
          <CardTitle>Filtros de búsqueda</CardTitle>
          <CardDescription>
            Filtra por nombre, email, teléfono o NIT
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
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
            showDatePicker={false}
            showDropdownSelector={false}
          />
        </CardContent>
      </Card>

      {/* Card de la tabla */}
      <Card>
        <CardHeader className="border-b border-zinc-700">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Listado de {entityNamePlural}</CardTitle>
              <CardDescription>
                {loading
                  ? "Cargando..."
                  : `${meta?.pagination?.total || 0} ${
                      (meta?.pagination?.total || 0) === 1
                        ? entityName
                        : entityNamePlural
                    } encontrados`}
              </CardDescription>
            </div>
            {!loading && entities.length > 0 && (
              <div className="text-sm text-gray-400">
                Página {pagination?.page || 1} de {pagination?.pageCount || 1}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="py-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Custom Actions - Card flotante (siempre visible si hay customActions) */}
      {customActions.length > 0 && (
        <Card className="mt-4 bg-gradient-to-r from-zinc-800 to-zinc-900 border-zinc-700 sticky bottom-4 shadow-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-3 align-middle">
              {selectedEntities.length > 0 ? (
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    {selectedEntities.length}
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {selectedEntities.length}{" "}
                      {selectedEntities.length === 1
                        ? entityName
                        : entityNamePlural}{" "}
                      seleccionados
                    </p>
                    <p className="text-gray-400 text-sm">
                      Selecciona una acción para aplicar
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-white font-semibold">
                      Acciones disponibles
                    </p>
                    <p className="text-gray-400 text-sm">
                      Ejecuta acciones personalizadas
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col w-full md:w-auto md:flex-row gap-3">
                {/* Custom Actions */}
                {customActions.map((action, index) => {
                  const isDisabled =
                    (action.disabled &&
                      action.disabled(selectedEntities, actionHelpers)) ||
                    bulkLoading ||
                    action.loading;

                  return (
                    <Button
                      key={index}
                      variant={action.variant || "zinc"}
                      disabled={isDisabled}
                      onClick={() =>
                        action.onClick(selectedEntities, actionHelpers)
                      }
                      className="w-full md:w-auto"
                      loading={action.loading || bulkLoading}
                    >
                      {action.label}
                    </Button>
                  );
                })}

                {/* Built-in Delete Action (solo si hay selección) */}
                {bulkActions.includes("delete") &&
                  selectedEntities.length > 0 && (
                    <Button
                      variant="red"
                      disabled={selectedEntities.length === 0 || bulkLoading}
                      onClick={handleDeleteSelectedEntities}
                      className="w-full md:w-auto"
                      loading={bulkLoading}
                    >
                      Eliminar {entityNamePlural}
                    </Button>
                  )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions sin customActions - Card flotante solo cuando hay selección */}
      {customActions.length === 0 &&
        bulkActions.length > 0 &&
        selectedEntities.length > 0 && (
          <Card className="mt-4 bg-gradient-to-r from-zinc-800 to-zinc-900 border-zinc-700 sticky bottom-4 shadow-2xl">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    {selectedEntities.length}
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {selectedEntities.length}{" "}
                      {selectedEntities.length === 1
                        ? entityName
                        : entityNamePlural}{" "}
                      seleccionados
                    </p>
                    <p className="text-gray-400 text-sm">
                      Selecciona una acción para aplicar
                    </p>
                  </div>
                </div>

                <div className="flex flex-col w-full md:w-auto md:flex-row gap-3">
                  {/* Built-in Delete Action */}
                  {bulkActions.includes("delete") && (
                    <Button
                      variant="red"
                      disabled={selectedEntities.length === 0 || bulkLoading}
                      onClick={handleDeleteSelectedEntities}
                      className="w-full md:w-auto"
                      loading={bulkLoading}
                    >
                      Eliminar {entityNamePlural}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}

// Exportar con memo para optimización
export default memo(EntityListPage);
