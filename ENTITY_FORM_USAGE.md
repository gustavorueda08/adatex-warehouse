# EntityForm - Guía de Uso

## Descripción

El componente `EntityForm` ahora funciona de manera similar a `DocumentForm`, utilizando configuraciones centralizadas para mayor mantenibilidad y reutilización de código.

## Modo de Uso

### 1. Modo Nuevo (Recomendado) - Con Config

Este modo utiliza configuraciones centralizadas definidas en `src/lib/config/entityConfigs.js`.

#### Ejemplo: Crear un nuevo cliente

```jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EntityForm from "@/components/entities/EntityForm";
import { createCustomerFormConfig } from "@/lib/config/entityConfigs";
import toast from "react-hot-toast";

export default function NewCustomerPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (formData) => {
    try {
      setCreating(true);

      const response = await fetch("/api/strapi/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: formData }),
      });

      if (!response.ok) {
        throw new Error("Error al crear el cliente");
      }

      toast.success("Cliente creado exitosamente");
      router.push("/customers");
    } catch (error) {
      console.error("Error creating customer:", error);
      throw error;
    } finally {
      setCreating(false);
    }
  };

  // Crear la configuración para el formulario
  const config = createCustomerFormConfig({
    onSubmit: handleSubmit,
    loading: creating,
  });

  return <EntityForm config={config} backPath="/customers" />;
}
```

### 2. Modo Legacy (Aún Soportado)

El modo anterior sigue funcionando para mantener compatibilidad:

```jsx
export default function NewCustomerPage() {
  const router = useRouter();

  const fields = [
    {
      name: "name",
      label: "Nombre",
      type: "text",
      required: true,
      placeholder: "Nombre del cliente",
    },
    // ... más campos
  ];

  const handleSubmit = async (formData) => {
    // lógica de submit
  };

  return (
    <EntityForm
      title="Crear Nuevo Cliente"
      fields={fields}
      onSubmit={handleSubmit}
      backPath="/customers"
    />
  );
}
```

## Configuraciones Disponibles

En `src/lib/config/entityConfigs.js` se encuentran las siguientes configuraciones:

### 1. `createCustomerFormConfig({ onSubmit, loading })`

Configuración para crear/editar clientes.

**Campos:**
- `name` (requerido): Nombre del cliente
- `email`: Email del cliente
- `phone`: Teléfono del cliente
- `identification`: Cédula o NIT
- `address`: Dirección completa

### 2. `createSupplierFormConfig({ onSubmit, loading })`

Configuración para crear/editar proveedores.

**Campos:**
- `name` (requerido): Nombre del proveedor
- `email`: Email del proveedor
- `phone`: Teléfono del proveedor
- `identification`: NIT del proveedor
- `address`: Dirección completa

### 3. `createSellerFormConfig({ onSubmit, loading })`

Configuración para crear/editar vendedores.

**Campos:**
- `name` (requerido): Nombre del vendedor
- `email` (requerido): Email del vendedor
- `phone`: Teléfono del vendedor
- `identification`: Cédula del vendedor

### 4. `createCarrierFormConfig({ onSubmit, loading })`

Configuración para crear/editar transportadores.

**Campos:**
- `name` (requerido): Nombre del transportador
- `email`: Email del transportador
- `phone` (requerido): Teléfono del transportador
- `identification`: NIT del transportador
- `vehicleType`: Tipo de vehículo
- `address`: Dirección completa

## Estructura de una Configuración

```javascript
export function createCustomFormConfig({ onSubmit, loading }) {
  return {
    // Información del formulario
    title: "Título del formulario",
    description: "Descripción opcional",
    entityType: "customer", // 'customer', 'supplier', 'seller', 'carrier'
    loading,
    onSubmit,

    // Campos del formulario
    fields: [
      {
        name: "fieldName",
        label: "Etiqueta del campo",
        type: "text", // 'text', 'email', 'textarea', 'select', 'multi-select', 'date', 'custom'
        required: true,
        placeholder: "Placeholder...",
        fullWidth: false, // Ocupar todo el ancho en grid (md:col-span-2)
      },
      // ... más campos
    ],

    // Validación personalizada (opcional)
    validateForm: (formData) => {
      // Retornar true si es válido, false si no
      return !!formData.name && formData.name.trim() !== "";
    },

    // Preparar datos antes de enviar (opcional)
    prepareSubmitData: (formData) => {
      // Transformar/preparar datos antes de enviar
      return formData;
    },
  };
}
```

## Tipos de Campos Soportados

### 1. Text / Email / Textarea

```javascript
{
  name: "fieldName",
  label: "Label",
  type: "text", // 'text', 'email', 'textarea'
  required: true,
  placeholder: "Placeholder...",
  rows: 3, // Solo para textarea
}
```

### 2. Select

```javascript
{
  name: "fieldName",
  label: "Label",
  type: "select",
  required: true,
  searchable: true,
  clearable: true,
  options: [
    { label: "Opción 1", value: "value1" },
    { label: "Opción 2", value: "value2" },
  ],
  // O función dinámica
  options: (formData) => {
    // Retornar array de opciones basado en formData
    return [];
  },
  onChange: (value, formData, updateField) => {
    // Lógica adicional al cambiar
  },
}
```

### 3. Multi-Select

```javascript
{
  name: "fieldName",
  label: "Label",
  type: "multi-select",
  required: true,
  searchable: true,
  options: [
    { label: "Opción 1", value: "id1" },
    { label: "Opción 2", value: "id2" },
  ],
}
```

### 4. Date

```javascript
{
  name: "fieldName",
  label: "Label",
  type: "date",
  required: true,
}
```

### 5. Custom

```javascript
{
  name: "fieldName",
  label: "Label",
  type: "custom",
  required: true,
  render: ({ value, formData, updateField }) => {
    return (
      <div>
        {/* Tu componente personalizado */}
      </div>
    );
  },
}
```

## Ventajas del Nuevo Sistema

1. **Configuración Centralizada**: Todas las configuraciones de entidades en un solo lugar
2. **Reutilización**: Usa la misma configuración para crear y editar
3. **Mantenibilidad**: Más fácil de actualizar y mantener
4. **Consistencia**: Misma estructura que `DocumentForm`
5. **Separación de Responsabilidades**: Lógica de UI separada de la configuración
6. **Validación Personalizada**: Funciones de validación y preparación de datos centralizadas

## Migración desde Modo Legacy

Para migrar un formulario existente:

1. Crea una función de configuración en `src/lib/config/entityConfigs.js`
2. Mueve los campos y lógica de validación a la configuración
3. Actualiza el componente de la página para usar `config`
4. Elimina las props legacy del componente

**Antes:**
```jsx
<EntityForm
  title="Título"
  fields={fields}
  onSubmit={handleSubmit}
  backPath="/path"
/>
```

**Después:**
```jsx
const config = createEntityFormConfig({ onSubmit, loading });
return <EntityForm config={config} backPath="/path" />;
```

## Referencias

- Configuraciones: `src/lib/config/entityConfigs.js`
- Componente: `src/components/entities/EntityForm.jsx`
- Ejemplo de uso: `src/app/(auth)/(protected)/new-customer/page.js`
- Documentación de DocumentForm (similar): Ver `DocumentForm.jsx`
