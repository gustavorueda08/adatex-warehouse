"use client";

import EntityListPage from "@/components/entities/EntityListPage";
import { useSellers } from "@/lib/hooks/useSellers";
import moment from "moment-timezone";

export default function SellersPage() {
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
      useHook={useSellers}
      title="Vendedores"
      entityName="vendedor"
      entityNamePlural="vendedores"
      columns={columns}
      getDetailPath={(seller) => `/sellers/${seller.id}`}
      createPath="/new-seller"
      bulkActions={["delete"]}
      canDeleteEntity={() => true}
      searchPlaceholder="Buscar vendedor (nombre, email, teléfono, NIT)..."
    />
  );
}
