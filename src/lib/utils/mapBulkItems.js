import { v4 } from "uuid";

const normalizeProduct = (product) => {
  if (!product) return null;
  const attributes = product.attributes || {};
  const merged = { ...attributes, ...product };
  return {
    id: merged.id,
    code: merged.code,
    name: merged.name,
    unit: merged.unit,
    barcode: merged.barcode,
  };
};

const findLocalProduct = (
  identifier,
  name,
  currentProducts = [],
  fetchedProducts = []
) => {
  const target = String(identifier || "").trim().toLowerCase();
  const candidates = [
    ...currentProducts.map((p) => p.product).filter(Boolean),
    ...fetchedProducts,
  ];

  return candidates.find((product) => {
    const productId = String(product?.id || "").trim().toLowerCase();
    const productCode = String(product?.code || "").trim().toLowerCase();
    const productName = String(product?.name || "").trim().toLowerCase();
    const matchIdOrCode =
      target && (productId === target || productCode === target);
    const matchName = name
      ? productName === String(name).trim().toLowerCase()
      : false;
    return matchIdOrCode || matchName;
  });
};

const fetchProductByIdentifier = async (identifier, name) => {
  try {
    const params = new URLSearchParams();
    if (identifier) {
      params.append("filters[$or][0][id][$eq]", identifier);
      params.append("filters[$or][1][code][$eq]", identifier);
    }
    if (name) {
      params.append("filters[$or][2][name][$eqi]", name);
    }
    params.append("pagination[pageSize]", "1");

    const response = await fetch(`/api/strapi/products?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const result = await response.json();
    const raw = Array.isArray(result?.data) ? result.data[0] : result?.data;
    return normalizeProduct(raw);
  } catch (error) {
    console.error("Error fetching product", error);
    return null;
  }
};

const createEmptyProductRow = () => ({
  id: v4(),
  key: v4(),
  name: "",
  quantity: "",
  price: "",
  product: null,
  total: "",
  ivaIncluded: false,
  invoicePercentage: 100,
  items: [
    {
      quantity: "",
      lotNumber: "",
      itemNumber: "",
      id: v4(),
      key: v4(),
    },
  ],
});

const dedupeProductsList = (products = [], { ensureEmptyRow = true } = {}) => {
  const map = new Map();
  const result = [];
  let emptyRow = null;

  products.forEach((row) => {
    if (!row?.product) {
      if (!emptyRow) emptyRow = row;
      return;
    }

    const productObj =
      typeof row.product === "object" ? row.product : { id: row.product };
    const key = String(productObj.id || productObj.code || "").toLowerCase();
    if (!key) {
      result.push(row);
      return;
    }

    if (!map.has(key)) {
      const copy = { ...row, items: [...(row.items || [])] };
      map.set(key, copy);
      result.push(copy);
    } else {
      const existing = map.get(key);
      existing.items = [
        ...(existing.items || []),
        ...(row.items || []),
      ].filter(Boolean);
      if (
        existing.requestedQuantity === undefined ||
        existing.requestedQuantity === null ||
        existing.requestedQuantity === ""
      ) {
        existing.requestedQuantity =
          row.requestedQuantity ?? row.quantity ?? existing.requestedQuantity;
      }
      if (
        existing.quantity === undefined ||
        existing.quantity === null ||
        existing.quantity === ""
      ) {
        existing.quantity = row.quantity ?? existing.quantity;
      }
      if (existing.price === undefined || existing.price === null) {
        existing.price = row.price ?? existing.price ?? 0;
      }
    }
  });

  if (emptyRow) {
    result.push(emptyRow);
  }

  if (ensureEmptyRow && !result.some((r) => !r.product)) {
    result.push(createEmptyProductRow());
  }

  return result;
};

/**
 * Mapea items cargados en bulk a la estructura de productos del DocumentDetail,
 * resolviendo productos existentes (local o API) y evitando duplicados.
 */
export async function mapBulkItems({
  items = [],
  currentProducts = [],
  fetchedProducts = [],
  setProducts,
  toast,
  ensureEmptyRow = true,
}) {
  if (!Array.isArray(items) || items.length === 0) return;

  const invalid = items.some(
    (item) => !item.quantity || (!item.productId && !item.name)
  );
  if (invalid) {
    toast?.error?.("El formato del archivo no es válido");
    return;
  }

  const groupedItems = items.reduce((acc, item) => {
    const identifier =
      item.productId || item.name || item.code || item["CODE"] || null;
    const key = String(identifier || "").trim().toLowerCase();
    if (!key) return acc;
    const entry = acc.get(key) || {
      identifier: key,
      name: item.name,
      items: [],
    };
    entry.items.push(item);
    acc.set(key, entry);
    return acc;
  }, new Map());

  const matchedProductsMap = new Map();
  const missingProducts = [];

  for (const entry of groupedItems.values()) {
    const localProduct =
      findLocalProduct(
        entry.identifier,
        entry.name,
        currentProducts,
        fetchedProducts
      ) || (await fetchProductByIdentifier(entry.identifier, entry.name));

    if (!localProduct) {
      missingProducts.push(entry.identifier || entry.name || "-");
      continue;
    }

    const productKey = String(localProduct.id || localProduct.code);
    const existing = matchedProductsMap.get(productKey);
    if (existing) {
      existing.items.push(...entry.items);
    } else {
      matchedProductsMap.set(productKey, {
        product: localProduct,
        items: [...entry.items],
      });
    }
  }

  const matchedProducts = Array.from(matchedProductsMap.values());

  if (matchedProducts.length === 0) {
    toast?.error?.("No se pudieron asociar los items con productos existentes");
    return;
  }

  setProducts?.((current = []) => {
    const nextProducts = [...current];

    matchedProducts.forEach(({ product, items: productItems }) => {
      const totalQuantity = productItems.reduce(
        (acc, item) => acc + Number(item.quantity || 0),
        0
      );
      const itemsWithKeys = productItems.map((item) => ({
        ...item,
        productId: product.id,
        id: v4(),
        key: v4(),
      }));

      const existingIndex = nextProducts.findIndex((p) => {
        const currentId =
          typeof p.product === "object" ? p.product?.id : p.product ?? null;
        const currentCode =
          typeof p.product === "object" ? p.product?.code : null;
        return (
          currentId == product.id ||
          currentCode == product.code ||
          currentId == product.code
        );
      });

      if (existingIndex !== -1) {
        const existing = nextProducts[existingIndex];
        nextProducts[existingIndex] = {
          ...existing,
          product,
          requestedQuantity:
            existing.requestedQuantity ||
            existing.quantity ||
            totalQuantity,
          quantity: existing.quantity || totalQuantity,
          items: itemsWithKeys,
        };
      } else {
        const insertIndex = nextProducts.findIndex((p) => !p.product);
        const newRow = {
          id: v4(),
          key: v4(),
          product,
          name: product.name,
          quantity: totalQuantity,
          requestedQuantity: totalQuantity,
          price: 0,
          ivaIncluded: false,
          invoicePercentage: 100,
          items: itemsWithKeys,
        };
        if (insertIndex === -1) {
          nextProducts.push(newRow);
        } else {
          nextProducts.splice(insertIndex, 0, newRow);
        }
      }
    });

    return dedupeProductsList(nextProducts, { ensureEmptyRow });
  });

  if (missingProducts.length) {
    toast?.error?.(`No se encontraron productos: ${missingProducts.join(", ")}`);
  }

  const totalItems = matchedProducts.reduce(
    (acc, entry) => acc + entry.items.length,
    0
  );
  toast?.success?.(`Se han añadido ${totalItems} items a la orden`);
}
