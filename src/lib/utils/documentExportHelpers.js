import format from "./format";
import moment from "moment-timezone";

/**
 * Prepara los datos normalizados de un documento para exportación
 * Compatible con todos los tipos de documentos
 * @param {Object} document - Documento completo del sistema
 * @returns {Object} Datos normalizados para exportación
 */
export function prepareDocumentData(document) {
  const type = document?.type || "unknown";

  // Determinar entidad principal (customer o supplier)
  let entityName = "-";
  let entityAddress = "-";
  let entityLabel = "Entidad";

  if (type === "sale" && document.customer) {
    entityName = document.customer.name || "-";
    entityAddress = document.customer.address || "-";
    entityLabel = "Cliente";
  } else if (type === "purchase" && document.supplier) {
    entityName = document.supplier.name || "-";
    entityAddress = document.supplier.address || "-";
    entityLabel = "Proveedor";
  } else if (type === "return" && document.customer) {
    entityName = document.customer.name || "-";
    entityAddress = document.customer.address || "-";
    entityLabel = "Cliente";
  } else if (type === "transform" || type === "in" || type === "out") {
    entityName = document.warehouse?.name || "-";
    entityAddress = "-";
    entityLabel = "Bodega";
  }
  const data = {
    type,
    code: document.code || "-",
    entityName,
    entityAddress,
    entityLabel,
    createdDate: document.createdAt
      ? moment(document.createdAt).format("DD/MM/YYYY")
      : "-",
    dispatchDate: document.actualDispatchDate
      ? moment(document.actualDispatchDate).format("DD/MM/YYYY")
      : "-",
    warehouse:
      document.destinationWarehouse?.name ||
      document.sourceWarehouse?.name ||
      "-",
    warehouseLabel: document.destinationWarehouse
      ? "Bodega Destino"
      : "Bodega Origen",
    state: document.state || "draft",
    products: document.orderProducts || [],

    // Campos especiales para transfers
    sourceOrder: document.sourceOrder?.code || null,
    destinationOrder: document.destinationOrder?.code || null,

    // Cliente para factura (solo sales)
    customerForInvoice: document.customerForInvoice?.name || null,
  };
  console.log("DATOS", data);
  return data;
}

/**
 * Formatea el encabezado del documento
 * @param {Object} data - Datos preparados del documento
 * @returns {Object} Información del encabezado formateada
 */
export function formatDocumentHeader(data) {
  const headers = [
    { label: "Código de Orden", value: data.code },
    { label: data.entityLabel, value: data.entityName },
    { label: "Dirección", value: data.entityAddress },
    { label: "Fecha de Creación", value: data.createdDate },
  ];

  // Agregar fecha de despacho si existe
  if (data.dispatchDate !== "-") {
    headers.push({ label: "Fecha de Despacho", value: data.dispatchDate });
  }

  // Agregar bodega
  headers.push({ label: data.warehouseLabel, value: data.warehouse });

  // Agregar cliente para factura si aplica
  if (data.customerForInvoice) {
    headers.push({
      label: "Cliente para Factura",
      value: data.customerForInvoice,
    });
  }

  // Agregar órdenes relacionadas para transfers
  if (data.sourceOrder) {
    headers.push({ label: "Orden de Origen", value: data.sourceOrder });
  }
  if (data.destinationOrder) {
    headers.push({ label: "Orden de Destino", value: data.destinationOrder });
  }

  return headers;
}

/**
 * Formatea la lista de empaque de productos e items
 * @param {Array} products - Array de productos del documento
 * @param {Object} options - Opciones de formateo
 * @param {boolean} options.includeLot - Incluir columna de lote
 * @param {boolean} options.includeItemNumber - Incluir columna de número de item
 * @param {boolean} options.includeBarcode - Incluir columna de código de barras
 * @returns {Array} Filas formateadas para tabla
 */
export function formatPackingList(products, options = {}) {
  const {
    includeLot = false,
    includeItemNumber = false,
    includeBarcode = false,
  } = options;

  const rows = [];

  products.forEach((product) => {
    const productName = product.product?.name || product.name || "-";
    const unit = product.product?.unit || "und";
    const items = product.items || [];

    if (items.length === 0) {
      // Producto sin items detallados
      const row = {
        product: productName,
        quantity: format(product.confirmedQuantity || 0),
        unidad: unit,
      };

      if (includeLot) row.lote = "-";
      if (includeItemNumber) row.numeroItem = "-";
      if (includeBarcode) row.codigoBarras = "-";

      rows.push(row);
    } else {
      // Producto con items
      items.forEach((item) => {
        const row = {
          product: productName,
          quantity: format(item.quantity || item.currentQuantity || 0),
          unit: unit,
        };

        if (includeLot) {
          row.lote = item.lotNumber || item.lot || "-";
        }
        if (includeItemNumber) {
          row.numeroItem = item.itemNumber || "-";
        }
        if (includeBarcode) {
          row.codigoBarras = item.barcode || "-";
        }
        rows.push(row);
      });
    }
  });

  console.log("ROOWS", rows);

  return rows;
}

/**
 * Calcula el resumen de totales del documento
 * @param {Array} products - Array de productos del documento
 * @returns {Object} Resumen de totales
 */
export function calculateSummary(products) {
  let totalQuantity = 0;
  let totalItems = 0;
  let subtotal = 0;
  let totalIVA = 0;
  let total = 0;
  let allUnitsConsistent = true;
  let firstUnit = null;

  products.forEach((product) => {
    const unit = product.product?.unit || "und";
    const items = product.items || [];
    const price = Number(product.price || 0);
    const ivaIncluded = product.ivaIncluded || false;

    // Verificar consistencia de unidades
    if (firstUnit === null) {
      firstUnit = unit;
    } else if (firstUnit !== unit) {
      allUnitsConsistent = false;
    }

    // Calcular cantidad total de items
    if (items.length > 0) {
      const itemQuantity = items.reduce(
        (sum, item) => sum + Number(item.quantity || item.currentQuantity || 0),
        0
      );
      totalQuantity += itemQuantity;
      totalItems += items.filter((i) => (i.quantity || 0) > 0).length;

      // Calcular totales monetarios
      const productSubtotal = price * itemQuantity;
      subtotal += productSubtotal;

      if (!ivaIncluded) {
        totalIVA += productSubtotal * 0.19; // IVA 19%
      }
    } else {
      // Si no hay items, usar requestedQuantity
      const quantity = Number(product.requestedQuantity || 0);
      totalQuantity += quantity;
      totalItems += quantity > 0 ? 1 : 0;

      const productSubtotal = price * quantity;
      subtotal += productSubtotal;

      if (!ivaIncluded) {
        totalIVA += productSubtotal * 0.19;
      }
    }
  });

  total = subtotal + totalIVA;

  return {
    totalQuantity: allUnitsConsistent ? totalQuantity : null,
    totalItems,
    unit: allUnitsConsistent ? firstUnit : null,
    subtotal,
    totalIVA,
    total,
    allUnitsConsistent,
  };
}

/**
 * Genera el nombre del archivo para descarga
 * @param {Object} document - Documento completo
 * @param {string} extension - Extensión del archivo (.xlsx o .pdf)
 * @returns {string} Nombre del archivo
 */
export function generateFileName(document, extension) {
  const code = document.code || "DOC";
  const type = document.type || "document";

  let entityName = "documento";

  if (type === "sale" && document.customer) {
    entityName = sanitizeFileName(document.customer.name);
  } else if (type === "purchase" && document.supplier) {
    entityName = sanitizeFileName(document.supplier.name);
  } else if (type === "return" && document.customer) {
    entityName = sanitizeFileName(document.customer.name);
  } else if (document.warehouse) {
    entityName = sanitizeFileName(document.warehouse.name);
  }

  const date = document.createdAt
    ? moment(document.createdAt).format("YYYY-MM-DD")
    : moment().format("YYYY-MM-DD");

  return `${code} - ${entityName} (${date})${extension}`;
}

/**
 * Sanitiza un texto para usar como nombre de archivo
 * @param {string} text - Texto a sanitizar
 * @returns {string} Texto sanitizado
 */
function sanitizeFileName(text) {
  return text
    .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 50);
}

/**
 * Obtiene las columnas para la tabla de packing list
 * @param {Object} options - Opciones de columnas
 * @returns {Array} Array de definiciones de columnas
 */
export function getPackingListColumns(options = {}) {
  const {
    includeLot = false,
    includeItemNumber = false,
    includeBarcode = false,
  } = options;

  const columns = [
    { header: "Producto", key: "producto" },
    { header: "Cantidad", key: "cantidad" },
    { header: "Unidad", key: "unidad" },
  ];

  if (includeLot) {
    columns.push({ header: "Lote", key: "lote" });
  }
  if (includeItemNumber) {
    columns.push({ header: "Número de Item", key: "numeroItem" });
  }
  if (includeBarcode) {
    columns.push({ header: "Código de Barras", key: "codigoBarras" });
  }

  return columns;
}

/**
 * Determina el título del documento según su tipo
 * @param {string} type - Tipo de documento
 * @returns {string} Título del documento
 */
export function getDocumentTitle(type) {
  const titles = {
    purchase: "Orden de Compra",
    sale: "Orden de Venta",
    return: "Orden de Devolución",
    transform: "Orden de Transformación",
    in: "Entrada de Inventario",
    out: "Salida de Inventario",
  };

  return titles[type] || "Documento";
}

/**
 * Transpone un array bidimensional (convierte filas en columnas y viceversa)
 * @param {Array} array - Array de arrays a transponer
 * @returns {Array} Array transpuesto
 */
export function transposeArray(array = []) {
  // Encuentra la longitud máxima entre las columnas
  const maxLength = Math.max(...array.map((col) => col.length));

  // Crea un array transpuesto
  const rows = Array.from(
    { length: maxLength },
    (_, index) => array.map((column) => column[index] || "") // Rellena con string vacío si no hay dato
  );

  return rows;
}

/**
 * Transforma un documento a la estructura de packingList para exportación con ExcelJS
 * Convierte productos en columnas y sus items en filas (estructura transpuesta)
 * @param {Object} document - Documento completo del sistema
 * @returns {Object} PackingList estructurado por producto
 */
export function transformToPackingListStructure(document) {
  const products = document.orderProducts || [];
  const packingList = {};

  products.forEach((product, index) => {
    const key = `product_${index}`;
    const productName = product.product?.name || product.name || "-";
    const items = product.items || [];
    const quantities = [];

    if (items.length > 0) {
      // Si hay items, usar sus cantidades
      items.forEach((item) => {
        const qty = Number(item.quantity || item.currentQuantity || 0);
        quantities.push(qty);
      });
    } else {
      // Si no hay items, usar requestedQuantity como única cantidad
      const qty = Number(product.requestedQuantity || 0);
      if (qty > 0) {
        quantities.push(qty);
      }
    }

    packingList[key] = {
      name: productName,
      quantities: quantities,
      unit: product.product?.unit || "und",
    };
  });

  return packingList;
}

/**
 * Genera un string descriptivo del total de unidades
 * @param {Object} packingList - PackingList estructurado
 * @param {boolean} includeSymbol - Si debe incluir el símbolo/nombre de la unidad
 * @returns {string} String descriptivo del total
 */
export function getTotalUnitString(packingList, includeSymbol = true) {
  const products = Object.values(packingList);

  if (products.length === 0) return "TOTAL";

  // Obtener la primera unidad
  const firstUnit = products[0]?.unit || "und";

  // Verificar si todas las unidades son iguales
  const allSameUnit = products.every((p) => p.unit === firstUnit);

  if (!allSameUnit) {
    return includeSymbol ? "TOTAL (unidades mixtas)" : "TOTAL";
  }

  // Mapeo de unidades a su forma plural
  const unitNames = {
    kg: includeSymbol ? "TOTAL KG" : "TOTAL",
    m: includeSymbol ? "TOTAL METROS" : "TOTAL",
    und: includeSymbol ? "TOTAL UNIDADES" : "TOTAL",
    pza: includeSymbol ? "TOTAL PIEZAS" : "TOTAL",
    lt: includeSymbol ? "TOTAL LITROS" : "TOTAL",
    caja: includeSymbol ? "TOTAL CAJAS" : "TOTAL",
    paq: includeSymbol ? "TOTAL PAQUETES" : "TOTAL",
  };

  return (
    unitNames[firstUnit] ||
    (includeSymbol ? `TOTAL ${firstUnit.toUpperCase()}` : "TOTAL")
  );
}

/**
 * Crea un resumen agrupado de items del packingList
 * Agrupa por producto y calcula totales
 * @param {Object} packingList - PackingList estructurado
 * @returns {Array} Array de objetos con resumen por producto
 */
export function getResumeItemsFromPackingList(packingList) {
  const products = Object.values(packingList);

  return products.map((product) => {
    const totalQuantity = product.quantities.reduce(
      (acc, q) => acc + Number(q || 0),
      0
    );
    const count = product.quantities.length; // Número de rollos/items

    return {
      name: product.name,
      totalQuantity: totalQuantity,
      count: count,
      unit: product.unit,
    };
  });
}
