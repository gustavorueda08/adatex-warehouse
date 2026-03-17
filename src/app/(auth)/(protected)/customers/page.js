"use client";

import BulkEntitiesActions from "@/components/entities/BulkEntitiesActions";
import Entities from "@/components/entities/Entities";
import EntityFilters from "@/components/entities/EntityFilters";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import { useMemo, useState } from "react";
import Link from "next/link";
import moment from "moment-timezone";
import { useUser } from "@/lib/hooks/useUser";
import RoleGuard from "@/components/auth/RoleGuard";
import { Button } from "@heroui/react";
import { exportCustomersToExcel } from "@/lib/utils/exportCustomersToExcel";
import ExportCustomersModal from "@/components/customers/ExportCustomersModal";
import toast from "react-hot-toast";

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
          // Include actual values just in case
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

          // Only add status to the OR if the term matches a valid enum value
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
  const columns = [
    {
      key: "identification",
      label: "Identificación",
      render: (customer) => {
        return (
          <Link href={`/customers/${customer.id}`}>
            <span className="text-default-900 font-medium hover:underline cursor-pointer">
              {customer.identification}
            </span>
          </Link>
        );
      },
    },
    {
      key: "name",
      label: "Nombre",
      render: (customer) => {
        return (
          <Link href={`/customers/${customer.id}`}>
            <span className="text-default-900 font-medium hover:underline cursor-pointer">
              {`${customer.name} ${customer.lastName || ""}`}
            </span>
          </Link>
        );
      },
    },
    {
      key: "city",
      label: "Ciudad",
      render: (customer) => {
        return (
          <Link href={`/customers/${customer.id}`}>
            <span className="text-default-900 font-medium hover:underline cursor-pointer">
              {customer?.territory?.city || "-"}
            </span>
          </Link>
        );
      },
    },
    {
      key: "address",
      label: "Dirección",
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
      key: "monthlyVolume",
      label: "Volumen (30 días)",
      render: (customer) => {
        return (
          <span className="text-default-900">
            {new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: "COP",
            }).format(customer.monthlyVolume || 0)}
          </span>
        );
      },
    },
    {
      key: "lastPurchaseDate",
      label: "Última Compra",
      render: (customer) => {
        return (
          <span className="text-default-900">
            {customer.lastPurchaseDate
              ? moment(customer.lastPurchaseDate).format("DD/MM/YYYY")
              : "N/A"}
          </span>
        );
      },
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
    {
      key: "updatedAt",
      label: "Última actualización",
      render: (customer) => {
        return (
          <Link href={`/customers/${customer.id}`}>
            <span className="text-default-900 font-medium hover:underline cursor-pointer">
              {moment(customer.updatedAt).format("DD/MM/YYYY")}
            </span>
          </Link>
        );
      },
    },
  ];

  const handleDelete = async () => {
    if (selectedKeys.size === 0 && selectedKeys !== "all") return;

    try {
      let idsToDelete = [];
      if (selectedKeys === "all") {
        // If all selected, use current page items (or fetch all if needed, but for now current view)
        idsToDelete = customers.map((c) => c.id);
      } else {
        idsToDelete = Array.from(selectedKeys);
      }

      // Execute deletions
      // We could use Promise.all but might want to be careful with rate limits if many
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="font-bold text-xl lg:text-3xl">Clientes</h1>
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

      {/* Export Button below bulk actions or as a floating/bottom action if desired. Adding to Top next to Title works better usually. Let's add it near the title */}
      <div className="flex md:justify-end">
        <Button
          color="success"
          onPress={() => setIsExportModalOpen(true)}
          isDisabled={loading}
        >
          Exportar a Excel
        </Button>
      </div>

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
