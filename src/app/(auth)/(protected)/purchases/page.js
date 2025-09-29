"use client";

import Filters from "@/components/ui/Filters";
import Table from "@/components/ui/Table";
import { useOrders } from "@/lib/hooks/useOrders";
import format from "@/lib/utils/forrmat";
import { orderStatesArray } from "@/lib/utils/orderStates";
import { ORDER_TYPES } from "@/lib/utils/orderTypes";
import unitsAreConsistent from "@/lib/utils/unitsConsistency";
import moment from "moment-timezone";
import { useEffect, useState } from "react";

export default function PurchasesPage() {
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState({ from: null, to: null });
  const states = orderStatesArray;
  const [selectedStates, setSelectedStates] = useState(
    new Set(states.map((s) => s.key))
  );

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
  const { orders, meta, loading, pagination } = useOrders({
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
    console.log("Órdenes seleccionadas:", selectedIds);
  };

  // Manejar edición de orden
  const handleOrderEdit = (order) => {
    console.log("Editar orden:", order);
    // Aquí podrías abrir un modal de edición
  };

  // Función para renderizar contenido expandido
  const renderOrderExpandedContent = (order, rowIndex) => {
    moment().tz("America/Bogota");
    const consistency = unitsAreConsistent(
      order.orderProducts.map((o) => o.product)
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
      const price = Number(orderProduct.unitPrice);
      const total = Number(price * quantity);
      if (consistency) {
        totalQuantity += quantity;
      }
      grandTotal += total;
      totalPackages += packages;
      return {
        id: orderProduct.id,
        name: orderProduct.name,
        unitPrice: format(orderProduct.unitePrice, "$"),
        quantity: `${format(quantity)} ${orderProduct.product.unit}`,
        packages: format(packages),
        price: format(price, "$"),
        total: format(total, "$"),
      };
    });
    const details = [];
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
    }
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-4">
          <div className="col-span-5">
            <h3 className="font-bold text-lg py-2">Resumen de productos</h3>
            <Table
              columns={[
                {
                  key: "name",
                  label: "Producto",
                },
                {
                  key: "price",
                  label: "Precio",
                },
                {
                  key: "quantity",
                  label: "Cantidad",
                },
                {
                  key: "packages",
                  label: "Unidades",
                },
                {
                  key: "total",
                  label: "Total",
                },
              ]}
              data={[
                ...products,
                {
                  name: "Gran Total",
                  price: "-",
                  quantity:
                    unitsAreConsistent && products.length > 0
                      ? `${format(totalQuantity)} ${unit}`
                      : "-",
                  packages: format(totalPackages),
                  total: format(grandTotal, "$"),
                  className: "font-bold",
                },
              ]}
            />
          </div>
          <div className="col-span-2">
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

  return (
    <div className="w-full px-4">
      {loading && <div>Cargando</div>}
      <h1 className="py-5 text-3xl font-bold">Ordenes de Compra</h1>
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
      />
    </div>
  );
}
