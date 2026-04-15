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
import {
  Button, Chip, Skeleton, Tabs, Tab,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure, Tooltip,
} from "@heroui/react";
import { exportCustomersToExcel } from "@/lib/utils/exportCustomersToExcel";
import { getPartyLabel } from "@/lib/utils/getPartyLabel";
import ExportCustomersModal from "@/components/customers/ExportCustomersModal";
import toast from "react-hot-toast";

const COP = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value || 0);

const STATUS_LABELS = {
  active: "Activo",
  at_risk: "En Riesgo",
  churned: "Inactivo",
  prospect: "Prospecto",
};
const STATUS_COLORS = {
  active: "success",
  at_risk: "warning",
  churned: "danger",
  prospect: "primary",
};

/** Pace-adjusted compliance: how the customer is tracking vs their 3M average at this point in the month. */
function pacePercent(currentMonthVolume, threeMonthAverage) {
  const day = moment().date();
  const daysInMonth = moment().daysInMonth();
  const expectedToDate = (threeMonthAverage / daysInMonth) * day;
  if (!expectedToDate) return null;
  return Math.round((currentMonthVolume / expectedToDate) * 100);
}

function PaceChip({ customer }) {
  const pct = pacePercent(
    customer.currentMonthVolume || 0,
    customer.threeMonthAverage || 0,
  );
  if (pct === null) return <span className="text-default-400 text-xs">—</span>;
  const color = pct >= 90 ? "success" : pct >= 60 ? "warning" : "danger";
  return (
    <Chip size="sm" color={color} variant="flat">
      {pct}%
    </Chip>
  );
}

function DaysSinceCell({ lastPurchaseDate }) {
  if (!lastPurchaseDate)
    return <span className="text-default-400 text-xs">Nunca</span>;
  const days = moment().diff(moment(lastPurchaseDate), "days");
  const color =
    days <= 30 ? "text-success-600" : days <= 60 ? "text-warning-600" : "text-danger-600";
  return (
    <span className={`text-xs font-medium ${color}`}>
      {days}d
      <span className="text-default-400 font-normal ml-1">
        ({moment(lastPurchaseDate).format("DD/MM")})
      </span>
    </span>
  );
}

const STATUS_TABS = [
  { key: "all", label: "Todos" },
  { key: "active", label: "Activos" },
  { key: "at_risk", label: "En Riesgo" },
  { key: "churned", label: "Inactivos" },
  { key: "prospect", label: "Prospectos" },
];

// ── Modal de Cuentas por Cobrar ──────────────────────────────────────────────

function ArBalanceCard({ label, value, color = "default" }) {
  const cls = {
    default: "bg-default-50 border-default-200",
    primary: "bg-primary-50 border-primary-200",
    success: "bg-success-50 border-success-200",
    danger: "bg-danger-50 border-danger-200",
  }[color] ?? "bg-default-50 border-default-200";
  return (
    <div className={`flex flex-col gap-1 p-3 rounded-xl border ${cls}`}>
      <span className="text-xs font-medium text-default-500 uppercase tracking-wider">{label}</span>
      <span className="text-base font-bold text-default-900">{COP(value)}</span>
    </div>
  );
}

function CustomerArModal({ isOpen, onClose, customer, data, loading, error, onDownload }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (format) => {
    if (!customer) return;
    setDownloading(true);
    try {
      await onDownload(customer.id, { format });
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  function daysOverdue(due_date) {
    if (!due_date) return null;
    return Math.floor((Date.now() - new Date(due_date).getTime()) / 86400000);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader className="flex flex-col gap-0.5">
              <span>Cuentas por Cobrar</span>
              {customer && (
                <span className="text-sm font-normal text-default-500">
                  {customer.name}
                  {customer.identification && ` · NIT ${customer.identification}`}
                </span>
              )}
            </ModalHeader>

            <ModalBody>
              {loading && (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                  </div>
                  <Skeleton className="h-48 rounded-xl" />
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="text-4xl">⚠️</div>
                  <p className="text-sm font-semibold text-default-700">
                    No se pudo obtener la información de cartera
                  </p>
                  <p className="text-xs text-default-400 max-w-xs">
                    Es posible que este cliente no tenga movimientos registrados en Siigo o esté inactivo en el sistema contable.
                  </p>
                </div>
              )}

              {!loading && !error && data && (
                <div className="flex flex-col gap-4">
                  {/* Balance cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <ArBalanceCard label="Saldo Inicial" value={data.balance.saldo_inicial} color="default" />
                    <ArBalanceCard label="Débito (Facturas)" value={data.balance.debito} color="primary" />
                    <ArBalanceCard label="Crédito (Pagos)" value={data.balance.credito} color="success" />
                    <ArBalanceCard
                      label="Saldo Pendiente"
                      value={data.balance.saldo_final}
                      color={data.balance.saldo_final > 0 ? "danger" : "success"}
                    />
                  </div>

                  {/* Invoices */}
                  <div className="flex flex-col gap-2">
                    <h4 className="text-sm font-semibold text-default-700">
                      Facturas Pendientes ({data.invoices.length})
                    </h4>

                    {data.invoices.length === 0 ? (
                      <div className="text-center py-8 text-default-400 text-sm border rounded-xl border-dashed">
                        El cliente está al día — sin facturas pendientes.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-default-200">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-default-100 text-default-600 text-xs uppercase">
                              <th className="text-left px-4 py-2.5 font-medium">Factura</th>
                              <th className="text-left px-4 py-2.5 font-medium">Fecha</th>
                              <th className="text-left px-4 py-2.5 font-medium">Vence</th>
                              <th className="text-right px-4 py-2.5 font-medium">Total</th>
                              <th className="text-right px-4 py-2.5 font-medium">Pendiente</th>
                              <th className="text-center px-4 py-2.5 font-medium">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.invoices.map((inv, idx) => {
                              const overdue = daysOverdue(inv.due_date);
                              const isOverdue = overdue !== null && overdue > 0;
                              return (
                                <tr key={inv.id || idx} className="border-t border-default-100 hover:bg-default-50">
                                  <td className="px-4 py-2.5">
                                    {inv.public_url ? (
                                      <a href={inv.public_url} target="_blank" rel="noopener noreferrer"
                                        className="text-primary-600 hover:underline font-medium">
                                        {inv.name}
                                      </a>
                                    ) : (
                                      <span className="font-medium">{inv.name}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-default-600 text-xs">{inv.date}</td>
                                  <td className="px-4 py-2.5 text-xs">
                                    {inv.due_date ? (
                                      <Tooltip content={isOverdue ? `Vencida hace ${overdue} días` : `Vence en ${-overdue} días`}>
                                        <span className={isOverdue ? "text-danger-600 font-semibold cursor-help" : "text-default-600 cursor-help"}>
                                          {inv.due_date}
                                        </span>
                                      </Tooltip>
                                    ) : <span className="text-default-400">—</span>}
                                  </td>
                                  <td className="px-4 py-2.5 text-right text-default-700 text-xs">{COP(inv.total)}</td>
                                  <td className="px-4 py-2.5 text-right font-semibold text-danger-600 text-xs">{COP(inv.balance)}</td>
                                  <td className="px-4 py-2.5 text-center">
                                    <Chip size="sm" color={isOverdue ? "danger" : "warning"} variant="flat">
                                      {isOverdue ? `${overdue}d vencida` : "Pendiente"}
                                    </Chip>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-default-400">
                    Cuenta 1305 · Período {data.period?.year} meses {data.period?.month_start}–{data.period?.month_end}
                  </p>
                </div>
              )}
            </ModalBody>

            <ModalFooter>
              <Button variant="light" onPress={close}>Cerrar</Button>
              <Button
                color="primary"
                variant="flat"
                size="sm"
                isLoading={downloading}
                isDisabled={downloading || loading || !data}
                onPress={() => handleDownload("excel")}
              >
                Descargar Excel
              </Button>
              <Button
                color="danger"
                variant="flat"
                size="sm"
                isLoading={downloading}
                isDisabled={downloading || loading || !data}
                onPress={() => handleDownload("pdf")}
              >
                Descargar PDF
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

function CustomersPageInner() {
  const { user } = useUser();
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, pageSize: 15 });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportingCustomers, setExportingCustomers] = useState(false);
  const [downloadingCartera, setDownloadingCartera] = useState(false);
  // Modal de cartera por cliente
  const { isOpen: isArOpen, onOpen: onArOpen, onClose: onArClose } = useDisclosure();
  const [arModalCustomer, setArModalCustomer] = useState(null); // { id, name, identification }
  const [arData, setArData] = useState(null);
  const [arLoading, setArLoading] = useState(false);
  const [arError, setArError] = useState(null);
  const screenSize = useScreenSize();

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [search, selectedStatus]);

  const filters = useMemo(() => {
    const f = {};

    // Seller scoping — fixed: was incorrectly spreading array into object
    if (user?.type === "seller" && user?.seller?.id) {
      f.seller = user.seller.id;
    }

    // Status tab filter
    if (selectedStatus !== "all") {
      f.status = selectedStatus;
    }

    // Text search
    if (search) {
      const terms = search.split(" ").filter((t) => t.trim() !== "");
      if (terms.length > 0) {
        f.$and = terms.map((term) => ({
          $or: [
            { identification: { $containsi: term } },
            { name: { $containsi: term } },
            { lastName: { $containsi: term } },
            { companyName: { $containsi: term } },
            { territory: { city: { $containsi: term } } },
          ],
        }));
      }
    }

    return f;
  }, [search, selectedStatus, user?.type, user?.seller?.id]);

  const {
    loading,
    isFetching,
    customers,
    deleteCustomer,
    refetch,
    pagination: { pageCount },
    downloadAllAccountsReceivable,
    downloadCustomerAccountsReceivable,
  } = useCustomers({
    pagination,
    filters,
    populate: ["territory", "seller"],
  });

  const openArModal = useCallback(async (customer) => {
    setArModalCustomer(customer);
    setArData(null);
    setArError(null);
    onArOpen();
    setArLoading(true);
    try {
      const res = await fetch(`/api/strapi/customers/${customer.id}/accounts-receivable`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.details || `Error ${res.status}`);
      setArData(json.data);
    } catch (err) {
      setArError(err.message);
    } finally {
      setArLoading(false);
    }
  }, [onArOpen]);

  const handleDownloadCartera = async (format) => {
    setDownloadingCartera(true);
    const toastId = toast.loading(`Generando reporte de cartera en ${format === "pdf" ? "PDF" : "Excel"}...`);
    try {
      const params = { format };
      if (user?.type === "seller" && user?.seller?.id) {
        params.seller = user.seller.id;
      }
      await downloadAllAccountsReceivable(params);
      toast.success("Reporte descargado", { id: toastId });
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setDownloadingCartera(false);
    }
  };

  // ── Columns ─────────────────────────────────────────────────────────────────
  const columns = useMemo(() => {
    const isSmall = screenSize !== "lg";

    const base = [
      {
        key: "name",
        label: "Cliente",
        render: (c) => (
          <Link href={`/customers/${c.id}`}>
            <div className="flex flex-col">
              <span className="font-medium hover:underline text-sm">
                {getPartyLabel(c)}
              </span>
              <span className="text-xs text-default-400">
                {c.identification}
              </span>
            </div>
          </Link>
        ),
      },
      {
        key: "status",
        label: "Estado",
        render: (c) => {
          if (!c.status || !STATUS_LABELS[c.status]) {
            return <span className="text-default-400 text-xs">—</span>;
          }
          return (
            <Chip size="sm" color={STATUS_COLORS[c.status]} variant="flat">
              {STATUS_LABELS[c.status]}
            </Chip>
          );
        },
      },
      {
        key: "currentMonthVolume",
        label: "Ventas Mes",
        render: (c) => (
          <span className="font-semibold text-sm">
            {COP(c.currentMonthVolume)}
          </span>
        ),
      },
      {
        key: "pace",
        label: "Ritmo",
        render: (c) => <PaceChip customer={c} />,
      },
    ];

    if (!isSmall) {
      base.push(
        {
          key: "city",
          label: "Ciudad",
          render: (c) => (
            <span className="text-sm">{c.territory?.city || "—"}</span>
          ),
        },
        {
          key: "seller",
          label: "Vendedor",
          render: (c) => (
            <span className="text-xs text-default-600">
              {c.seller ? `${c.seller.name || ""} ${c.seller.lastName || ""}`.trim() : "—"}
            </span>
          ),
        },
        {
          key: "monthlyVolume",
          label: "Vol. 30d",
          render: (c) => (
            <span className="text-sm">{COP(c.monthlyVolume)}</span>
          ),
        },
        {
          key: "threeMonthAverage",
          label: "Prom. 3M",
          render: (c) => (
            <span className="text-sm text-default-600">
              {COP(c.threeMonthAverage)}
            </span>
          ),
        },
        {
          key: "projectedVolume",
          label: "Proyección",
          render: (c) => {
            const projected = c.projectedVolume || 0;
            const avg = c.threeMonthAverage || 0;
            const isAbove = avg > 0 ? projected >= avg : projected > 0;
            return (
              <span
                className={`text-sm font-semibold ${
                  projected === 0
                    ? "text-default-400"
                    : isAbove
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
          key: "lastPurchaseDate",
          label: "Últ. Compra",
          render: (c) => <DaysSinceCell lastPurchaseDate={c.lastPurchaseDate} />,
        },
        {
          key: "cartera",
          label: "Cartera",
          render: (c) => (
            <Button
              size="sm"
              variant="flat"
              color="danger"
              onPress={() => openArModal({ id: c.id, name: getPartyLabel(c), identification: c.identification })}
            >
              Ver
            </Button>
          ),
        },
      );
    }

    return base;
  }, [screenSize, openArModal]);

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (selectedKeys.size === 0 && selectedKeys !== "all") return;
    const ids =
      selectedKeys === "all"
        ? customers.map((c) => c.id)
        : Array.from(selectedKeys);
    const promise = Promise.all(ids.map((id) => deleteCustomer(id))).then(
      () => {
        setSelectedKeys(new Set());
        refetch();
      },
    );
    toast.promise(promise, {
      loading: "Eliminando clientes...",
      success: "Clientes eliminados",
      error: "Error al eliminar",
    });
  };

  const handleExport = async (exportType) => {
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
    } catch (e) {
      console.error(e);
    } finally {
      setExportingCustomers(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Title + actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <h1 className="font-bold text-xl lg:text-3xl">Clientes</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            color="danger"
            variant="flat"
            size="sm"
            isLoading={downloadingCartera}
            isDisabled={downloadingCartera}
            onPress={() => handleDownloadCartera("excel")}
          >
            Cartera Excel
          </Button>
          <Button
            color="danger"
            variant="bordered"
            size="sm"
            isLoading={downloadingCartera}
            isDisabled={downloadingCartera}
            onPress={() => handleDownloadCartera("pdf")}
          >
            Cartera PDF
          </Button>
          <Button
            color="success"
            variant="flat"
            size="sm"
            onPress={() => setIsExportModalOpen(true)}
            isDisabled={loading}
          >
            Exportar Clientes
          </Button>
        </div>
      </div>

      {/* Status tabs + search */}
      <div className="flex flex-col gap-3">
        <Tabs
          selectedKey={selectedStatus}
          onSelectionChange={(key) => setSelectedStatus(key)}
          size="sm"
          variant="underlined"
          color="primary"
          classNames={{ tabList: "gap-2" }}
        >
          {STATUS_TABS.map((tab) => (
            <Tab key={tab.key} title={tab.label} />
          ))}
        </Tabs>
        <EntityFilters
          pathname="/new-customer"
          search={search}
          setSearch={setSearch}
        />
      </div>

      <Entities
        screenSize={screenSize}
        loading={loading}
        isFetching={isFetching}
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
        onConfirm={handleExport}
        loading={exportingCustomers}
      />

      {/* ── Modal Cuentas por Cobrar ──────────────────────────────────── */}
      <CustomerArModal
        isOpen={isArOpen}
        onClose={onArClose}
        customer={arModalCustomer}
        data={arData}
        loading={arLoading}
        error={arError}
        onDownload={downloadCustomerAccountsReceivable}
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
