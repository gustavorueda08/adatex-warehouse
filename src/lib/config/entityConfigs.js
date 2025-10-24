// lib/config/entityConfigs.js

/**
 * ============================================================================
 * CONFIGURACIÓN PARA CREAR CLIENTES
 * ============================================================================
 */
export function createCustomerFormConfig({ onSubmit, loading }) {
  return {
    title: "Crear Nuevo Cliente",
    description: "Completa los campos para crear el cliente",
    entityType: "customer",
    loading,
    onSubmit,

    fields: [
      {
        name: "name",
        label: "Nombre",
        type: "text",
        required: true,
        placeholder: "Nombre del cliente",
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
        label: "Identificación",
        type: "text",
        required: false,
        placeholder: "Cédula o NIT del cliente",
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

    validateForm: (formData) => {
      // Validación básica: solo requerimos el nombre
      return !!formData.name && formData.name.trim() !== "";
    },

    prepareSubmitData: (formData) => {
      return formData;
    },
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
