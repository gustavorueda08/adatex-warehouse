import { PricesSection } from "@/components/entities/PricesSection";
import { UserIcon } from "@heroicons/react/24/outline";

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
        label: "Nombres | Nombre de la Empresa",
        type: "text",
        required: true,
        placeholder: "Nombre | Razón Social",
      },
      {
        name: "lastname",
        label: "Apellidos",
        type: "text",
        placeholder: "Apellidos del proveedor | Dejar vacío si es empresa",
      },
      {
        name: "identificationType",
        label: "Tipo de Identificación",
        type: "select",
        required: true,
        placeholder: "ID, CC o NIT",
        options: [
          { value: "ID", label: "ID" },
          { value: "CC", label: "CC" },
          { value: "NIT", label: "NIT" },
        ],
      },
      {
        name: "identification",
        label: "Identificación",
        type: "text",
        required: true,
        placeholder: "Identificación del proveedor",
      },
      {
        name: "email",
        label: "Correo Electrónico",
        type: "email",
        required: false,
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
        name: "country",
        label: "País",
        type: "text",
        required: true,
        placeholder: "País del proveedor",
      },
      {
        name: "city",
        label: "Ciudad",
        type: "text",
        required: true,
        placeholder: "Ciudad del proveedor",
      },
      {
        name: "address",
        label: "Dirección",
        type: "textarea",
        required: true,
        placeholder: "Dirección completa del proveedor",
        rows: 3,
        fullWidth: true,
      },
    ],
    validateForm: (formData) => {
      const hasName = !!formData.name && formData.name.trim() !== "";
      const hasIdentificationType = !!formData.identificationType;
      const hasIdentification =
        !!formData.identification && formData.identification.trim() !== "";
      const hasCountry = !!formData.country && formData.country.trim() !== "";
      const hasCity = !!formData.city && formData.city.trim() !== "";
      const hasAddress = !!formData.address && formData.address.trim() !== "";
      return (
        hasName &&
        hasIdentificationType &&
        hasIdentification &&
        hasCountry &&
        hasCity &&
        hasAddress
      );
    },
    prepareSubmitData: (formData) => formData,
  };
}

export function createSupplierDetailConfig({
  supplierId,
  updateSupplier,
  updating = false,
}) {
  const fieldSections = [
    {
      title: "Información General",
      description: "Datos generales del proveedor",
      icon: UserIcon,
      fields: [
        {
          name: "name",
          label: "Nombres | Nombre de la Empresa",
          type: "text",
          required: true,
          placeholder: "Nombre | Razón Social",
        },
        {
          name: "lastname",
          label: "Apellidos",
          type: "text",
          placeholder: "Apellidos del proveedor | Dejar vacío si es empresa",
        },
        {
          name: "identificationType",
          label: "Tipo de Identificación",
          type: "select",
          required: true,
          placeholder: "ID, CC o NIT",
          options: [
            { value: "ID", label: "ID" },
            { value: "CC", label: "CC" },
            { value: "NIT", label: "NIT" },
          ],
        },
        {
          name: "identification",
          label: "Identificación",
          type: "text",
          required: true,
          placeholder: "Identificación del proveedor",
        },
        {
          name: "email",
          label: "Correo Electrónico",
          type: "email",
          required: false,
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
          name: "country",
          label: "País",
          type: "text",
          required: true,
          placeholder: "País del proveedor",
        },
        {
          name: "city",
          label: "Ciudad",
          type: "text",
          required: true,
          placeholder: "Ciudad del proveedor",
        },
        {
          name: "address",
          label: "Dirección",
          type: "textarea",
          required: true,
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
