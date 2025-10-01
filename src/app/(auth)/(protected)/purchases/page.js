"use client";

import Button from "@/components/ui/Button";
import Filters from "@/components/ui/Filters";
import Input from "@/components/ui/Input";
import Table from "@/components/ui/Table";
import { useOrders } from "@/lib/hooks/useOrders";
import format from "@/lib/utils/format";
import { orderStatesArray } from "@/lib/utils/orderStates";
import { ORDER_TYPES } from "@/lib/utils/orderTypes";
import unitsAreConsistent from "@/lib/utils/unitsConsistency";
import moment from "moment-timezone";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

export default function PurchasesPage() {
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState({ from: null, to: null });
  const states = orderStatesArray;
  const [selectedStates, setSelectedStates] = useState(
    new Set(states.map((s) => s.key))
  );
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    setCurrentPage(1); // Resetear a página 1 cuando cambien los filtros
  }, [search, selectedStates, range.from, range.to]);

  const buildDateFilter = (range) => {
    if (!range.from && !range.to) return {};

    const dateFilter = {};

    if (range.from) {
      // Convertir a formato YYYY-MM-DD
      const fromDate =
        range.from instanceof Date
          ? range.from.toISOString().split("T")[0]
          : range.from;
      dateFilter.$gte = fromDate;
    }

    if (range.to) {
      // Convertir a formato YYYY-MM-DD y agregar tiempo final del día
      const toDate =
        range.to instanceof Date
          ? range.to.toISOString().split("T")[0]
          : range.to;
      dateFilter.$lte = toDate;
    }

    return { createdAt: dateFilter };
  };
  const { orders, deleteOrder, updateOrder, refetch, isWorking, pagination } =
    useOrders({
      pagination: { page: currentPage, pageSize: 20 },
      q: search,
      sort: ["updatedAt:desc"],
      filters: {
        type: "purchase",
        supplier: {
          name: {
            $contains: search,
          },
        },
        state: Array.from(selectedStates),
        ...buildDateFilter(range),
      },
      populate: [
        "orderProducts",
        "orderProducts.product",
        "supplier",
        "sourceWarehouse",
        "destinationWarehouse",
        "generatedBy",
      ],
    });

  useEffect(() => {
    setLoading(isWorking);
  }, [isWorking]);

  const { orders: confirmedOrders, pagination: confirmedOrdersPagination } =
    useOrders({
      pagination: { page: currentPage, pageSize: 20 },
      q: search,
      sort: ["updatedAt:desc"],
      filters: {
        type: "purchase",
        state: "confirmed",
      },
      populate: [
        "orderProducts",
        "orderProducts.product",
        "supplier",
        "sourceWarehouse",
        "destinationWarehouse",
        "generatedBy",
      ],
    });

  const confirmedOrdersColumns = [
    {
      key: "code",
      label: "Código",
    },
    {
      key: "id",
      label: "Items",
      render: (id) => {
        const order = orders.find((o) => o.id === id);
        if (order && order?.orderProducts) {
          const { orderProducts } = order;
          if (order.state === "draft") {
            return format(
              orderProducts.reduce((acc, oP) => acc + oP.requestedPackages, 0)
            );
          }
          if (order.state === "confirmed") {
            return format(
              orderProducts.reduce((acc, oP) => acc + oP.confirmedPackages, 0)
            );
          }
          if (order.state === "completed") {
            return format(
              orderProducts.reduce((acc, oP) => acc + oP.deliveredPackages, 0)
            );
          }
        }
        return format(0);
      },
    },
  ];
  const orderColumns = [
    {
      key: "code",
      label: "Código",
    },
    {
      key: "supplier",
      label: "Proveedor",
      render: (supplier) => (supplier ? `${supplier.name}` : "-"),
    },
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
        if (order && order?.orderProducts) {
          const { orderProducts } = order;
          if (order.state === "draft") {
            return format(
              orderProducts.reduce((acc, oP) => acc + oP.requestedPackages, 0)
            );
          }
          if (order.state === "confirmed") {
            return format(
              orderProducts.reduce((acc, oP) => acc + oP.confirmedPackages, 0)
            );
          }
          if (order.state === "completed") {
            return format(
              orderProducts.reduce((acc, oP) => acc + oP.deliveredPackages, 0)
            );
          }
        }

        return format(0);
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

  // Función para generar path de detalle
  const getOrderDetailPath = (order) => `/purchases/${order.id}`;

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
          <span className="bg-yellow-400 font-bold text-xs  me-2 px-4 py-2 rounded-full">
            Confirmado
          </span>
        );
      case "canceled":
        return (
          <span className="bg-red-600 font-bold text-xs  me-2 px-4 py-2 rounded-full">
            Cancelado
          </span>
        );
      case "completed":
        return (
          <span className="bg-emerald-700 font-bold text-xs  me-2 px-4 py-2 rounded-full">
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

  // Manejar selección de órdenes
  const handleOrderSelection = (selectedIds) => {
    setSelectedOrders(selectedIds);
  };

  // Manejar edición de orden
  const handleOrderEdit = (order) => {
    console.log("Editar orden:", order);
    // Aquí podrías abrir un modal de edición
  };

  // Función para renderizar contenido expandido
  const renderOrderExpandedContent = (order, rowIndex) => {
    console.log("ORDEN", order, rowIndex);
    moment().tz("America/Bogota");
    const consistency = unitsAreConsistent(
      order.orderProducts?.map((o) => o.product)
    );
    let totalQuantity = consistency ? 0 : " - ";
    let grandTotal = 0;
    let totalPackages = 0;
    let unit = "";
    if (consistency && order.orderProducts.length > 0) {
      unit = order.orderProducts[0].unit;
    }
    const products = order.orderProducts.map((orderProduct) => {
      const quantity = Number(
        order.state === "draft"
          ? orderProduct.requestedQuantity
          : order.state === "confirmed"
          ? orderProduct.confirmedQuantity
          : orderProduct.deliveredQuantity
      );
      const packages = Number(
        order.state === "draft"
          ? orderProduct.requestedPackages
          : order.state === "confirmed"
          ? orderProduct.confirmedPackages
          : orderProduct.deliveredPackages
      );
      const price = Number(orderProduct.price);
      const total = Number(price * quantity);
      if (consistency) {
        totalQuantity += quantity;
      }
      grandTotal += total;
      totalPackages += packages;
      return {
        id: `EXPANDED-${orderProduct.id}`,
        name: orderProduct.name,
        price,
        quantity,
        packages,
        price,
        total,
        unit: orderProduct.product.unit,
      };
    });
    const details = [];
    /*
    if (order.state === "draft" && order.type === ORDER_TYPES.PURCHASE) {
      details.push(
        ...[
          {
            label: "Deposito Estimado",
            date: moment(order.estimatedDepositPaymentDate).format(
              "DD-MM-YYYY"
            ),
          },
          {
            label: "Despacho Estimado",
            date: moment(order.estimatedDispatchDate).format("DD-MM-YYYY"),
          },
          {
            label: "Recepción Estimada",
            date: moment(order.estimatedWarehouseDate).format("DD-MM-YYYY"),
          },
        ]
      );
    }*/
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          <div className="col-span-1 md:col-span-5 rounded-4xl">
            <h3 className="font-bold text-lg py-2">Resumen de productos</h3>
            <Table
              columns={[
                {
                  key: "name",
                  label: "Producto",
                  footer: "Total",
                },
                {
                  key: "price",
                  label: "Precio",
                  render: (_, row) => format(row.price, "$") || "-",
                  footer: "-",
                },
                {
                  key: "quantity",
                  label: "Cantidad",
                  footer: (data) =>
                    unitsAreConsistent(data)
                      ? format(
                          data.reduce(
                            (acc, product) => acc + Number(product.quantity),
                            0
                          )
                        )
                      : "-",
                },
                {
                  key: "packages",
                  label: "Unidades",
                  footer: (data) =>
                    format(
                      data.reduce(
                        (acc, product) => acc + Number(product.packages),
                        0
                      )
                    ),
                },
                {
                  key: "total",
                  label: "Total",
                  reder: (_, row) => format(row.total, "$") || "-",
                  footer: (data) =>
                    format(
                      data.reduce(
                        (acc, product) => acc + Number(product.total),
                        0
                      ),
                      "$"
                    ),
                },
              ]}
              data={products}
            />
          </div>
          <div className="col-span-1 md:col-span-2">
            <h3 className="font-bold text-lg py-2">Detalles</h3>
            <Table
              columns={[
                { key: "label", label: "Fechas" },
                { key: "date", label: "-" },
              ]}
              data={details}
            />
          </div>
        </div>
      </div>
    );
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
    try {
      const promises = selectedOrders.map((orderId) =>
        updateOrder(orderId, { state: "completed" })
      );
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
  const handleConfirmSelectedOrder = async () => {
    if (selectedOrders.length === 0) {
      toast.error("No hay órdenes seleccionadas");
      return;
    }
    const result = await Swal.fire({
      title: "Confirmar Órdenes",
      html: `Se confirmarán <strong>${selectedOrders.length}</strong> orden(es) <br/> Esta acción no se puede deshacer.`,
      icon: "info",
      iconColor: "red",
      showCancelButton: true,
      confirmButtonText: "Sí, confirmar",
      cancelButtonText: "Cancelar",
      background: "#27272a",
      color: "#fff",
      confirmButtonColor: "red",
      cancelButtonColor: "#71717a",
    });
    if (!result.isConfirmed) return;
    const loadingToast = toast.loading("Eliminando órdenes...");
    try {
      const promises = selectedOrders.map((orderId) =>
        updateOrder(orderId, { state: "confirmed" })
      );
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
  const handleDeleteOrder = async (orderId) => {
    const order = orders.find((order) => order.id === orderId);
    if (order.state !== "draft" && order.state !== "confirmed") {
      toast.error("No se puede eliminar la orden");
      return;
    }
    const result = await Swal.fire({
      title: "Eliminar Órdenes",
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
    const loadingToast = toast.loading("Eliminando órdenes...");
    try {
      const result = await deleteOrder(order.id);
      toast.dismiss(loadingToast);
      if (result.success) {
        toast.success(
          `Órdenen ${order.containerCode || order.code} eliminada exitosamente`
        );
        setSelectedOrders([]);
      } else {
        toast.error(
          `Se produjo un error al eliminar la órden ${
            order.containerCode || order.code
          }`,
          { duration: 5000 }
        );
      }
      await refetch();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error al eliminar órden");
      console.error("Error:", error);
    } finally {
      setBulkLoading(false);
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
    <div className="w-full md:px-4">
      <h1 className="font-bold text-3xl  py-4 ">Ordenes de Compra</h1>
      <Filters
        search={search}
        setSearch={setSearch}
        dropdownOptions={[{ key: "purchase", value: "Compra" }]}
        range={range}
        setRange={setRange}
        options={states}
        setSelectedOptions={setSelectedStates}
      />
      <Table
        columns={orderColumns}
        data={orders}
        renderExpandedContent={renderOrderExpandedContent}
        onRowSelect={handleOrderSelection}
        onRowEdit={handleOrderEdit}
        loading={loading}
        pagination={pagination}
        getDetailPath={getOrderDetailPath}
        onPageChange={setCurrentPage}
        onRowDelete={(row) => handleDeleteOrder(row)}
        canDeleteRow={(row) =>
          row.state === "draft" || row.state === "confirmed"
        }
        emptyMessage="No se encontraron órdenes de compra con los filtros existentes"
      />

      <div className="py-4 flex flex-col w-full md:w-auto md:flex-row gap-3 md:justify-end">
        <Button
          variant="zinc"
          disabled={selectedOrders.length === 0}
          onClick={handleConfirmSelectedOrder}
          className="w-full md:w-auto"
        >
          Confirmar Ordenes
        </Button>
        <Button
          variant="emerald"
          disabled={selectedOrders.length === 0}
          onClick={handleCompleteSelectedOrders}
          className="w-full md:w-auto"
        >
          Completar Ordenes
        </Button>
        <Button
          variant="red"
          disabled={selectedOrders.length === 0}
          onClick={handleDeleteSelectedOrders}
          className="w-full md:w-auto"
        >
          Eliminar Ordenes
        </Button>
      </div>
    </div>
  );
}
