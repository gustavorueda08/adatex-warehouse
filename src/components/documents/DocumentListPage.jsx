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
import { useOrders } from "@/lib/hooks/useOrders";
import format from "@/lib/utils/format";
import { orderStatesArray } from "@/lib/utils/orderStates";
import unitsAreConsistent from "@/lib/utils/unitsConsistency";
import moment from "moment-timezone";
import { useEffect, useState, useCallback, memo } from "react";
import { v4 } from "uuid";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { buildInvoiceLabel } from "@/lib/utils/invoiceLabel";

/**
 * Componente reutilizable para listado de documentos (sales, purchases, returns, etc.)
 * Optimizado con React.memo para prevenir re-renders innecesarios
 *
 * @param {Object} props
 * @param {string} props.documentType - Tipo de documento: 'sale' | 'purchase' | 'return'
 * @param {string} props.title - Título de la página
 * @param {string} props.relationField - Campo de relación: 'customer' | 'supplier'
 * @param {string} props.relationLabel - Etiqueta para mostrar: 'Cliente' | 'Proveedor'
 * @param {Function} props.getDetailPath - Función que recibe (order) y retorna string path
 * @param {boolean} props.showPricing - Si debe mostrar precios en expanded content
 * @param {Array} props.bulkActions - Array de acciones: ['confirm', 'complete', 'delete']
 * @param {string} props.createPath - Path para crear nuevo documento
 * @param {Array} props.customColumns - Columnas adicionales para la tabla
 * @param {Function} props.customExpandedContent - Función personalizada para contenido expandido
 * @param {Object} props.filterOptions - Opciones adicionales para el componente Filters
 */
function DocumentListPage({
  documentType,
  title,
  relationField,
  relationLabel,
  getDetailPath,
  showPricing = false,
  bulkActions = [],
  createPath,
  customColumns = [],
  customExpandedContent = null,
  filterOptions = {},
}) {
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [range, setRange] = useState({ from: null, to: null });
  const states = orderStatesArray;
  const [selectedStates, setSelectedStates] = useState(
    new Set(states.map((s) => s.key))
  );
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedStates, range.from, range.to]);

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
    orders,
    meta,
    loading,
    pagination,
    deleteOrder,
    updateOrder,
    refetch,
  } = useOrders({
    pagination: { page: currentPage, pageSize: 20 },
    sort: ["updatedAt:desc"],
    filters: {
      type: documentType,
      ...(debouncedSearch
        ? {
            $or: [
              ...(relationField
                ? [
                    {
                      [relationField]: {
                        name: {
                          $containsi: debouncedSearch,
                        },
                      },
                    },
                  ]
                : []),
              {
                code: {
                  $containsi: debouncedSearch,
                },
              },
              {
                containerCode: {
                  $containsi: debouncedSearch,
                },
              },
              {
                invoiceNumber: {
                  $containsi: debouncedSearch,
                },
              },
            ],
          }
        : {}),
      ...(selectedStates.size > 0
        ? { state: { $in: Array.from(selectedStates) } }
        : {}),
      ...buildDateFilter(range),
    },
    // OPTIMIZACIÓN: Solo cargar campos mínimos para la lista
    // Los datos adicionales se cargarán solo al expandir
    populate: [
      "orderProducts",
      "orderProducts.items",
      "orderProducts.product", // Needed for update payload
      "customerForInvoice", // Needed for update payload
      "sourceWarehouse", // Needed for update payload
      ...(relationField ? [relationField] : []),
    ],
  });

  const renderStateBadge = (state) => {
    switch (state) {
      case "draft":
        return (
          <span className="bg-zinc-500 font-bold text-xs me-2 px-4 py-2 rounded-full">
            Borrador
          </span>
        );
      case "confirmed":
        return (
          <span className="bg-yellow-400 font-bold text-xs me-2 px-4 py-2 rounded-full">
            Confirmado
          </span>
        );
      case "canceled":
        return (
          <span className="bg-red-600 font-bold text-xs me-2 px-4 py-2 rounded-full">
            Cancelado
          </span>
        );
      case "completed":
        return (
          <span className="bg-emerald-700 font-bold text-xs me-2 px-4 py-2 rounded-full">
            Completado
          </span>
        );
      default:
        return (
          <span className="bg-zinc-500 font-bold text-xs me-2 px-4 py-2 rounded-full">
            Otro
          </span>
        );
    }
  };

  const getItemsCount = (order) => {
    if (!order?.orderProducts) return 0;

    const { orderProducts, state } = order;

    switch (state) {
      case "draft":
        return orderProducts.reduce((acc, oP) => acc + oP.requestedPackages, 0);
      case "confirmed":
        return orderProducts.reduce((acc, oP) => acc + oP.confirmedPackages, 0);
      case "completed":
        return orderProducts.reduce((acc, oP) => acc + oP.deliveredPackages, 0);
      default:
        return 0;
    }
  };

  const getDocumentCode = (row) => {
    const parts = [row.code || ""];
    if (row.containerCode) parts.push(row.containerCode);
    return parts.filter(Boolean).join(" | ");
  };

  // Columnas base comunes a todos los documentos
  const baseColumns = [
    {
      key: "code",
      label: "Código",
      render: (_, row) => <p>{getDocumentCode(row)}</p>,
    },
    ...(relationField
      ? [
          {
            key: relationField,
            label: relationLabel || "Relacionado",
            render: (relation) =>
              relation
                ? `${
                    `${relation.name} ${relation.lastName || ""}` ||
                    buildInvoiceLabel(relation)
                  }`
                : "-",
          },
        ]
      : []),
    {
      key: "state",
      label: "Estado",
      render: (state) => renderStateBadge(state),
    },
    {
      key: "id",
      label: "Items",
      render: (id) => {
        const order = orders.find((o) => o.id === id);
        return format(getItemsCount(order));
      },
    },
    {
      key: "createdAt",
      label: "Fecha de Creación",
      render: (date) =>
        moment(date).tz("America/Bogota").format("DD-MM-YYYY | h:mm a"),
    },
    {
      key: "updatedAt",
      label: "Última actualización",
      render: (date) =>
        moment(date).tz("America/Bogota").format("DD-MM-YYYY | h:mm a"),
    },
  ];

  // Combinar columnas base con columnas personalizadas
  const orderColumns = [...baseColumns, ...customColumns];

  const handleOrderSelection = (selectedIds) => {
    setSelectedOrders(selectedIds);
  };

  const handleOrderEdit = (order) => {
    console.log("Editar orden:", order);
  };

  const getProductQuantity = (product, orderState) => {
    switch (orderState) {
      case "draft":
        return product.requestedQuantity;
      case "confirmed":
        return product.confirmedQuantity;
      case "completed":
        return product.deliveredQuantity;
      default:
        return 0;
    }
  };

  const getProductItemsCount = (product, orderState) => {
    switch (orderState) {
      case "draft":
        return product.requestedPackages;
      case "confirmed":
        return product.confirmedPackages;
      case "completed":
        return product.deliveredPackages;
      default:
        return 0;
    }
  };

  const renderOrderExpandedContent = (order, rowIndex) => {
    console.log(order);

    // Si hay contenido personalizado, usarlo
    if (customExpandedContent) {
      return customExpandedContent(order, rowIndex, {
        getProductQuantity,
        getProductItemsCount,
        format,
        moment,
        unitsAreConsistent,
      });
    }

    // Contenido expandido por defecto

    moment().tz("America/Bogota");
    const products = order?.orderProducts || [];
    const consistency = true;

    const details = [
      {
        label: "Fecha de creación",
        date: moment(order.dateCreated).format("DD-MM-YYYY | h:mm a"),
        id: `${v4()}-created`,
      },
      {
        label: "Fecha de Confirmación",
        date: moment(order.dateConfirmed).isValid()
          ? moment(order.dateConfirmed).format("DD-MM-YYYY | h:mm a")
          : "-",
        id: `${v4()}-confirmed`,
      },
      {
        label: "Fecha de Despacho",
        date: moment(order.completedDate || order.actualDispatchDate).isValid()
          ? moment(order.completedDate || order.actualDispatchDate).format(
              "DD-MM-YYYY | h:mm a"
            )
          : "-",
        id: `${v4()}-completed`,
      },
    ];

    // Preparar datos de productos
    const productData = products.map((orderProduct) => {
      const quantity = getProductQuantity(orderProduct, order.state);
      const packages = getProductItemsCount(orderProduct, order.state);
      const price = Number(orderProduct.price || 0);
      const total = price * quantity;

      return {
        id: `EXPANDED-${orderProduct.id}`,
        name: orderProduct.name,
        quantity,
        packages,
        unit: orderProduct.product?.unit || orderProduct.unit,
        price,
        total,
      };
    });

    // Columnas base para productos
    const productColumns = [
      {
        key: "name",
        label: "Producto",
        footer: "Total",
      },
    ];

    // Agregar columna de precio si showPricing es true
    if (showPricing) {
      productColumns.push({
        key: "price",
        label: "Precio",
        render: (_, row) => format(row.price, "$") || "-",
        footer: "-",
      });
    }

    // Agregar columnas de cantidad y unidades
    productColumns.push(
      {
        key: "quantity",
        label: order.state === "draft" ? "Cantidad requerida" : "Cantidad",
        render: (_, row) => `${format(row.quantity)} ${row.unit}`,
        footer: (data) =>
          consistency
            ? `${format(data.reduce((acc, p) => acc + p.quantity, 0))} ${
                data.length > 0 ? String(data[0].unit).toLowerCase() : "-"
              }`
            : "-",
      },
      {
        key: "packages",
        label: order.state === "draft" ? "Unidades requeridas" : "Unidades",
        render: (_, row) => format(row.packages),
        footer: (data) => format(data.reduce((acc, p) => acc + p.packages, 0)),
      }
    );

    // Agregar columna de total si showPricing es true
    if (showPricing) {
      productColumns.push({
        key: "total",
        label: "Total",
        render: (_, row) => format(row.total, "$") || "-",
        footer: (data) =>
          format(
            data.reduce((acc, p) => acc + p.total, 0),
            "$"
          ),
      });
    }

    return (
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          <div className="col-span-1 md:col-span-5">
            <Card className="bg-zinc-900 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-base">
                  Resumen de productos
                </CardTitle>
                <CardDescription className="text-xs">
                  Listado completo de productos en esta orden
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                <Table columns={productColumns} data={productData} />
              </CardContent>
            </Card>
          </div>
          <div className="col-span-1 md:col-span-2">
            <Card className="bg-zinc-900 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-base">Fechas importantes</CardTitle>
                <CardDescription className="text-xs">
                  Histórico de la orden
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                <Table
                  columns={[
                    { key: "label", label: "Fechas" },
                    { key: "date", label: "-" },
                  ]}
                  hiddenHeader
                  data={details}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  // Helper to prepare update payload
  const prepareUpdatePayload = (order, updates) => {
    return {
      ...updates,
      notes: order.notes,
      createdDate: order.createdDate,
      // Relations (as IDs)
      [relationField]: order[relationField]?.id,
      customerForInvoice: order.customerForInvoice?.id,
      sourceWarehouse: order.sourceWarehouse?.id,
      emitInvoice: order.emitInvoice,

      // Order Products
      products: order.orderProducts.map((op) => ({
        id: op.id,
        product: op.product?.id,
        requestedQuantity: op.requestedQuantity,
        price: op.price,
        ivaIncluded: op.ivaIncluded,
        invoicePercentage: op.invoicePercentage,
        items:
          op.items?.map((item) => ({
            id: item.id,
            lot: item.lot,
            itemNumber: item.itemNumber,
            parentItem: item.parentItem?.id || item.parentItem || null,
            quantity: item.quantity,
          })) || [],
      })),
    };
  };

  // Bulk Actions Handlers
  const handleConfirmSelectedOrders = async () => {
    if (selectedOrders.length === 0) {
      toast.error("No hay órdenes seleccionadas");
      return;
    }
    const result = await Swal.fire({
      title: "Confirmar Órdenes",
      html: `Se confirmarán <strong>${selectedOrders.length}</strong> orden(es) <br/> Esta acción no se puede deshacer.`,
      icon: "info",
      iconColor: "yellow",
      showCancelButton: true,
      confirmButtonText: "Sí, confirmar",
      cancelButtonText: "Cancelar",
      background: "#27272a",
      color: "#fff",
      confirmButtonColor: "#facc15",
      cancelButtonColor: "#71717a",
    });
    if (!result.isConfirmed) return;

    const loadingToast = toast.loading("Confirmando órdenes...");
    setBulkLoading(true);
    try {
      const promises = selectedOrders.map((orderId) => {
        const order = orders.find((o) => o.id === orderId);
        if (!order) return Promise.resolve({ success: false }); // Should not happen

        const payload = prepareUpdatePayload(order, {
          state: "confirmed",
          confirmedDate: moment.tz("America/Bogota").toDate(),
        });

        return updateOrder(orderId, payload);
      });

      const results = await Promise.all(promises);
      const allSuccess = results.every((r) => r.success);
      const failedCount = results.filter((r) => !r.success).length;

      toast.dismiss(loadingToast);

      if (allSuccess) {
        toast.success(
          `${selectedOrders.length} órdenes confirmadas exitosamente`
        );
        setSelectedOrders([]);
      } else {
        toast.error(
          `${
            results.length - failedCount
          } confirmadas, ${failedCount} fallaron`,
          { duration: 5000 }
        );
      }
      await refetch();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error al confirmar órdenes");
      console.error("Error:", error);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleCompleteSelectedOrders = async () => {
    if (selectedOrders.length === 0) {
      toast.error("No hay órdenes seleccionadas");
      return;
    }
    const result = await Swal.fire({
      title: "Completar Órdenes",
      html: `Se completarán <strong>${selectedOrders.length}</strong> orden(es) <br/> Esta acción no se puede deshacer.`,
      icon: "info",
      iconColor: "green",
      showCancelButton: true,
      confirmButtonText: "Sí, completar",
      cancelButtonText: "Cancelar",
      background: "#27272a",
      color: "#fff",
      confirmButtonColor: "green",
      cancelButtonColor: "#71717a",
    });
    if (!result.isConfirmed) return;

    const loadingToast = toast.loading("Completando órdenes...");
    setBulkLoading(true);
    try {
      const promises = selectedOrders.map((orderId) => {
        const order = orders.find((o) => o.id === orderId);
        if (!order) return Promise.resolve({ success: false });

        const payload = prepareUpdatePayload(order, {
          state: "completed",
          completedDate: moment.tz("America/Bogota").toDate(),
          actualDispatchDate: moment.tz("America/Bogota").toDate(),
        });

        return updateOrder(orderId, payload);
      });

      const results = await Promise.all(promises);
      const allSuccess = results.every((r) => r.success);
      const failedCount = results.filter((r) => !r.success).length;

      toast.dismiss(loadingToast);

      if (allSuccess) {
        toast.success(
          `${selectedOrders.length} órdenes completadas exitosamente`
        );
        setSelectedOrders([]);
      } else {
        toast.error(
          `${
            results.length - failedCount
          } completadas, ${failedCount} fallaron`,
          { duration: 5000 }
        );
      }
      await refetch();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error al completar órdenes");
      console.error("Error:", error);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    const order = orders.find((order) => order.id === orderId);
    if (order.state !== "draft" && order.state !== "confirmed") {
      toast.error("No se puede eliminar la orden");
      return;
    }
    const result = await Swal.fire({
      title: "Eliminar Órden",
      html: `Se eliminará la orden <strong>${
        order.containerCode || order.code
      }</strong><br/> Esta acción no se puede deshacer.`,
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

    const loadingToast = toast.loading("Eliminando orden...");
    try {
      const result = await deleteOrder(order.id);
      toast.dismiss(loadingToast);
      if (result.success) {
        toast.success(
          `Orden ${order.containerCode || order.code} eliminada exitosamente`
        );
        setSelectedOrders([]);
      } else {
        toast.error(
          `Error al eliminar la orden ${order.containerCode || order.code}`,
          { duration: 5000 }
        );
      }
      await refetch();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error al eliminar orden");
      console.error("Error:", error);
    }
  };

  const handleDeleteSelectedOrders = async () => {
    if (selectedOrders.length === 0) {
      toast.error("No hay órdenes seleccionadas");
      return;
    }
    const result = await Swal.fire({
      title: "Eliminar Órdenes",
      html: `Se eliminarán <strong>${selectedOrders.length}</strong> orden(es) <br/> Esta acción no se puede deshacer.`,
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

    const loadingToast = toast.loading("Eliminando órdenes...");
    setBulkLoading(true);
    try {
      const promises = selectedOrders.map((orderId) => deleteOrder(orderId));
      const results = await Promise.all(promises);
      const allSuccess = results.every((r) => r.success);
      const failedCount = results.filter((r) => !r.success).length;

      toast.dismiss(loadingToast);

      if (allSuccess) {
        toast.success(
          `${selectedOrders.length} órdenes eliminadas exitosamente`
        );
        setSelectedOrders([]);
      } else {
        toast.error(
          `${results.length - failedCount} eliminadas, ${failedCount} fallaron`,
          { duration: 5000 }
        );
      }
      await refetch();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error al eliminar órdenes");
      console.error("Error:", error);
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="w-full px-4 pb-6">
      {/* Header con título */}
      <div className="py-6">
        <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
        <p className="text-gray-400 text-sm">
          Gestiona y visualiza {title.toLowerCase()}
        </p>
      </div>

      {/* Card principal con filtros y tabla */}
      <Card className="mb-6">
        <CardHeader className="border-b border-zinc-700">
          <CardTitle>Filtros de búsqueda</CardTitle>
          <CardDescription>
            Filtra por código
            {relationLabel ? `, ${relationLabel.toLowerCase()}` : ""}, fecha o
            estado
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <Filters
            search={search}
            setSearch={setSearch}
            range={range}
            setRange={setRange}
            options={states}
            setSelectedOptions={setSelectedStates}
            linkPath={createPath}
            {...filterOptions}
          />
        </CardContent>
      </Card>

      {/* Card de la tabla */}
      <Card>
        <CardHeader className="border-b border-zinc-700">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Listado de órdenes</CardTitle>
              <CardDescription>
                {loading
                  ? "Cargando..."
                  : `${meta?.pagination?.total || 0} ${
                      (meta?.pagination?.total || 0) === 1
                        ? "orden encontrada"
                        : "órdenes encontradas"
                    }`}
              </CardDescription>
            </div>
            {!loading && orders.length > 0 && (
              <div className="text-sm text-gray-400">
                Página {pagination?.page || 1} de {pagination?.pageCount || 1}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="py-4">
            <Table
              columns={orderColumns}
              data={orders}
              renderExpandedContent={renderOrderExpandedContent}
              onRowSelect={handleOrderSelection}
              onRowEdit={handleOrderEdit}
              loading={loading}
              pagination={pagination}
              getDetailPath={getDetailPath}
              onPageChange={setCurrentPage}
              onRowDelete={
                bulkActions.includes("delete") ? handleDeleteOrder : undefined
              }
              canDeleteRow={
                bulkActions.includes("delete")
                  ? (row) => row.state === "draft" || row.state === "confirmed"
                  : undefined
              }
              emptyMessage={`No se encontraron órdenes con los filtros existentes`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions - Card flotante cuando hay selección */}
      {bulkActions.length > 0 && selectedOrders.length > 0 && (
        <Card className="mt-4 bg-gradient-to-r from-zinc-800 to-zinc-900 border-zinc-700 sticky bottom-4 shadow-2xl">
          <CardContent className="px-4 py-3 md:p-4">
            <div className="flex flex-col md:flex-row items-center md:items-center justify-center md:justify-between gap-4 text-center md:text-left">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                  {selectedOrders.length}
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold">
                    {selectedOrders.length}{" "}
                    {selectedOrders.length === 1
                      ? "orden seleccionada"
                      : "órdenes seleccionadas"}
                  </p>
                  <p className="text-gray-400 text-sm">
                    Selecciona una acción para aplicar
                  </p>
                </div>
              </div>
              <div className="flex flex-col w-full md:w-auto md:flex-row md:items-center justify-center gap-3">
                {bulkActions.includes("confirm") && (
                  <Button
                    variant="zinc"
                    disabled={selectedOrders.length === 0 || bulkLoading}
                    onClick={handleConfirmSelectedOrders}
                    className="w-full md:w-auto"
                    loading={bulkLoading}
                  >
                    Confirmar Ordenes
                  </Button>
                )}
                {bulkActions.includes("complete") && (
                  <Button
                    variant="emerald"
                    disabled={selectedOrders.length === 0 || bulkLoading}
                    onClick={handleCompleteSelectedOrders}
                    className="w-full md:w-auto"
                    loading={bulkLoading}
                  >
                    Completar Ordenes
                  </Button>
                )}
                {bulkActions.includes("delete") && (
                  <Button
                    variant="red"
                    disabled={selectedOrders.length === 0 || bulkLoading}
                    onClick={handleDeleteSelectedOrders}
                    className="w-full md:w-auto"
                    loading={bulkLoading}
                  >
                    Eliminar Ordenes
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
export default memo(DocumentListPage);
