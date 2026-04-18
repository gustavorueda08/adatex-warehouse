/**
 * Loads missing items from the server for all orderProducts before export.
 *
 * Items are intentionally omitted from the initial order fetch to avoid ECONNRESET
 * with 50k-item fixedQuantityPerItem orders. For export we need the real item list
 * (barcode, lotNumber, itemNumber, currentQuantity per row), so we fetch them here
 * on demand — but only for variableQuantityPerItem products where the item count is
 * manageable and the per-item detail is meaningful in the exported document.
 *
 * fixedQuantityPerItem products are skipped: they can have 50k+ items (one per unit),
 * which would make unusable PDFs/Excel files. The export helpers already fall back to
 * confirmedQuantity / confirmedPackages scalars for those products.
 */

const ITEM_FIELDS = [
  "id",
  "currentQuantity",
  "lotNumber",
  "itemNumber",
  "barcode",
];
const PAGE_SIZE = 100;

async function fetchItemsForOrderProduct(orderProductId) {
  let allItems = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams();
    params.append("filters[orderProducts][id][$eq]", String(orderProductId));
    params.append("pagination[page]", String(page));
    params.append("pagination[pageSize]", String(PAGE_SIZE));
    ITEM_FIELDS.forEach((field, i) => params.append(`fields[${i}]`, field));

    const res = await fetch(`/api/strapi/items?${params}`);
    if (!res.ok) break;

    const json = await res.json();
    allItems = [...allItems, ...(json.data || [])];
    totalPages = json.meta?.pagination?.pageCount ?? 1;
    page++;
  } while (page <= totalPages);

  return allItems;
}

/**
 * Returns a copy of `document` where every variableQuantityPerItem orderProduct
 * whose items are not yet loaded has them fetched from the server.
 *
 * - Already-loaded items are preserved as-is.
 * - fixedQuantityPerItem products are skipped (scalar fallback in export helpers).
 * - Fetch errors are swallowed; the product keeps its scalar data.
 *
 * @param {Object} document - The full order document from state
 * @returns {Promise<Object>} Document copy with items populated for export
 */
export async function enrichDocumentWithItems(document) {
  if (!document?.orderProducts?.length) return document;

  const enrichedOrderProducts = await Promise.all(
    document.orderProducts.map(async (op) => {
      // Already loaded — nothing to do
      if (op.items && op.items.length > 0) return op;

      // fixedQuantityPerItem: too many items to export per-row; skip
      if (op.product?.type === "fixedQuantityPerItem") return op;

      // Ghost / incomplete row — skip
      if (!op.id || !op.product) return op;

      try {
        const items = await fetchItemsForOrderProduct(op.id);
        return { ...op, items };
      } catch {
        // On error fall back to scalar data (confirmedQuantity / confirmedPackages)
        return op;
      }
    }),
  );

  return { ...document, orderProducts: enrichedOrderProducts };
}
