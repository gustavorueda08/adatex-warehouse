"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import Badge from "@/components/ui/Bagde";
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import toast from "react-hot-toast";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  BuildingOfficeIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

/**
 * Componente genérico para formularios de entidades (customers, suppliers, sellers)
 *
 * MODO DE USO:
 * 1. Modo antiguo (legacy): Pasar props individuales (title, fields, onSubmit, etc.)
 * 2. Modo nuevo (config): Pasar solo una prop 'config' con toda la configuración
 *
 * @param {Object} props
 * @param {Object} props.config - Configuración completa del formulario (modo nuevo)
 * @param {string} props.config.title - Título del formulario
 * @param {string} props.config.description - Descripción del formulario
 * @param {string} props.config.entityType - Tipo de entidad: 'customer', 'supplier', 'seller', etc.
 * @param {Array} props.config.fields - Array de configuraciones de campos
 * @param {Function} props.config.onSubmit - Función async que recibe los datos del formulario
 * @param {Function} props.config.validateForm - Función de validación personalizada
 * @param {Function} props.config.prepareSubmitData - Función para preparar datos antes de enviar
 * @param {boolean} props.config.loading - Estado de carga
 * @param {string} props.backPath - Ruta a la que volver al cancelar
 * @param {Object} props.initialData - Datos iniciales (null para crear, objeto para editar)
 *
 * Props legacy (modo antiguo, deprecated):
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} props.entityType
 * @param {Array} props.fields
 * @param {Function} props.onSubmit
 * @param {boolean} props.loading
 * @param {boolean} props.sectioned
 */
export default function EntityForm({
  // Modo nuevo (config)
  config,

  // Props compartidos
  backPath,
  initialData = null,

  // Props legacy (deprecated)
  title: legacyTitle,
  description: legacyDescription,
  entityType: legacyEntityType = "customer",
  fields: legacyFields = [],
  onSubmit: legacyOnSubmit,
  loading: legacyLoading = false,
  sectioned: legacySectioned = false,
}) {
  // Determinar si estamos usando el modo config o el modo legacy
  const isConfigMode = !!config;

  // Extraer valores del config o usar props legacy
  const title = isConfigMode ? config.title : legacyTitle;
  const description = isConfigMode ? config.description : legacyDescription;
  const entityType = isConfigMode ? config.entityType : legacyEntityType;
  const fields = isConfigMode ? config.fields : legacyFields;
  const onSubmit = isConfigMode ? config.onSubmit : legacyOnSubmit;
  const loading = isConfigMode ? config.loading : legacyLoading;
  const sectioned = isConfigMode ? false : legacySectioned; // config mode no soporta sectioned por ahora
  const validateFormFn = isConfigMode ? config.validateForm : null;
  const prepareSubmitDataFn = isConfigMode ? config.prepareSubmitData : null;
  const router = useRouter();
  const isEditMode = !!initialData;

  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Inicializar formData con initialData o valores por defecto
  useEffect(() => {
    const defaultData = {};
    const allFields = sectioned
      ? fields.flatMap((section) => section.fields)
      : fields;

    allFields.forEach((field) => {
      if (initialData && initialData[field.name] !== undefined) {
        // Para multi-select, asegurar que sea un array de IDs
        if (field.type === "multi-select") {
          const value = initialData[field.name];
          if (Array.isArray(value)) {
            // Si es array de objetos con id, extraer solo los IDs
            defaultData[field.name] = value.map((item) =>
              typeof item === "object" ? item.id : item
            );
          } else {
            defaultData[field.name] = [];
          }
        } else {
          defaultData[field.name] = initialData[field.name];
        }
      } else {
        // Valor por defecto según tipo
        if (field.type === "multi-select") {
          defaultData[field.name] = field.defaultValue || [];
        } else {
          defaultData[field.name] = field.defaultValue || "";
        }
      }
    });
    setFormData(defaultData);
  }, [initialData, fields, sectioned]);

  // Actualizar campo del formulario
  const updateField = useCallback((fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));

    // Limpiar error del campo
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateField(name, value);
  };

  const validate = () => {
    // Si hay función de validación personalizada del config, usarla
    if (validateFormFn) {
      const isValid = validateFormFn(formData);
      if (!isValid) {
        // Si la validación falla pero no hay errores específicos, mostrar error genérico
        if (Object.keys(errors).length === 0) {
          toast.error("Por favor completa todos los campos requeridos");
        }
        return false;
      }
    }

    const newErrors = {};
    const allFields = sectioned
      ? fields.flatMap((section) => section.fields)
      : fields;

    allFields.forEach((field) => {
      const value = formData[field.name];

      // Validación de campo requerido
      if (field.required) {
        if (field.type === "multi-select") {
          if (!Array.isArray(value) || value.length === 0) {
            newErrors[field.name] = `${field.label} es requerido`;
          }
        } else if (!value || (typeof value === "string" && !value.trim())) {
          newErrors[field.name] = `${field.label} es requerido`;
        }
      }

      // Validación de email
      if (field.type === "email" && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          newErrors[field.name] = "Email inválido";
        }
      }

      // Validación personalizada
      if (field.validate && value) {
        const validationError = field.validate(value, formData);
        if (validationError) {
          newErrors[field.name] = validationError;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Por favor corrige los errores en el formulario");
      return;
    }

    setSubmitting(true);

    try {
      // Si hay función para preparar datos, usarla; de lo contrario, usar formData directamente
      const dataToSubmit = prepareSubmitDataFn
        ? prepareSubmitDataFn(formData)
        : formData;

      await onSubmit(dataToSubmit);
    } catch (error) {
      console.error("Error en submit:", error);
      toast.error(error.message || "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(backPath);
  };

  // Calcular estado de validación
  const validationState = useMemo(() => {
    const allFields = sectioned
      ? fields.flatMap((section) => section.fields)
      : fields;
    const requiredFields = allFields.filter((f) => f.required);
    const completedRequired = requiredFields.filter((f) => {
      const value = formData[f.name];
      if (f.type === "multi-select") {
        return Array.isArray(value) && value.length > 0;
      }
      return value && (typeof value !== "string" || value.trim());
    });

    return {
      total: requiredFields.length,
      completed: completedRequired.length,
      isComplete: requiredFields.length === completedRequired.length,
    };
  }, [formData, fields, sectioned]);

  // Obtener badge y color según tipo de entidad
  const entityConfig = getEntityConfig(entityType);

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <Card loading />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Botón volver */}
      <button
        onClick={handleCancel}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        Volver
      </button>

      {/* Header Card con título y badge */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">{title}</h1>
              {description && (
                <p className="text-gray-400 text-sm mt-1">{description}</p>
              )}
            </div>
            <Badge variant={entityConfig.color}>{entityConfig.label}</Badge>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Renderizar campos */}
        {sectioned ? (
          // Renderizar secciones
          fields.map((section, sectionIndex) => (
            <Card key={sectionIndex}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  {section.icon && (
                    <section.icon className="w-6 h-6 text-emerald-400" />
                  )}
                  <div>
                    <CardTitle>{section.title}</CardTitle>
                    {section.description && (
                      <CardDescription>{section.description}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.fields.map((field) => (
                    <div
                      key={field.name}
                      className={field.fullWidth ? "md:col-span-2" : ""}
                    >
                      {renderField(field, formData, updateField, errors)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          // Renderizar campos simples en una sola Card
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <entityConfig.icon className="w-6 h-6 text-emerald-400" />
                <div>
                  <CardTitle>Información de la entidad</CardTitle>
                  <CardDescription>
                    Completa la información del {entityConfig.label.toLowerCase()}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map((field) => (
                  <div
                    key={field.name}
                    className={field.fullWidth ? "md:col-span-2" : ""}
                  >
                    {renderField(field, formData, updateField, errors)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card de validación y submit */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="w-6 h-6 text-emerald-400" />
              <div>
                <CardTitle>
                  {isEditMode ? "Actualizar" : "Crear"} {entityConfig.label}
                </CardTitle>
                <CardDescription>
                  Revisa que todo esté correcto antes de{" "}
                  {isEditMode ? "actualizar" : "crear"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Validación visual */}
            <div className="space-y-3 mb-6">
              <ValidationItem
                label={`Campos requeridos completados (${validationState.completed}/${validationState.total})`}
                valid={validationState.isComplete}
              />
              <ValidationItem
                label="Sin errores de validación"
                valid={Object.keys(errors).length === 0}
              />
            </div>

            {/* Resumen si es válido */}
            {validationState.isComplete && Object.keys(errors).length === 0 && (
              <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
                <p className="text-sm text-emerald-300">
                  ✓ Todo listo para {isEditMode ? "actualizar" : "crear"} el{" "}
                  {entityConfig.label.toLowerCase()}
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col md:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={submitting}
              className="flex-1 md:flex-initial"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              variant="emerald"
              loading={submitting}
              disabled={submitting || !validationState.isComplete}
            >
              {submitting
                ? isEditMode
                  ? "Actualizando..."
                  : "Creando..."
                : isEditMode
                ? "Actualizar"
                : "Crear"}{" "}
              {entityConfig.label}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

// Helper para renderizar campos según tipo
function renderField(field, formData, updateField, errors) {
  const value = formData[field.name];

  switch (field.type) {
    case "select":
      const options =
        typeof field.options === "function"
          ? field.options(formData)
          : field.options || [];

      return (
        <div key={field.name}>
          <label className="text-sm font-medium text-gray-300 mb-2 block">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <Select
            value={value}
            options={options}
            searchable={field.searchable}
            clearable={field.clearable}
            onChange={(v) => {
              updateField(field.name, v);
              if (field.onChange) {
                field.onChange(v, formData, updateField);
              }
            }}
            placeholder={field.placeholder}
            disabled={field.disabled}
            emptyMessage={field.emptyMessage || "No hay opciones disponibles"}
          />
          {errors[field.name] && (
            <p className="text-sm text-red-500 mt-1">{errors[field.name]}</p>
          )}
        </div>
      );

    case "multi-select":
      const multiOptions =
        typeof field.options === "function"
          ? field.options(formData)
          : field.options || [];

      return (
        <div key={field.name}>
          <label className="text-sm font-medium text-gray-300 mb-2 block">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <Select
            value={Array.isArray(value) ? value : []}
            options={multiOptions}
            multiple={true}
            searchable={field.searchable}
            clearable={field.clearable}
            onChange={(v) => {
              updateField(field.name, v);
              if (field.onChange) {
                field.onChange(v, formData, updateField);
              }
            }}
            placeholder={field.placeholder || "Seleccionar..."}
            disabled={field.disabled}
            emptyMessage={field.emptyMessage || "No hay opciones disponibles"}
            hasMenu={field.hasMenu}
            menuTitle={field.menuTitle}
            onClickMenu={field.onClickMenu}
            menuVariant={field.menuVariant}
          />
          {errors[field.name] && (
            <p className="text-sm text-red-500 mt-1">{errors[field.name]}</p>
          )}
        </div>
      );

    case "date":
      return (
        <div key={field.name}>
          <label className="text-sm font-medium text-gray-300 mb-2 block">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <DatePicker
            mode="single"
            value={value}
            onChange={(date) => updateField(field.name, date)}
            disabled={field.disabled}
          />
          {errors[field.name] && (
            <p className="text-sm text-red-500 mt-1">{errors[field.name]}</p>
          )}
        </div>
      );

    case "custom":
      return (
        <div key={field.name}>
          {field.label && (
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          {field.render({ value, formData, updateField })}
          {errors[field.name] && (
            <p className="text-sm text-red-500 mt-1">{errors[field.name]}</p>
          )}
        </div>
      );

    default:
      // text, email, textarea, etc.
      return (
        <FormField
          key={field.name}
          label={field.label}
          name={field.name}
          type={field.type || "text"}
          value={value || ""}
          onChange={(e) => updateField(field.name, e.target.value)}
          placeholder={field.placeholder || ""}
          required={field.required || false}
          disabled={field.disabled}
          error={errors[field.name]}
          rows={field.rows}
        />
      );
  }
}

// Componente para item de validación
function ValidationItem({ label, valid }) {
  return (
    <div className="flex items-center gap-3">
      {valid ? (
        <CheckCircleIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
      ) : (
        <XCircleIcon className="w-5 h-5 text-gray-600 flex-shrink-0" />
      )}
      <span className={`text-sm ${valid ? "text-white" : "text-gray-500"}`}>
        {label}
      </span>
    </div>
  );
}

// Helper para obtener configuración según tipo de entidad
function getEntityConfig(entityType) {
  const configs = {
    customer: {
      label: "Cliente",
      color: "cyan",
      icon: UserIcon,
    },
    supplier: {
      label: "Proveedor",
      color: "purple",
      icon: BuildingOfficeIcon,
    },
    seller: {
      label: "Vendedor",
      color: "emerald",
      icon: UserIcon,
    },
    carrier: {
      label: "Transportador",
      color: "blue",
      icon: TruckIcon,
    },
  };
  return configs[entityType] || configs.customer;
}
