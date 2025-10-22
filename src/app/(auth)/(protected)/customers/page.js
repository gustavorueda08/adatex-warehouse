"use client";

import EntityListPage from "@/components/entities/EntityListPage";
import { useCustomers } from "@/lib/hooks/useCustomers";
import moment from "moment-timezone";
import toast from "react-hot-toast";

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
      description="Gestiona y visualiza todos los clientes"
      entityName="cliente"
      entityNamePlural="clientes"
      columns={columns}
      getDetailPath={(customer) => `/customers/${customer.id}`}
      createPath="/new-customer"
      bulkActions={["delete"]}
      customActions={[
        {
          label: "Sincronizar desde Siigo",
          variant: "emerald",
          onClick: async (_, helpers) => {
            const loadingToast = toast.loading(
              "Sincronizando clientes desde Siigo..."
            );
            try {
              const result = await helpers.syncAllCustomersFromSiigo();
              toast.dismiss(loadingToast);
              if (result.success) {
                toast.success("Clientes sincronizados exitosamente");
                helpers.setSelectedEntities([]);
              } else {
                toast.error(
                  result.error?.message || "Error al sincronizar clientes",
                  { duration: 5000 }
                );
              }
            } catch (error) {
              toast.dismiss(loadingToast);
              toast.error("Error al sincronizar clientes");
              console.error("Error:", error);
            }
          },
          disabled: (_, helpers) => helpers.syncing,
          loading: false, // El loading se maneja con el toast
        },
      ]}
      canDeleteEntity={() => true}
      searchPlaceholder="Buscar cliente (nombre, email, teléfono, NIT)..."
    />
  );
}
