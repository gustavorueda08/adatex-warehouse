# Sistema de Formularios de Documentos

Este sistema proporciona un componente genérico y reutilizable para crear diferentes tipos de documentos (ventas, compras, entradas, salidas, devoluciones, etc.).

## Componentes

### DocumentForm
Componente genérico que renderiza formularios de documentos basados en configuración.

**Ubicación:** `src/components/documents/DocumentForm.jsx`

### Configuraciones
Funciones helper para crear configuraciones de diferentes tipos de documentos.

**Ubicación:** `src/lib/config/documentConfigs.js`

## Uso básico

```javascript
import DocumentForm from "@/components/documents/DocumentForm";
import { createSaleFormConfig } from "@/lib/config/documentConfigs";

export default function NewSalePage() {
  const { customers, warehouses, products, createOrder, loading } = useYourHooks();

  const config = createSaleFormConfig({
    customers,
    warehouses,
    productsData: products,
    onSubmit: createOrder,
    loading,
  });

  return <DocumentForm config={config} />;
}
```

## Configuraciones disponibles

| Función | Tipo de documento | Campos requeridos |
|---------|------------------|-------------------|
| `createSaleFormConfig` | Venta | customer, customerForInvoice, warehouse (origen) |
| `createPurchaseFormConfig` | Compra | supplier, warehouse (destino) |
| `createInflowFormConfig` | Entrada | warehouse (destino) |
| `createOutflowFormConfig` | Salida | warehouse (origen) |
| `createReturnFormConfig` | Devolución | warehouse (destino) |

## Agregar campos adicionales

### Opción 1: Usar `additionalFields` en la configuración

```javascript
const config = createSaleFormConfig({
  // ... otras opciones
});

// Agregar campos adicionales después de la tabla de productos
config.additionalFields = ({ formState, updateField }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-white">Información adicional</h3>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm text-gray-400">Número de referencia</label>
        <Input
          value={formState.referenceNumber || ""}
          onChange={(e) => updateField("referenceNumber", e.target.value)}
        />
      </div>

      <div>
        <label className="text-sm text-gray-400">Notas</label>
        <Textarea
          value={formState.notes || ""}
          onChange={(e) => updateField("notes", e.target.value)}
        />
      </div>
    </div>
  </div>
);
```

### Opción 2: Agregar campos al header

```javascript
const config = createSaleFormConfig({
  // ... otras opciones
});

// Agregar una nueva fila de campos en el header
config.headerFields.push([
  {
    key: "referenceNumber",
    label: "Número de referencia",
    type: "custom",
    render: ({ value, updateField }) => (
      <Input
        value={value || ""}
        onChange={(e) => updateField("referenceNumber", e.target.value)}
      />
    ),
  },
]);
```

### Opción 3: Modificar columnas de productos

```javascript
const config = createSaleFormConfig({
  // ... otras opciones
});

// Guardar la función original
const originalProductColumns = config.productColumns;

// Reemplazar con una versión modificada
config.productColumns = (context) => {
  const columns = originalProductColumns(context);

  // Agregar nueva columna después de "Precio"
  columns.splice(2, 0, {
    key: "discount",
    label: "Descuento %",
    render: (_, row) => (
      <Input
        input={row.discount || ""}
        setInput={(value) =>
          context.updateProductField(row.id, "discount", value)
        }
        placeholder="%"
        className="md:max-w-20"
      />
    ),
    footer: "-",
  });

  return columns;
};
```

## Ejemplo: Crear un formulario para ADJUSTMENT (Ajuste de inventario)

```javascript
// 1. Agregar el tipo en orderTypes.js
export const ORDER_TYPES = {
  // ... tipos existentes
  ADJUSTMENT: "adjustment",
};

// 2. Crear la configuración en documentConfigs.js
export function createAdjustmentFormConfig({
  warehouses,
  productsData,
  onSubmit,
  loading,
}) {
  return {
    title: "Nuevo ajuste de inventario",
    type: ORDER_TYPES.ADJUSTMENT,
    loading,
    onSubmit,

    headerFields: [
      [
        {
          key: "dateCreated",
          label: "Fecha de ajuste",
          type: "date",
        },
        {
          key: "selectedWarehouse",
          label: "Bodega",
          type: "select",
          searchable: true,
          options: warehouses.map((w) => ({ label: w.name, value: w })),
        },
      ],
      [
        {
          key: "reason",
          label: "Motivo del ajuste",
          type: "select",
          options: [
            { label: "Inventario físico", value: "physical_count" },
            { label: "Producto dañado", value: "damaged" },
            { label: "Error de registro", value: "registration_error" },
            { label: "Otro", value: "other" },
          ],
        },
      ],
    ],

    productColumns: (context) => {
      const baseColumns = createProductColumns({
        ...context,
        productsData,
        includePrice: false,
      });

      // Agregar columna para tipo de ajuste (entrada o salida)
      baseColumns.splice(2, 0, {
        key: "adjustmentType",
        label: "Tipo",
        render: (_, row) => (
          <Select
            size="sm"
            options={[
              { label: "Entrada", value: "in" },
              { label: "Salida", value: "out" },
            ]}
            value={row.adjustmentType}
            onChange={(value) =>
              context.updateProductField(row.id, "adjustmentType", value)
            }
          />
        ),
        footer: "-",
      });

      return baseColumns;
    },

    validateForm: (formState) => {
      const hasWarehouse = formState.selectedWarehouse;
      const hasReason = formState.reason;
      const hasProducts = formState.products.some((p) => p.product);
      const allProductsValid = formState.products
        .filter((p) => p.product)
        .every(
          (p) =>
            p.quantity &&
            Number(p.quantity) > 0 &&
            p.adjustmentType
        );

      return hasWarehouse && hasReason && hasProducts && allProductsValid;
    },

    prepareSubmitData: (formState, user) => ({
      type: ORDER_TYPES.ADJUSTMENT,
      products: formState.products
        .filter((p) => p.product)
        .map((p) => ({
          quantity: Number(p.quantity),
          product: p.product.id,
          adjustmentType: p.adjustmentType,
        })),
      warehouse: formState.selectedWarehouse.id,
      reason: formState.reason,
      createdDate: formState.dateCreated,
      generatedBy: user.id,
    }),

    initialState: {
      selectedWarehouse: null,
      reason: null,
    },

    // Campos adicionales al final del formulario
    additionalFields: ({ formState, updateField }) => (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Observaciones
          </label>
          <Textarea
            value={formState.observations || ""}
            onChange={(e) => updateField("observations", e.target.value)}
            placeholder="Describe el motivo del ajuste..."
            rows={3}
          />
        </div>
      </div>
    ),
  };
}

// 3. Usar en la página
export default function NewAdjustmentPage() {
  const { warehouses, products, createAdjustment, loading } = useYourHooks();

  const config = createAdjustmentFormConfig({
    warehouses,
    productsData: products,
    onSubmit: createAdjustment,
    loading,
  });

  return <DocumentForm config={config} />;
}
```

## Ejemplo: Formulario para TRANSFORM (Transformación de productos)

```javascript
export function createTransformFormConfig({
  warehouses,
  productsData,
  onSubmit,
  loading,
}) {
  return {
    title: "Transformación de productos",
    type: "transform",
    loading,
    onSubmit,

    headerFields: [
      [
        {
          key: "dateCreated",
          label: "Fecha",
          type: "date",
        },
        {
          key: "selectedWarehouse",
          label: "Bodega",
          type: "select",
          searchable: true,
          options: warehouses.map((w) => ({ label: w.name, value: w })),
        },
      ],
    ],

    // Personalizar completamente las columnas para transformación
    productColumns: (context) => [
      {
        key: "sourceProduct",
        label: "Producto origen",
        render: (_, row, index) => (
          <Select
            className="md:min-w-60"
            options={productsData.map((p) => ({ label: p.name, value: p }))}
            value={row.sourceProduct || null}
            onChange={(product) =>
              context.updateProductField(row.id, "sourceProduct", product)
            }
            searchable
          />
        ),
        footer: "Total",
      },
      {
        key: "sourceQuantity",
        label: "Cantidad origen",
        render: (_, row) => (
          <Input
            input={row.sourceQuantity}
            setInput={(value) =>
              context.updateProductField(row.id, "sourceQuantity", value)
            }
            className="md:max-w-28"
          />
        ),
        footer: "-",
      },
      {
        key: "arrow",
        label: "",
        render: () => <span className="text-gray-400">→</span>,
        footer: "",
      },
      {
        key: "targetProduct",
        label: "Producto destino",
        render: (_, row, index) => (
          <Select
            className="md:min-w-60"
            options={productsData.map((p) => ({ label: p.name, value: p }))}
            value={row.targetProduct || null}
            onChange={(product) =>
              context.updateProductField(row.id, "targetProduct", product)
            }
            searchable
          />
        ),
        footer: "",
      },
      {
        key: "targetQuantity",
        label: "Cantidad destino",
        render: (_, row) => (
          <Input
            input={row.targetQuantity}
            setInput={(value) =>
              context.updateProductField(row.id, "targetQuantity", value)
            }
            className="md:max-w-28"
          />
        ),
        footer: "-",
      },
    ],

    validateForm: (formState) => {
      const hasWarehouse = formState.selectedWarehouse;
      const hasProducts = formState.products.some(
        (p) => p.sourceProduct && p.targetProduct
      );
      const allValid = formState.products
        .filter((p) => p.sourceProduct && p.targetProduct)
        .every(
          (p) =>
            p.sourceQuantity &&
            p.targetQuantity &&
            Number(p.sourceQuantity) > 0 &&
            Number(p.targetQuantity) > 0
        );

      return hasWarehouse && hasProducts && allValid;
    },

    prepareSubmitData: (formState, user) => ({
      type: "transform",
      transformations: formState.products
        .filter((p) => p.sourceProduct && p.targetProduct)
        .map((p) => ({
          sourceProduct: p.sourceProduct.id,
          sourceQuantity: Number(p.sourceQuantity),
          targetProduct: p.targetProduct.id,
          targetQuantity: Number(p.targetQuantity),
        })),
      warehouse: formState.selectedWarehouse.id,
      createdDate: formState.dateCreated,
      generatedBy: user.id,
    }),

    initialState: {
      selectedWarehouse: null,
    },
  };
}
```

## Estructura de la configuración

```typescript
{
  title: string;                    // Título del formulario
  type: string;                     // Tipo de documento (ORDER_TYPES)
  loading: boolean;                 // Estado de carga
  onSubmit: Function;               // Función al crear documento

  headerFields: Array<Array<{       // Campos del encabezado (agrupados por fila)
    key: string;                    // Clave del campo en formState
    label: string;                  // Etiqueta
    type: "select" | "date" | "custom";
    options?: Array | Function;     // Opciones (array o función)
    searchable?: boolean;
    onChange?: Function;            // Callback al cambiar valor
    render?: Function;              // Renderizado personalizado (para type="custom")
  }>>;

  productColumns: Function;         // Función que retorna columnas de productos

  onProductSelect?: Function;       // Callback al seleccionar producto

  validateForm: Function;           // Validación del formulario

  prepareSubmitData: Function;      // Preparar datos para envío

  initialState: Object;             // Estado inicial del formulario

  additionalFields?: Function;      // Componente de campos adicionales
}
```

## Notas importantes

1. **Mantener compatibilidad:** Las configuraciones antiguas para `DocumentDetailBase` siguen funcionando sin cambios.

2. **Reutilización:** Usa `createProductColumns` para generar columnas estándar de productos.

3. **Flexibilidad:** Puedes modificar cualquier parte de la configuración antes de pasarla a `DocumentForm`.

4. **Validación:** Implementa `validateForm` para controlar cuándo el botón "Crear" está habilitado.

5. **Estado del formulario:** El `formState` incluye tanto los campos del header como `products` (array de productos).
