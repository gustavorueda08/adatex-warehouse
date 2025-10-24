// lib/config/customersConfig.js
import moment from "moment-timezone";
import toast from "react-hot-toast";
import {
  UserIcon,
  ReceiptPercentIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

/**
 * ============================================================================
 * CONFIGURACIÓN PARA DETALLE DE CLIENTE
 * ============================================================================
 */
export function createCustomerDetailConfig({
  customerId,
  availableTaxes = [],
  availableParties = [],
  updateCustomer,
  router,
  updating = false,
}) {
  const fieldSections = [
    {
      title: "Información Básica",
      description: "Datos generales del cliente",
      icon: UserIcon,
      fields: [
        {
          name: "name",
          label: "Nombre",
          type: "text",
          required: true,
          placeholder: "Nombre del cliente",
        },
        {
          name: "nit",
          label: "NIT",
          type: "text",
          required: false,
          placeholder: "123456789-0",
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          required: false,
          placeholder: "correo@ejemplo.com",
        },
        {
          name: "phone",
          label: "Teléfono",
          type: "text",
          required: false,
          placeholder: "+57 300 123 4567",
        },
        {
          name: "address",
          label: "Dirección",
          type: "textarea",
          required: false,
          placeholder: "Dirección completa del cliente",
          rows: 3,
          fullWidth: true,
        },
      ],
    },
    {
      title: "Impuestos",
      description: "Configuración de impuestos aplicables al cliente",
      icon: ReceiptPercentIcon,
      fields: [
        {
          name: "taxes",
          label: "Impuestos Asociados",
          type: "multi-select",
          required: false,
          searchable: true,
          clearable: true,
          options: availableTaxes,
          placeholder: "Seleccionar impuestos...",
          emptyMessage: "No hay impuestos disponibles",
          fullWidth: true,
        },
      ],
    },
    {
      title: "Partes Asociadas",
      description:
        "Entidades relacionadas que pueden recibir facturas para este cliente",
      icon: UserGroupIcon,
      fields: [
        {
          name: "parties",
          label: "Partes para Facturación",
          type: "multi-select",
          required: false,
          searchable: true,
          clearable: true,
          options: availableParties,
          placeholder: "Seleccionar partes...",
          emptyMessage: "No hay partes disponibles",
          fullWidth: true,
        },
      ],
    },
  ];

  const handleSubmit = async (formData) => {
    // Preparar datos para enviar al backend
    const dataToSubmit = {
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      nit: formData.nit || null,
      address: formData.address || null,
      // Enviar solo los IDs para las relaciones
      taxes: formData.taxes || [],
      parties: formData.parties || [],
    };

    const result = await updateCustomer(customerId, dataToSubmit);

    if (result.success) {
      toast.success("Cliente actualizado exitosamente");
      router.push("/customers");
    } else {
      console.error("Error updating customer:", result.error);
      throw result.error;
    }
  };

  return {
    title: "Editar Cliente",
    description:
      "Actualiza la información del cliente, sus impuestos y partes asociadas",
    entityType: "customer",
    fields: fieldSections,
    sectioned: true,
    onSubmit: handleSubmit,
    backPath: "/customers",
    loading: updating,
  };
}

/**
 * ============================================================================
 * CONFIGURACIÓN PARA LISTADO DE CLIENTES
 * ============================================================================
 */
export const customersListConfig = {
  entityType: "customer",
  title: "Clientes",
  description: "Gestiona y visualiza todos los clientes",
  entityName: "cliente",
  entityNamePlural: "clientes",
  searchPlaceholder: "Buscar cliente (nombre, email, teléfono, NIT)...",

  // Path para crear nuevos clientes
  createPath: "/new-customer",

  // Función para obtener el path de detalle de un cliente
  getDetailPath: (customer) => `/customers/${customer.id}`,

  // Columnas de la tabla
  columns: [
    {
      key: "identification",
      label: "Identificación",
      render: (identification) => identification || "-",
    },
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
      key: "address",
      label: "Dirección",
      render: (address) => address || "-",
    },
    {
      key: "updatedAt",
      label: "Última actualización",
      render: (date) =>
        moment(date).tz("America/Bogota").format("DD-MM-YYYY | h:mm a"),
    },
  ],

  // Acciones masivas disponibles
  bulkActions: ["delete"],

  // Función para determinar si un cliente puede ser eliminado
  canDeleteEntity: () => true,

  // Acciones personalizadas
  getCustomActions: ({ helpers }) => [
    {
      label: "Sincronizar desde Siigo",
      variant: "emerald",
      onClick: async (_, actionHelpers) => {
        const loadingToast = toast.loading(
          "Sincronizando clientes desde Siigo..."
        );
        try {
          const result = await actionHelpers.syncAllCustomersFromSiigo();
          toast.dismiss(loadingToast);
          if (result.success) {
            toast.success("Clientes sincronizados exitosamente");
            actionHelpers.setSelectedEntities([]);
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
      disabled: (_, actionHelpers) => actionHelpers.syncing,
      loading: false, // El loading se maneja con el toast
    },
  ],
};
