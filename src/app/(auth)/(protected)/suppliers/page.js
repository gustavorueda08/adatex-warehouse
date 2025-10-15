"use client";

import EntityListPage from "@/components/entities/EntityListPage";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import moment from "moment-timezone";

export default function SuppliersPage() {
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
      useHook={useSuppliers}
      title="Proveedores"
      entityName="proveedor"
      entityNamePlural="proveedores"
      columns={columns}
      getDetailPath={(supplier) => `/suppliers/${supplier.id}`}
      createPath="/new-supplier"
      bulkActions={["delete"]}
      canDeleteEntity={() => true}
      searchPlaceholder="Buscar proveedor (nombre, email, teléfono, NIT)..."
    />
  );
}
