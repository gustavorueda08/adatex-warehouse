import * as XLSX from "xlsx";
import moment from "moment-timezone";

export const exportCustomersToExcel = (customers) => {
  if (!customers || customers.length === 0) return;

  const labels = {
    active: "Activo",
    at_risk: "En Riesgo",
    churned: "Inactivo",
    prospect: "Prospecto",
  };

  const data = customers.map((customer) => {
    // Format Top Products as a single string
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
      "Volumen (30 días)": customer.monthlyVolume || 0,
      "Promedio (3 meses)": customer.threeMonthAverage || 0,
      "Última Compra": customer.lastPurchaseDate ? moment(customer.lastPurchaseDate).format("DD/MM/YYYY") : "N/A",
      "Motivo de Inactividad": customer.inactivityReason || "",
      "Notas de Prospecto": customer.prospectNotes || "",
      "Productos Principales": topProductsStr
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

  const today = moment().format("YYYY-MM-DD");
  XLSX.writeFile(workbook, `Adatex-Clientes-${today}.xlsx`);
};
