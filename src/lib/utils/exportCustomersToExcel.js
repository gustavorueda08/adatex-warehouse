import * as XLSX from "xlsx";
import moment from "moment-timezone";
import { buildStrapiQuery } from "@/lib/api/strapiQueryBuilder";

export const exportCustomersToExcel = async ({
  localCustomers = [],
  filters = {},
  exportType = "current_page",
  toast,
} = {}) => {
  let loadingToast;
  try {
    if (toast?.loading) {
      loadingToast = toast.loading(
        exportType === "all_results"
          ? "Descargando todos los clientes..."
          : "Generando reporte Excel..."
      );
    }

    let customersToExport = [];

    if (exportType === "current_page") {
      customersToExport = localCustomers;
    } else {
      let page = 1;
      let pageCount = 1;
      const pageSize = 100;

      do {
        const queryOptions = {
          pagination: { page, pageSize },
          filters,
          populate: ["territory"],
        };
        const queryStr = buildStrapiQuery(queryOptions);

        const res = await fetch(`/api/strapi/customers?${queryStr}`);
        if (!res.ok) throw new Error(`Error fetching customers (page ${page})`);

        const data = await res.json();
        const extracted = data.data || [];
        const meta = data.meta;

        customersToExport.push(...extracted);
        pageCount = meta?.pagination?.pageCount || 1;
        page++;
      } while (page <= pageCount);
    }

    if (!customersToExport || customersToExport.length === 0) {
      if (loadingToast) toast.dismiss(loadingToast);
      toast?.error?.("No se encontraron clientes para exportar");
      return;
    }

    const labels = {
      active: "Activo",
      at_risk: "En Riesgo",
      churned: "Inactivo",
      prospect: "Prospecto",
    };

    const data = customersToExport.map((customer) => {
      let topProductsStr = "";
      if (customer.topProducts && Array.isArray(customer.topProducts)) {
        topProductsStr = customer.topProducts
          .map((p) => `${p.name} (${p.quantity} ${p.unit})`)
          .join(", ");
      }

      return {
        "Identificación": customer.identification,
        "Nombre": customer.name,
        "Apellido": customer.lastName || "",
        "Ciudad": customer?.territory?.city || "-",
        "Estado": labels[customer.status || "active"] || "Activo",
        "Ventas Mes Actual": customer.currentMonthVolume || 0,
        "Proyección Fin de Mes": customer.projectedVolume || 0,
        "Volumen (30 días)": customer.monthlyVolume || 0,
        "Promedio (3 meses)": customer.threeMonthAverage || 0,
        "Última Compra": customer.lastPurchaseDate
          ? moment(customer.lastPurchaseDate).format("DD/MM/YYYY")
          : "N/A",
        "Motivo de Inactividad": customer.inactivityReason || "",
        "Notas de Prospecto": customer.prospectNotes || "",
        "Productos Principales": topProductsStr,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto-size columns slightly
    worksheet["!cols"] = Object.keys(data[0] || {}).map((header) => ({
      wch: Math.max(header.length + 2, 20),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

    const today = moment().format("YYYY-MM-DD");
    XLSX.writeFile(workbook, `Adatex-Clientes-${today}.xlsx`);

    if (loadingToast) toast.dismiss(loadingToast);
    toast?.success?.(
      `Clientes exportados con ${customersToExport.length} registros`
    );
  } catch (error) {
    if (loadingToast) toast?.dismiss?.(loadingToast);
    console.error("Export Customers Error:", error);
    toast?.error?.("Error al exportar clientes");
  }
};
