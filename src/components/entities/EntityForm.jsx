"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import toast from "react-hot-toast";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";

/**
 * Componente genérico para formularios de entidades
 * @param {Object} props
 * @param {string} props.title - Título del formulario
 * @param {Object} props.initialData - Datos iniciales (null para crear, objeto para editar)
 * @param {Array} props.fields - Array de configuraciones de campos
 * @param {Function} props.onSubmit - Función async que recibe los datos del formulario
 * @param {string} props.backPath - Ruta a la que volver al cancelar
 * @param {boolean} props.loading - Estado de carga
 */
export default function EntityForm({
  title,
  initialData = null,
  fields = [],
  onSubmit,
  backPath,
  loading = false,
}) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Inicializar formData con initialData o valores por defecto
  useEffect(() => {
    const defaultData = {};
    fields.forEach((field) => {
      if (initialData && initialData[field.name] !== undefined) {
        defaultData[field.name] = initialData[field.name];
      } else {
        defaultData[field.name] = field.defaultValue || "";
      }
    });
    setFormData(defaultData);
  }, [initialData, fields]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    fields.forEach((field) => {
      if (field.required && !formData[field.name]?.trim()) {
        newErrors[field.name] = `${field.label} es requerido`;
      }

      // Validación de email
      if (field.type === "email" && formData[field.name]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.name])) {
          newErrors[field.name] = "Email inválido";
        }
      }

      // Validación personalizada
      if (field.validate && formData[field.name]) {
        const validationError = field.validate(formData[field.name]);
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
      await onSubmit(formData);
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

  if (loading) {
    return (
      <div className="w-full px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-neutral-900 rounded-lg p-6 animate-pulse">
            <div className="h-8 bg-neutral-700 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="h-4 bg-neutral-700 rounded w-1/4 mb-2"></div>
                  <div className="h-10 bg-neutral-700 rounded"></div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <div className="h-10 bg-neutral-700 rounded w-24"></div>
              <div className="h-10 bg-neutral-700 rounded w-24"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Volver
        </button>

        <div className="bg-neutral-900 rounded-lg shadow-xl border border-neutral-800 p-6">
          <h1 className="text-2xl font-bold text-white mb-6">{title}</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((field) => (
              <FormField
                key={field.name}
                label={field.label}
                name={field.name}
                type={field.type || "text"}
                value={formData[field.name] || ""}
                onChange={handleChange}
                placeholder={field.placeholder || ""}
                required={field.required || false}
                disabled={submitting || field.disabled}
                error={errors[field.name]}
                rows={field.rows}
              />
            ))}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="submit"
                variant="emerald"
                loading={submitting}
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                {isEditMode ? "Actualizar" : "Crear"}
              </Button>

              <Button
                type="button"
                variant="zinc"
                onClick={handleCancel}
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
