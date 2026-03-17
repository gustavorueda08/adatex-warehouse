"use client";

import BulkEntitiesActions from "@/components/entities/BulkEntitiesActions";
import Entities from "@/components/entities/Entities";
import EntityFilters from "@/components/entities/EntityFilters";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import moment from "moment-timezone";
import { useUser } from "@/lib/hooks/useUser";
import RoleGuard from "@/components/auth/RoleGuard";
import { Button } from "@heroui/react";
import { exportCustomersToExcel } from "@/lib/utils/exportCustomersToExcel";
import { buildStrapiQuery } from "@/lib/api/strapiQueryBuilder";
import ExportCustomersModal from "@/components/customers/ExportCustomersModal";
import toast from "react-hot-toast";

const COP = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value || 0);

function DashboardCard({ label, value, subtitle, color = "default" }) {
  const colorClasses = {
    default: "bg-default-50 border-default-200",
    success: "bg-success-50 border-success-200",
    warning: "bg-warning-50 border-warning-200",
    primary: "bg-primary-50 border-primary-200",
  };
  return (
    <div
      className={`flex flex-col gap-1 p-4 rounded-xl border ${colorClasses[color] || colorClasses.default}`}
    >
      <span className="text-xs font-medium text-default-500 uppercase tracking-wider">
        {label}
      </span>
      <span className="text-xl lg:text-2xl font-bold text-default-900">
        {value}
      </span>
      {subtitle && (
        <span className="text-xs text-default-400">{subtitle}</span>
      )}
    </div>
  );
}

function CustomersPageInner() {
  const { user } = useUser();
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 15,
  });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportingCustomers, setExportingCustomers] = useState(false);

  const screenSize = useScreenSize();
  const filters = useMemo(() => {
    const f = {
      ...(user?.type === "seller" ? [{ seller: user?.seller?.id }] : []),
    };
    if (search) {
      const searchTerms = search
        .split(" ")
        .filter((term) => term.trim() !== "");
      if (searchTerms.length > 0) {
        const termToStatus = (term) => {
          const t = term.toLowerCase();
          const matches = [];
          if ("activo".includes(t)) matches.push("active");
          if ("riesgo".includes(t)) matches.push("at_risk");
          if ("inactivo".includes(t)) matches.push("churned");
          if ("prospecto".includes(t)) matches.push("prospect");
          if (["active", "at_risk", "churned", "prospect"].includes(t)) {
            if (!matches.includes(t)) matches.push(t);
          }
          return matches;
        };

        f.$and = searchTerms.map((term) => {
          const validStatuses = termToStatus(term);
          const orConditions = [
            { identification: { $containsi: term } },
            { name: { $containsi: term } },
            { lastName: { $containsi: term } },
            { territory: { city: { $containsi: term } } },
          ];

          if (validStatuses.length > 0) {
            orConditions.push({ status: { $in: validStatuses } });
          }

          return { $or: orConditions };
        });
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

  // ------ Dashboard summary (ALL customers matching filters, not just current page) ------
  const [dashboardSummary, setDashboardSummary] = useState({
    totalCurrentMonth: 0,
    totalProjected: 0,
    totalAvg3M: 0,
    activeCount: 0,
    totalCustomers: 0,
    loading: true,
  });

  const fetchDashboardSummary = useCallback(async () => {
    setDashboardSummary((prev) => ({ ...prev, loading: true }));
    try {
      let allCustomers = [];
      let page = 1;
      let pageCount = 1;
      const pageSize = 100;

      do {
        const queryOptions = {
          pagination: { page, pageSize },
          filters,
          fields: [
            "currentMonthVolume",
            "projectedVolume",
            "threeMonthAverage",
            "status",
          ],
        };
        const queryStr = buildStrapiQuery(queryOptions);
        const res = await fetch(`/api/strapi/customers?${queryStr}`);
        if (!res.ok) break;
        const data = await res.json();
        allCustomers.push(...(data.data || []));
        pageCount = data.meta?.pagination?.pageCount || 1;
        page++;
      } while (page <= pageCount);

      let totalCurrentMonth = 0;
      let totalProjected = 0;
      let totalAvg3M = 0;
      let activeCount = 0;

      for (const c of allCustomers) {
        totalCurrentMonth += Number(c.currentMonthVolume) || 0;
        totalProjected += Number(c.projectedVolume) || 0;
        totalAvg3M += Number(c.threeMonthAverage) || 0;
        if (c.status === "active" || c.status === "at_risk") activeCount++;
      }

      setDashboardSummary({
        totalCurrentMonth,
        totalProjected,
        totalAvg3M,
        activeCount,
        totalCustomers: allCustomers.length,
        loading: false,
      });
    } catch (err) {
      console.error("Error fetching dashboard summary:", err);
      setDashboardSummary((prev) => ({ ...prev, loading: false }));
    }
  }, [filters]);

  useEffect(() => {
    fetchDashboardSummary();
  }, [fetchDashboardSummary]);


  const columns = [
    {
      key: "identification",
      label: "Identificación",
      render: (customer) => (
        <Link href={`/customers/${customer.id}`}>
          <span className="text-default-900 font-medium hover:underline cursor-pointer">
            {customer.identification}
          </span>
        </Link>
      ),
    },
    {
      key: "name",
      label: "Nombre",
      render: (customer) => (
        <Link href={`/customers/${customer.id}`}>
          <span className="text-default-900 font-medium hover:underline cursor-pointer">
            {`${customer.name} ${customer.lastName || ""}`}
          </span>
        </Link>
      ),
    },
    {
      key: "city",
      label: "Ciudad",
      render: (customer) => (
        <Link href={`/customers/${customer.id}`}>
          <span className="text-default-900 font-medium hover:underline cursor-pointer">
            {customer?.territory?.city || "-"}
          </span>
        </Link>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (customer) => {
        const bgColors = {
          active: "bg-success/20 text-success-800",
          at_risk: "bg-warning/20 text-warning-800",
          churned: "bg-danger/20 text-danger-800",
          prospect: "bg-primary/20 text-primary-800",
        };
        const labels = {
          active: "Activo",
          at_risk: "En Riesgo",
          churned: "Inactivo",
          prospect: "Prospecto",
        };
        const status = customer.status || "active";
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${bgColors[status] || bgColors.active}`}
          >
            {labels[status] || labels.active}
          </span>
        );
      },
    },
    {
      key: "currentMonthVolume",
      label: "Ventas Mes",
      render: (customer) => (
        <span className="text-default-900 font-medium">
          {COP(customer.currentMonthVolume)}
        </span>
      ),
    },
    {
      key: "projectedVolume",
      label: "Proyección",
      render: (customer) => {
        const projected = customer.projectedVolume || 0;
        const avg = customer.threeMonthAverage || 0;
        const isAboveAvg = projected >= avg;
        return (
          <span
            className={`font-semibold ${
              projected === 0
                ? "text-default-400"
                : isAboveAvg
                  ? "text-success-600"
                  : "text-warning-600"
            }`}
          >
            {COP(projected)}
          </span>
        );
      },
    },
    {
      key: "monthlyVolume",
      label: "Volumen (30d)",
      render: (customer) => (
        <span className="text-default-900">{COP(customer.monthlyVolume)}</span>
      ),
    },
    {
      key: "lastPurchaseDate",
      label: "Última Compra",
      render: (customer) => (
        <span className="text-default-900">
          {customer.lastPurchaseDate
            ? moment(customer.lastPurchaseDate).format("DD/MM/YYYY")
            : "N/A"}
        </span>
      ),
    },
    {
      key: "topProducts",
      label: "Productos Principales",
      render: (customer) => {
        if (!customer.topProducts || customer.topProducts.length === 0)
          return "-";

        return (
          <div className="flex flex-col gap-1 max-w-[200px]">
            {customer.topProducts.slice(0, 3).map((p, idx) => (
              <span
                key={idx}
                className="text-xs text-default-600 truncate"
                title={`${p.name} (${p.quantity} ${p.unit})`}
              >
                • {p.name} ({p.quantity} {p.unit})
              </span>
            ))}
          </div>
        );
      },
    },
  ];

  const handleDelete = async () => {
    if (selectedKeys.size === 0 && selectedKeys !== "all") return;

    try {
      let idsToDelete = [];
      if (selectedKeys === "all") {
        idsToDelete = customers.map((c) => c.id);
      } else {
        idsToDelete = Array.from(selectedKeys);
      }

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

  const handleExportCustomers = async (exportType) => {
    setExportingCustomers(true);
    try {
      await exportCustomersToExcel({
        localCustomers: customers,
        filters,
        exportType,
        toast: {
          loading: (msg) => toast.loading(msg),
          success: (msg) => toast.success(msg),
          error: (msg) => toast.error(msg),
          dismiss: (id) => toast.dismiss(id),
        },
      });
      setIsExportModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setExportingCustomers(false);
    }
  };

  const currentMonthName = moment().format("MMMM YYYY");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="font-bold text-xl lg:text-3xl">Clientes</h1>
        <Button
          color="success"
          variant="flat"
          onPress={() => setIsExportModalOpen(true)}
          isDisabled={loading}
        >
          Exportar a Excel
        </Button>
      </div>

      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardCard
          label={`Ventas ${currentMonthName}`}
          value={COP(dashboardSummary.totalCurrentMonth)}
          subtitle={`${dashboardSummary.activeCount} clientes activos de ${dashboardSummary.totalCustomers}`}
          color="primary"
        />
        <DashboardCard
          label="Proyección Fin de Mes"
          value={COP(dashboardSummary.totalProjected)}
          subtitle="Modelo estacional + tendencia"
          color={
            dashboardSummary.totalProjected >= dashboardSummary.totalAvg3M
              ? "success"
              : "warning"
          }
        />
        <DashboardCard
          label="Promedio Mensual (3M)"
          value={COP(dashboardSummary.totalAvg3M)}
          subtitle="Últimos 90 días ÷ 3"
          color="default"
        />
        <DashboardCard
          label="Cumplimiento vs Promedio"
          value={
            dashboardSummary.totalAvg3M > 0
              ? `${Math.round(
                  (dashboardSummary.totalCurrentMonth /
                    dashboardSummary.totalAvg3M) *
                    100
                )}%`
              : "N/A"
          }
          subtitle={`Día ${moment().date()} de ${moment().daysInMonth()}`}
          color={
            dashboardSummary.totalAvg3M > 0 &&
            dashboardSummary.totalCurrentMonth /
              dashboardSummary.totalAvg3M >=
              0.8
              ? "success"
              : "warning"
          }
        />
      </div>

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
      {user?.type !== "seller" &&
        (selectedKeys === "all" || selectedKeys?.size > 0) && (
          <BulkEntitiesActions
            entities={customers}
            selectedKeys={selectedKeys}
            onDelete={handleDelete}
            loading={loading || isFetching}
          />
        )}

      <ExportCustomersModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={handleExportCustomers}
        loading={exportingCustomers}
      />
    </div>
  );
}

export default function CustomersPage(params) {
  return (
    <RoleGuard forbiddenRoles={[]} fallbackRoute="/">
      <CustomersPageInner {...params} />
    </RoleGuard>
  );
}
