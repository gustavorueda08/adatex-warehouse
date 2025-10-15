"use client";

import EntityListPage from "@/components/entities/EntityListPage";
import { useCustomers } from "@/lib/hooks/useCustomers";
import moment from "moment-timezone";

export default function CustomersPage() {
  const columns = [
    {
      key: "name",
      label: "Nombre",
    },
    {
      key: "email",
      label: "Email",
      render: (email) => email || "-",
    },
    {
      key: "phone",
      label: "Teléfono",
      render: (phone) => phone || "-",
    },
    {
      key: "nit",
      label: "NIT",
      render: (nit) => nit || "-",
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

  return (
    <EntityListPage
      useHook={useCustomers}
      title="Clientes"
      entityName="cliente"
      entityNamePlural="clientes"
      columns={columns}
      getDetailPath={(customer) => `/customers/${customer.id}`}
      createPath="/new-customer"
      bulkActions={["delete"]}
      canDeleteEntity={() => true}
      searchPlaceholder="Buscar cliente (nombre, email, teléfono, NIT)..."
    />
  );
}
