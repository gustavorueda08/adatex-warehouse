import { PricesSection } from "@/components/entities/PricesSection";
import {
  ReceiptPercentIcon,
  UserGroupIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import moment from "moment-timezone";
import toast from "react-hot-toast";

export const customersListConfig = {
  entityType: "customer",
  title: "Clientes",
  description: "Gestiona y visualiza todos los clientes",
  entityName: "cliente",
  entityNamePlural: "clientes",
  searchPlaceholder: "Buscar cliente (nombre, email, teléfono, NIT)...",
  showDatePicker: false,

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
      render: (_, customer) => `${customer.name} ${customer.lastName || ""}`,
    },
    {
      key: "territory",
      label: "Ciudad",
      render: (_, customer) => customer?.territory?.city || "-",
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

  populate: ["territory"],

  // Acciones masivas disponibles
  bulkActions: ["delete"],
  getCustomActions: ({
    helpers: { syncAllCustomersFromSiigo, syncing, toast, user },
  }) => {
    if (user?.type !== "admin") return [];

    return [
      {
        label: "Sincronizar",
        disabled: () => syncing,
        loading: syncing,
        onClick: async () => {
          const loadingToast = toast.loading(
            "Sincronizando clientes desde Siigo..."
          );
          try {
            const result = await syncAllCustomersFromSiigo();
            if (result.success) {
              toast.success("Clientes sincronizados exitosamente", {
                id: loadingToast,
              });
            } else {
              toast.error(
                `Error al sincronizar: ${
                  result.error?.message || "Error desconocido"
                }`,
                { id: loadingToast }
              );
            }
          } catch (error) {
            console.error("Error en sincronización:", error);
            toast.error("Error inesperado al sincronizar", {
              id: loadingToast,
            });
          }
        },
      },
    ];
  },

  // Función para determinar si un cliente puede ser eliminado
  canDeleteEntity: () => true,
};

export function createCustomerFormConfig({
  onSubmit,
  loading,
  territories = [],
  sellers = [],
  sellerSelectProps = {},
}) {
  return {
    title: "Crear Nuevo Cliente",
    description: "Completa los campos para crear el cliente",
    entityType: "customer",
    loading,
    onSubmit,
    fields: [
      {
        name: "name",
        label: "Nombres | Nombre de la Empresa",
        type: "text",
        required: true,
        placeholder: "Nombre del cliente o de la empresa",
      },
      {
        name: "lastName",
        label: "Apellidos",
        type: "text",
        required: false,
        placeholder: "Apellido del cliente | Dejar vacío si es empresa",
      },
      {
        name: "identificationType",
        label: "Tipo de Identificación",
        type: "select",
        required: true,
        placeholder: "CC o NIT",
        options: [
          { label: "CC", value: "CC" },
          { label: "NIT", value: "NIT" },
        ],
      },
      {
        name: "identification",
        label: "Identificación",
        type: "text",
        required: true,
        placeholder: "Cédula o NIT del cliente",
      },
      {
        name: "email",
        label: "Correo Electrónico",
        type: "email",
        required: true,
        placeholder: "correo@ejemplo.com",
      },
      {
        name: "phone",
        label: "Teléfono",
        type: "text",
        required: false,
        placeholder: "3001234567 | Opcional",
      },
      {
        name: "territory",
        label: "Ciudad",
        type: "select",
        required: true,
        options: territories.map((t) => ({
          label: t.city,
          value: t.id,
        })),
        searchable: true,
        placeholder: "Seleccionar ciudad...",
      },
      {
        name: "seller",
        label: "Vendedor",
        type: "select",
        options: sellers.map((s) => ({ label: s.name, value: s.id })),
        required: true,
        searchable: true,
        placeholder: "Selecciona un vendedor",
        onSearch: sellerSelectProps.onSearch,
        onLoadMore: sellerSelectProps.onLoadMore,
        hasMore: sellerSelectProps.hasMore,
        loading: sellerSelectProps.loading,
        loadingMore: sellerSelectProps.loadingMore,
      },
      {
        name: "address",
        label: "Dirección",
        type: "textarea",
        required: true,
        placeholder: "Dirección completa del cliente",
        rows: 3,
        fullWidth: true,
      },
    ],

    validateForm: (formData) => {
      // Validar todos los campos requeridos
      const hasName = !!formData.name && formData.name.trim() !== "";
      const hasTerritory = !!formData.territory;
      const hasIdentificationType = !!formData.identificationType;
      const hasIdentification =
        !!formData.identification && formData.identification.trim() !== "";
      const hasEmail = !!formData.email && formData.email.trim() !== "";
      const hasSeller = !!formData.seller;
      const hasAddress = !!formData.address && formData.address.trim() !== "";
      return (
        hasName &&
        hasTerritory &&
        hasIdentificationType &&
        hasIdentification &&
        hasEmail &&
        hasSeller &&
        hasAddress
      );
    },

    prepareSubmitData: (formData) => {
      return {
        name: formData.name,
        lastName: formData.lastName || null,
        identificationType: formData.identificationType,
        identification: formData.identification,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        territory: formData.territory,
        seller: formData.seller,
      };
    },
  };
}

export function createCustomerDetailConfig({
  customerId,
  availableTaxes = [],
  availableParties = [],
  availableSellers = [],
  updateCustomer,
  updating = false,
  territories = [],
  productSelectProps = {},
  partySelectProps = {},
  sellerSelectProps = {},
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
          name: "lastName",
          label: "Apellido",
          type: "text",
          required: false,
          placeholder: "Apellido del cliente",
        },
        {
          name: "identificationType",
          label: "Tipo",
          type: "select",
          required: true,
          placeholder: "CC o NIT",
          options: [
            { label: "CC", value: "CC" },
            { label: "NIT", value: "NIT" },
          ],
        },
        {
          name: "identification",
          label: "Identificación",
          type: "text",
          required: true,
          placeholder: "Cédula o NIT del cliente",
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
          name: "territory",
          label: "Ciudad / Territorio",
          type: "select",
          required: true,
          options: territories.map((t) => ({
            label: t.city,
            value: t.id,
          })),
          searchable: true,
          placeholder: "Seleccionar ciudad...",
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
        {
          name: "seller",
          label: "Vendedor",
          type: "select",
          required: false,
          options: (availableSellers || []).map((s) => ({
            label: s.name,
            value: s.id,
          })),
          searchable: true,
          placeholder: "Seleccionar vendedor...",
          onSearch: sellerSelectProps.onSearch,
          onLoadMore: sellerSelectProps.onLoadMore,
          hasMore: sellerSelectProps.hasMore,
          loading: sellerSelectProps.loading,
          loadingMore: sellerSelectProps.loadingMore,
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
          onSearch: partySelectProps.onSearch,
          onLoadMore: partySelectProps.onLoadMore,
          hasMore: partySelectProps.hasMore,
          loading: partySelectProps.loading,
          loadingMore: partySelectProps.loadingMore,
        },
      ],
    },
  ];

  const handleSubmit = async (formData) => {
    // Preparar datos para enviar al backend
    const dataToSubmit = {
      name: formData.name,
      lastName: formData.lastName || null,
      email: formData.email || null,
      phone: formData.phone || null,
      identification: formData.identification || null,
      identificationType: formData.identificationType || null,
      address: formData.address || null,
      // Enviar solo los IDs para las relaciones
      taxes: formData.taxes || [],
      parties: formData.parties || [],
      territory: formData.territory,
      // Preparar precios: solo enviar los válidos con el formato correcto
      prices: (formData.prices || [])
        .filter(
          (price) =>
            price.product && price.unitPrice && Number(price.unitPrice) > 0
        )
        .map((price) => ({
          id: price.new ? null : price.id,
          product: price.product.id,
          unitPrice: Number(price.unitPrice),
          ivaIncluded: price.ivaIncluded,
          invoicePercentage: price.invoicePercentage,
        })),
      seller: formData.seller,
    };

    const result = await updateCustomer(customerId, dataToSubmit);

    if (result.success) {
      toast.success("Cliente actualizado exitosamente");
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
    customSections: [
      {
        render: ({ formData, updateField }) => (
          <PricesSection
            prices={formData.prices || []}
            onChange={(prices) => updateField("prices", prices)}
            entityType="customer"
            productSelectProps={productSelectProps}
          />
        ),
      },
    ],
    onSubmit: handleSubmit,
    backPath: "/customers",
    loading: updating,
  };
}
