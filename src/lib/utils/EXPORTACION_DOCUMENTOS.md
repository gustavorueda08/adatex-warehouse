# Sistema de Exportación de Documentos

Sistema completo para exportar documentos (órdenes de compra, ventas, devoluciones, etc.) a formatos Excel (.xlsx) y PDF.

## Archivos Creados

### 1. `documentExportHelpers.js`
Funciones auxiliares compartidas para preparar y formatear datos:
- `prepareDocumentData(document)` - Normaliza datos según tipo de documento
- `formatDocumentHeader(data)` - Genera información del encabezado
- `formatPackingList(products, options)` - Formatea lista de productos/items
- `calculateSummary(products)` - Calcula totales y resumen
- `generateFileName(document, extension)` - Genera nombre de archivo
- `getDocumentTitle(type)` - Obtiene título según tipo de documento

### 2. `exportToExcel.js`
Exportación a formato Excel usando `xlsx`:
- `exportDocumentToExcel(document, options)` - Función principal
- Genera archivo .xlsx con estructura profesional
- Incluye logo placeholder, encabezado, lista de empaque y resumen

### 3. `exportToPDF.js`
Exportación a formato PDF usando `jspdf` + `jspdf-autotable`:
- `exportDocumentToPDF(document, options)` - Función principal
- Genera archivo PDF profesional con tablas formateadas
- Logo placeholder en esquina superior izquierda
- Estilos consistentes con la aplicación (colores zinc/emerald/cyan)

## Uso

### Desde documentConfigs.js

Las acciones de descarga ya están integradas:

```javascript
// Para purchases
{
  label: "Descargar orden de compra",
  variant: "cyan",
  onClick: () => handleDocumentExport(document, { includeLot: false }),
}

// Para sales
{
  label: "Descargar lista de empaque",
  variant: "cyan",
  onClick: () => handleDocumentExport(document, { includeLot: false }),
}
```

### Uso Directo

```javascript
import { exportDocumentToExcel } from "@/lib/utils/exportToExcel";
import { exportDocumentToPDF } from "@/lib/utils/exportToPDF";

// Exportar a Excel
await exportDocumentToExcel(document, {
  includeLot: true,
  includeItemNumber: true,
  includeBarcode: false,
});

// Exportar a PDF
await exportDocumentToPDF(document, {
  includeLot: true,
  includeItemNumber: false,
  includeBarcode: true,
});
```

## Opciones

Ambas funciones aceptan las mismas opciones:

- `includeLot` (boolean) - Incluir columna de lote en la tabla
- `includeItemNumber` (boolean) - Incluir columna de número de item
- `includeBarcode` (boolean) - Incluir columna de código de barras

## Compatibilidad con Tipos de Documentos

El sistema es compatible con todos los tipos de documentos:

### Purchase (Compra)
- Muestra: Código, Proveedor, Dirección, Fechas, Bodega Destino
- Productos con cantidades solicitadas y recibidas
- Totales monetarios si hay precios

### Sale (Venta)
- Muestra: Código, Cliente, Dirección, Fechas, Bodega Origen
- Cliente para Factura (si aplica)
- Productos con cantidades y precios
- Resumen con subtotal, IVA y total

### Return (Devolución)
- Muestra: Código, Cliente, Bodega Destino
- Orden de origen relacionada
- Items devueltos con cantidades

### Transform (Transformación)
- Muestra: Código, Bodega, Tipo de transformación
- Productos origen y destino
- Cantidades transformadas

### In/Out (Entradas/Salidas)
- Muestra: Código, Bodega, Tipo de movimiento
- Lista de productos con cantidades

## Estructura del Documento Generado

### Excel (.xlsx)

```
┌─────────────────────────────────────┐
│ LOGO (espacio reservado 50x30mm)    │
├─────────────────────────────────────┤
│ ORDEN DE COMPRA                     │
├─────────────────────────────────────┤
│ Código de Orden:    PUR-001         │
│ Proveedor:          Proveedor S.A.  │
│ Dirección:          Calle 123       │
│ Fecha de Creación:  17/10/2025      │
│ Bodega Destino:     Bodega Central  │
├─────────────────────────────────────┤
│ LISTA DE EMPAQUE                    │
├─────────────────────────────────────┤
│ Producto  │ Cantidad │ Unidad │ ... │
│ Prod A    │ 100      │ kg     │ ... │
│ Prod B    │ 50       │ m      │ ... │
├─────────────────────────────────────┤
│ RESUMEN                             │
├─────────────────────────────────────┤
│ Total de Items:     2               │
│ Cantidad Total:     Ver detalle     │
│ Subtotal:           $1,000          │
│ IVA (19%):          $190            │
│ Total:              $1,190          │
└─────────────────────────────────────┘
```

### PDF

Similar a Excel pero con diseño profesional:
- Logo placeholder en esquina superior izquierda (50x30mm)
- Tablas con estilos (headers en color emerald/cyan)
- Filas alternadas para mejor legibilidad
- Footer con número de página y fecha de generación

## Nombres de Archivos

Los archivos se descargan con el formato:
```
{code} - {customer/supplier} ({createdDate}).{ext}
```

Ejemplos:
- `PUR-001 - Proveedor SA (2025-10-17).xlsx`
- `SAL-045 - Cliente Corp (2025-10-17).pdf`

## Resumen de Totales

### Cantidades
- Si todos los productos tienen la misma unidad → muestra total
- Si hay unidades mixtas → indica "Ver detalle arriba"

### Totales Monetarios
- Subtotal: Suma de (precio × cantidad)
- IVA: 19% del subtotal (solo si no está incluido en precio)
- Total: Subtotal + IVA

## Estilos y Colores

Los documentos usan la paleta de colores de la aplicación:

- **Zinc-800**: #27272a (fondo oscuro)
- **Emerald-500**: #10b981 (verde éxito)
- **Cyan-500**: #06b6d4 (azul información)
- **Gray-400**: #9ca3af (texto secundario)

En PDF, estos colores se aplican a headers de tablas y elementos destacados.

## Logo

Ambos formatos incluyen un espacio reservado para el logo:
- **Excel**: Celda merge 50x30mm en la parte superior
- **PDF**: Rectángulo 50x30mm en esquina superior izquierda

Para agregar el logo real:
1. Guardar la imagen en `/public/logo.png`
2. Actualizar los archivos de exportación para incluir la imagen
3. En Excel: usar `XLSX.utils.book_append_image()`
4. En PDF: usar `pdf.addImage(logoData, 'PNG', x, y, width, height)`

## Pendientes para el Futuro

1. **Estilos avanzados en Excel**:
   - Considerar usar `xlsx-populate` para estilos completos
   - Colores de fondo en headers
   - Bordes personalizados

2. **Logo real**:
   - Agregar imagen del logo de la empresa
   - Incluir en ambos formatos

3. **Más opciones de personalización**:
   - Seleccionar qué columnas incluir
   - Formato de números personalizado
   - Idioma (español/inglés)

4. **Exportación por lotes**:
   - Exportar múltiples documentos a la vez
   - Generar ZIP con varios archivos

## Ejemplos de Uso

### Exportar con todas las opciones
```javascript
await handleDocumentExport(document, {
  includeLot: true,
  includeItemNumber: true,
  includeBarcode: true,
});
```

### Exportar solo con lote
```javascript
await handleDocumentExport(document, {
  includeLot: true,
});
```

### Exportar mínimo
```javascript
await handleDocumentExport(document);
```

## Manejo de Errores

Todas las funciones incluyen manejo de errores:
- Muestra toast de error si falla la exportación
- Console.error con detalles del error
- No interrumpe la aplicación en caso de fallo

## Testing

Para probar las funciones:
1. Ir a una orden de compra o venta
2. Hacer clic en "Descargar orden de compra" o "Descargar lista de empaque"
3. Seleccionar formato (Excel o PDF)
4. Verificar que el archivo se descarga correctamente
5. Abrir el archivo y verificar el contenido

## Soporte

Tipos de documentos soportados:
- ✅ Purchase (Orden de Compra)
- ✅ Sale (Orden de Venta)
- ✅ Return (Devolución)
- ✅ Transform (Transformación)
- ✅ In (Entrada de Inventario)
- ✅ Out (Salida de Inventario)

Formatos soportados:
- ✅ Excel (.xlsx)
- ✅ PDF (.pdf)
