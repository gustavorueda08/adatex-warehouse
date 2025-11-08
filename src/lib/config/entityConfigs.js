import moment from "moment-timezone";
import toast from "react-hot-toast";
import {
  UserIcon,
  ReceiptPercentIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { PricesSection } from "@/components/entities/PricesSection";

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
  updating = false,
  territories = [],
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
      identification: formData.identification || null,
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
          />
        ),
      },
    ],
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
};

/**
 * ============================================================================
 * CONFIGURACIÓN PARA CREAR CLIENTES
 * ============================================================================
 */
export function createCustomerFormConfig({
  onSubmit,
  loading,
  territories = [],
  sellers = [],
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

/**
 * ============================================================================
 * CONFIGURACIÓN PARA DETALLE DE PROVEEDOR
 * ============================================================================
 */
export function createSupplierDetailConfig({
  supplierId,
  updateSupplier,
  updating = false,
}) {
  const fieldSections = [
    {
      title: "Información Básica",
      description: "Datos generales del proveedor",
      icon: UserIcon,
      fields: [
        {
          name: "name",
          label: "Nombre",
          type: "text",
          required: true,
          placeholder: "Nombre del proveedor",
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
          name: "identification",
          label: "NIT",
          type: "text",
          required: false,
          placeholder: "NIT del proveedor",
        },
        {
          name: "address",
          label: "Dirección",
          type: "textarea",
          required: false,
          placeholder: "Dirección completa del proveedor",
          rows: 3,
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
      identification: formData.identification || null,
      address: formData.address || null,
      // Preparar precios: solo enviar los válidos con el formato correcto
      prices: (formData.prices || [])
        .filter(
          (price) =>
            price.product && price.unitPrice && Number(price.unitPrice) > 0
        )
        .map((price) => ({
          product: price.product.id,
          unitPrice: Number(price.unitPrice),
          ivaIncluded: price.ivaIncluded,
        })),
    };

    const result = await updateSupplier(supplierId, dataToSubmit);

    if (result.success) {
      toast.success("Proveedor actualizado exitosamente");
    } else {
      console.error("Error updating supplier:", result.error);
      throw result.error;
    }
  };

  return {
    title: "Editar Proveedor",
    description: "Actualiza la información del proveedor",
    entityType: "supplier",
    fields: fieldSections,
    customSections: [
      {
        render: ({ formData, updateField }) => (
          <PricesSection
            prices={formData.prices || []}
            onChange={(prices) => updateField("prices", prices)}
            entityType="supplier"
          />
        ),
      },
    ],
    onSubmit: handleSubmit,
    backPath: "/suppliers",
    loading: updating,
  };
}

/**
 * ============================================================================
 * CONFIGURACIÓN PARA CREAR PROVEEDORES
 * ============================================================================
 */
export function createSupplierFormConfig({ onSubmit, loading }) {
  return {
    title: "Crear Nuevo Proveedor",
    description: "Completa los campos para crear el proveedor",
    entityType: "supplier",
    loading,
    onSubmit,

    fields: [
      {
        name: "name",
        label: "Nombre",
        type: "text",
        required: true,
        placeholder: "Nombre del proveedor",
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
        name: "identification",
        label: "NIT",
        type: "text",
        required: false,
        placeholder: "NIT del proveedor",
      },
      {
        name: "address",
        label: "Dirección",
        type: "textarea",
        required: false,
        placeholder: "Dirección completa del proveedor",
        rows: 3,
        fullWidth: true,
      },
    ],

    validateForm: (formData) => {
      return !!formData.name && formData.name.trim() !== "";
    },

    prepareSubmitData: (formData) => {
      return formData;
    },
  };
}

/**
 * ============================================================================
 * CONFIGURACIÓN PARA CREAR VENDEDORES
 * ============================================================================
 */
export function createSellerFormConfig({ onSubmit, loading }) {
  return {
    title: "Crear Nuevo Vendedor",
    description: "Completa los campos para crear el vendedor",
    entityType: "seller",
    loading,
    onSubmit,

    fields: [
      {
        name: "name",
        label: "Nombre",
        type: "text",
        required: true,
        placeholder: "Nombre del vendedor",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
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
        name: "identification",
        label: "Identificación",
        type: "text",
        required: false,
        placeholder: "Cédula del vendedor",
      },
    ],

    validateForm: (formData) => {
      const hasName = !!formData.name && formData.name.trim() !== "";
      const hasEmail = !!formData.email && formData.email.trim() !== "";
      return hasName && hasEmail;
    },

    prepareSubmitData: (formData) => {
      return formData;
    },
  };
}

/**
 * ============================================================================
 * CONFIGURACIÓN PARA CREAR TRANSPORTADORES
 * ============================================================================
 */
export function createCarrierFormConfig({ onSubmit, loading }) {
  return {
    title: "Crear Nuevo Transportador",
    description: "Completa los campos para crear el transportador",
    entityType: "carrier",
    loading,
    onSubmit,

    fields: [
      {
        name: "name",
        label: "Nombre",
        type: "text",
        required: true,
        placeholder: "Nombre del transportador",
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
        required: true,
        placeholder: "+57 300 123 4567",
      },
      {
        name: "identification",
        label: "NIT",
        type: "text",
        required: false,
        placeholder: "NIT del transportador",
      },
      {
        name: "vehicleType",
        label: "Tipo de Vehículo",
        type: "text",
        required: false,
        placeholder: "Ej: Camión, Moto, Carro",
      },
      {
        name: "address",
        label: "Dirección",
        type: "textarea",
        required: false,
        placeholder: "Dirección completa del transportador",
        rows: 3,
        fullWidth: true,
      },
    ],

    validateForm: (formData) => {
      const hasName = !!formData.name && formData.name.trim() !== "";
      const hasPhone = !!formData.phone && formData.phone.trim() !== "";
      return hasName && hasPhone;
    },

    prepareSubmitData: (formData) => {
      return formData;
    },
  };
}

/**
 * ============================================================================
 * CONFIGURACIÓN PARA CREAR PRODUCTOS
 * ============================================================================
 */
export function createProductFormConfig({ onSubmit, loading }) {
  return {
    title: "Crear Nuevo Producto",
    description: "Completa los campos para crear el producto",
    entityType: "product",
    loading,
    onSubmit,

    fields: [
      {
        name: "name",
        label: "Nombre del Producto",
        type: "text",
        required: true,
        placeholder: "Nombre del producto",
      },
      {
        name: "code",
        label: "Código",
        type: "text",
        required: true,
        placeholder: "Código del producto",
      },
      {
        name: "barcode",
        label: "Código de Barras",
        type: "text",
        required: false,
        placeholder: "Código de barras (opcional)",
      },
      {
        name: "unit",
        label: "Unidad de Medida",
        type: "select",
        required: true,
        placeholder: "Seleccionar unidad...",
        options: [
          { label: "Kilogramos (kg)", value: "kg" },
          { label: "Metros (m)", value: "m" },
          { label: "Unidades", value: "unidades" },
          { label: "Litros (L)", value: "L" },
          { label: "Gramos (g)", value: "g" },
          { label: "Centímetros (cm)", value: "cm" },
          { label: "Cajas", value: "cajas" },
          { label: "Paquetes", value: "paquetes" },
        ],
      },
      {
        name: "unitsPerPackage",
        label: "Unidades por Paquete",
        type: "text",
        required: false,
        placeholder: "Ej: 12, 24, 50 (opcional)",
        validate: (value) => {
          if (!value) return true;
          const num = Number(value);
          if (isNaN(num) || num <= 0) {
            return "Debe ser un número mayor a 0";
          }
          return true;
        },
      },
      {
        name: "description",
        label: "Descripción",
        type: "textarea",
        required: false,
        placeholder: "Descripción del producto (opcional)",
        rows: 3,
        fullWidth: true,
      },
      {
        name: "isActive",
        label: "Estado Activo",
        type: "checkbox",
        required: false,
        defaultValue: true,
        description: "El producto estará activo al crearlo",
      },
    ],

    validateForm: (formData) => {
      const hasName = !!formData.name && formData.name.trim() !== "";
      const hasCode = !!formData.code && formData.code.trim() !== "";
      const hasUnit = !!formData.unit;

      // Validar unitsPerPackage si está presente
      if (formData.unitsPerPackage) {
        const num = Number(formData.unitsPerPackage);
        if (isNaN(num) || num <= 0) {
          return false;
        }
      }

      return hasName && hasCode && hasUnit;
    },

    prepareSubmitData: (formData) => {
      return {
        name: formData.name,
        code: formData.code,
        barcode: formData.barcode || null,
        unit: formData.unit,
        unitsPerPackage: formData.unitsPerPackage
          ? Number(formData.unitsPerPackage)
          : null,
        description: formData.description || null,
        isActive: formData.isActive !== undefined ? formData.isActive : true,
      };
    },
  };
}
