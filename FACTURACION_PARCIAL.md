# Sistema de Facturación Parcial - Guía de Uso

## Descripción General

El sistema de facturación parcial permite gestionar el inventario despachado a clientes en **remisión** (sin facturar inicialmente), para luego facturar parcialmente según el cliente reporte qué productos vendió.

## Flujos de Trabajo Implementados

### 1. Crear y Gestionar Remisiones

#### Paso 1: Crear Orden de Venta
1. Ve a `/new-sale`
2. Completa los datos del cliente y productos
3. Guarda la orden

#### Paso 2: Despachar sin Facturar
1. En `/sales/[id]`, completa la orden normalmente
2. Si NO se genera automáticamente la factura en Siigo (sin `siigoId`), la orden queda como **Remisión**
3. Verás un indicador "Remisión" en el título y una sección especial con advertencia amarilla

### 2. Consultar Balance de Remisión

#### Desde el Cliente
1. Ve a `/customers/[id]`
2. Haz clic en "Mostrar balance"
3. Verás:
   - Resumen general (despachado, facturado, pendiente)
   - Detalle por producto
   - Órdenes asociadas a cada producto

#### Desde la Orden de Venta
1. En `/sales/[id]` (si es remisión)
2. Verás la sección "Estado de Remisión" con el botón "Crear Factura Parcial"

### 3. Crear Factura Parcial

#### Opción A: Desde la Orden de Venta
1. En `/sales/[id]` (remisión), haz clic en "Crear factura parcial"
2. Selecciona el modo de facturación:
   - **Por cantidad (FIFO automático)**: Ingresa la cantidad y el sistema selecciona automáticamente los items más antiguos
   - **Selección manual**: Selecciona individualmente cada item con checkboxes

#### Opción B: Desde el Balance del Cliente
1. En `/customers/[id]`, haz clic en "Mostrar balance"
2. Junto a cada producto con saldo pendiente, haz clic en "Facturar"
3. Serás redirigido a la página de crear factura parcial

#### Crear la Factura
1. Selecciona items o ingresa cantidades
2. Agrega notas si es necesario
3. Haz clic en "Crear factura parcial"
4. Serás redirigido a `/partial-invoices/[newId]`

### 4. Completar y Facturar

1. En `/partial-invoices/[id]`, revisa los items seleccionados
2. Haz clic en "Completar y facturar"
3. El sistema:
   - Marca los items como `isInvoiced: true`
   - Genera `siigoId` (si Siigo está configurado)
   - Cambia el estado a "completed"

### 5. Listar Facturas Parciales

1. Ve a `/partial-invoices`
2. Verás todas las facturas parciales creadas
3. Columnas especiales:
   - **Orden Original**: Link a la orden de venta padre
   - **Estado Facturación**: Facturado (verde) o Pendiente (amarillo)
   - **N° Factura**: Número de factura de Siigo (si existe)

## Estructura de Archivos Creados

### Hooks
- `src/lib/hooks/useConsignment.js` - Hooks para balance, historial y creación de facturas parciales
  - `useConsignmentBalance(customerId, options)` - Balance de remisión
  - `useConsignmentHistory(customerId, options)` - Historial
  - `useInvoiceableItems(orderId, options)` - Items facturables
  - `useCreatePartialInvoice()` - Crear factura parcial

### Componentes
- `src/components/customers/ConsignmentBalance.jsx` - Balance de remisión del cliente
- `src/components/partialInvoice/InvoiceableItemsTable.jsx` - Tabla de items facturables

### Páginas
- `src/app/(auth)/(protected)/customers/[id]/page.js` - **Modificada** - Sección de balance
- `src/app/(auth)/(protected)/sales/page.js` - **Modificada** - Indicador de remisión
- `src/app/(auth)/(protected)/sales/[id]/page.js` - **Modificada** - Botón crear factura
- `src/app/(auth)/(protected)/sales/[id]/partial-invoice/page.js` - **Nueva** - Crear factura parcial
- `src/app/(auth)/(protected)/partial-invoices/page.js` - **Nueva** - Lista de facturas parciales
- `src/app/(auth)/(protected)/partial-invoices/[id]/page.js` - **Nueva** - Detalle de factura parcial

### Configuración
- `src/lib/config/documentConfigs.js` - **Modificada** - Agregada `partialInvoiceDocumentConfig`

## Endpoints del API que Consume

El frontend consume los siguientes endpoints del backend:

### Balance y Consultas
```javascript
GET /api/strapi/customers/:customerId/consignment-balance
GET /api/strapi/customers/:customerId/consignment-balance?product=10
GET /api/strapi/customers/:customerId/consignment-history?startDate&endDate&product&limit
GET /api/strapi/orders/:orderId/invoiceable-items
```

### Creación de Facturas Parciales
```javascript
// Especificando items por ID
POST /api/strapi/orders
Body: {
  data: {
    type: "partial-invoice",
    parentOrder: 123,
    customerForInvoice: 5,
    products: [{
      product: 10,
      items: [{ id: 456 }]
    }]
  }
}

// Búsqueda automática FIFO
POST /api/strapi/orders/create-partial-invoice
Body: {
  parentOrder: 123,
  customer: 5,
  customerForInvoice: 5,
  products: [{
    product: 10,
    quantity: 30
  }]
}
```

### Completar Factura
```javascript
PUT /api/strapi/orders/:partialInvoiceId
Body: {
  data: {
    state: "completed"
  }
}
```

## Indicadores Visuales

### Badges de Estado
- **Remisión** (amarillo con texto negro): Orden completada sin facturar
- **Facturada** (verde): Orden con `siigoId`
- **Venta** (gris): Orden en borrador o confirmada
- **Pendiente** (amarillo): Factura parcial no completada
- **Facturado** (verde): Factura parcial completada

### Secciones Especiales
- **Estado de Remisión**: Sección con fondo amarillo en `/sales/[id]` cuando es remisión
- **Balance de Remisión**: Sección expandible en `/customers/[id]`

## Validaciones Implementadas (Cliente)

El frontend valida:
1. No se puede crear factura parcial de una orden que no sea remisión
2. No se puede seleccionar cantidad mayor a la disponible
3. Se requiere al menos un item o cantidad para crear factura parcial
4. Los botones se deshabilitan apropiadamente según el estado

## Casos de Uso

### Caso 1: Consignación Simple
1. Cliente "ABC" recibe 100 kg de producto X en remisión
2. Después de una semana, reporta que vendió 60 kg
3. Vas a `/sales/[id]/partial-invoice`
4. Ingresas 60 kg en modo "Por cantidad"
5. Creas la factura parcial
6. Completas y facturas
7. El balance ahora muestra: 100 despachado, 60 facturado, 40 pendiente

### Caso 2: Múltiples Facturaciones
1. Cliente "XYZ" recibe 200 unidades en remisión
2. Semana 1: Vende 50, creas factura parcial de 50
3. Semana 2: Vende 30, creas factura parcial de 30
4. Semana 3: Vende 80, creas factura parcial de 80
5. Quedan 40 unidades pendientes en remisión
6. En `/customers/[id]` puedes ver el historial completo

### Caso 3: Selección Manual de Items
1. Cliente tiene productos con lotes específicos
2. Usas modo "Selección manual"
3. Seleccionas exactamente los items que vendió
4. Creas la factura con esos items específicos

## Notas Técnicas

### Reutilización de Componentes
El sistema reutiliza completamente tu arquitectura existente:
- `DocumentListPage` para listar facturas parciales
- `DocumentDetailBase` para el detalle
- Mismos hooks de `useOrders`
- Misma estructura de configuración en `documentConfigs.js`

### Estados de Items
Los items tienen ahora:
- `state`: "available" | "sold" | etc.
- `isInvoiced`: boolean
- `invoicedDate`: datetime

### Relaciones
- Orden parcial → Orden padre: `parentOrder` field
- Items many-to-many con órdenes
- Múltiples facturas parciales pueden referenciar la misma orden padre

## Troubleshooting

### "No hay items facturables"
- Verifica que la orden esté completada
- Verifica que NO tenga `siigoId` (debe ser remisión)
- Verifica que los items no estén ya facturados

### Balance no se actualiza
- Haz clic en "Actualizar balance"
- Verifica que las facturas parciales estén completadas (no solo creadas)

### No aparece el botón "Crear factura parcial"
- Solo aparece en órdenes completadas sin `siigoId`
- Verifica el estado de la orden

## Siguientes Pasos

Para extender el sistema puedes:
1. Agregar filtros en `/partial-invoices` (por fecha, cliente, estado)
2. Agregar gráficas de balance de remisión
3. Agregar notificaciones cuando el balance está bajo
4. Agregar exportación de reportes de remisión
5. Agregar historial de facturaciones en el detalle de la orden

## Soporte

Si tienes dudas sobre la implementación, revisa:
- Los comentarios en el código fuente
- La documentación del backend en el PDF original
- Los ejemplos de uso en este documento
