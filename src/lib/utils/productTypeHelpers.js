/**
 * @fileoverview Product type constants and helpers.
 *
 * Products in Adatex come in three types that control how quantity is tracked:
 * - VARIABLE_QUANTITY: units with a lot number and item number (default)
 * - FIXED_QUANTITY: boxes/packages with a confirmed count, no per-item tracking
 * - CUT_ITEM: items cut to exact quantities (e.g. fabric)
 */

export const PRODUCT_TYPES = {
  VARIABLE_QUANTITY: "variableQuantityPerItem",
  FIXED_QUANTITY: "fixedQuantityPerItem",
  CUT_ITEM: "cutItem",
};

/**
 * Returns the product type, defaulting to VARIABLE_QUANTITY when absent.
 * @param {Object|null} product - Product object with optional `type` field.
 * @returns {string} One of the PRODUCT_TYPES values.
 */
export function getProductType(product) {
  return product?.type ?? PRODUCT_TYPES.VARIABLE_QUANTITY;
}

/**
 * Returns true if a product row has valid data for the given product type.
 * Used to determine whether an order is ready to be confirmed.
 *
 * @param {Object} orderProduct - An order-product row (with `product`, `items`, `confirmedQuantity`).
 * @returns {boolean}
 */
export function isProductRowValid(orderProduct) {
  const type = getProductType(orderProduct.product);

  if (type === PRODUCT_TYPES.FIXED_QUANTITY) {
    return Number(orderProduct.confirmedQuantity) > 0;
  }

  if (type === PRODUCT_TYPES.CUT_ITEM) {
    return (orderProduct.items || []).some(
      (i) => Number(i.currentQuantity ?? i.quantity) > 0,
    );
  }

  // VARIABLE_QUANTITY — needs at least one item with quantity, lot, and itemNumber
  const validItems = (orderProduct.items || []).filter((i) => {
    const qty = Number(i.currentQuantity);
    return (
      i.currentQuantity !== "" &&
      i.currentQuantity !== null &&
      i.currentQuantity !== undefined &&
      !isNaN(qty) &&
      qty !== 0
    );
  });
  return (
    validItems.length > 0 &&
    validItems.every(
      (i) =>
        Number(i.currentQuantity) > 0 &&
        i.lotNumber != null && i.lotNumber !== "" &&
        i.itemNumber != null && i.itemNumber !== "",
    )
  );
}

/**
 * Formats a single order-product row into the shape expected by the update API.
 *
 * @param {Object} orderProduct - The order-product row from local state.
 * @param {boolean} [forceNegativeStock=false] - Allow items with negative stock.
 * @returns {Object} Payload fragment for one product.
 */
export function formatProductForPayload(orderProduct, forceNegativeStock = false) {
  const type = getProductType(orderProduct.product);

  const base = {
    product: orderProduct.product?.id ?? orderProduct.product,
    requestedQuantity: Number(orderProduct.requestedQuantity) || 0,
    requestedPackages:
      orderProduct.requestedPackages != null
        ? parseInt(orderProduct.requestedPackages, 10) || 1
        : 1,
    price: Number(orderProduct.price) || 0,
    ivaIncluded: orderProduct.ivaIncluded || false,
    invoicePercentage: Number(orderProduct.invoicePercentage) || 0,
  };

  if (type === PRODUCT_TYPES.FIXED_QUANTITY) {
    const count = Number(orderProduct.confirmedQuantity) || 0;
    return { ...base, count, confirmedQuantity: count };
  }

  if (type === PRODUCT_TYPES.CUT_ITEM) {
    const validItems = (orderProduct.items || []).filter(
      (i) => Number(i.currentQuantity ?? i.quantity) > 0,
    );
    return {
      ...base,
      confirmedQuantity: validItems.reduce(
        (sum, i) => sum + (Number(i.currentQuantity ?? i.quantity) || 0),
        0,
      ),
      items: validItems.map((item) => {
        const payload = {
          quantity: Number(item.currentQuantity ?? item.quantity),
          requestedPackages: item.requestedPackages ? Number(item.requestedPackages) : 1,
          confirmNegativeStock: forceNegativeStock || item.confirmNegativeStock || false,
        };
        if (item.id && !String(item.id).includes("-")) payload.id = item.id;
        if (item.quantities) payload.quantities = item.quantities;
        return payload;
      }),
    };
  }

  // VARIABLE_QUANTITY
  const validItems = (orderProduct.items || []).filter((i) => {
    const qty = Number(i.currentQuantity);
    return (
      i.currentQuantity !== "" &&
      i.currentQuantity !== null &&
      i.currentQuantity !== undefined &&
      !isNaN(qty) &&
      qty !== 0
    );
  });
  return {
    ...base,
    confirmedQuantity: validItems.reduce(
      (sum, i) => sum + (Number(i.currentQuantity) || 0),
      0,
    ),
    items: validItems.map((item) => ({
      id: item.id && !String(item.id).includes("-") ? item.id : undefined,
      quantity: Number(item.currentQuantity),
      requestedPackages: item.requestedPackages ? Number(item.requestedPackages) : 1,
      lot: Number(item.lotNumber) || null,
      itemNumber: Number(item.itemNumber) || null,
    })),
  };
}
