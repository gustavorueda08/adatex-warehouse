"use client";

import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import DragAndDrop from "@/components/ui/DragAndDrop";
import IconButton from "@/components/ui/IconButton";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";
import { useOrders } from "@/lib/hooks/useOrders";
import { useProducts } from "@/lib/hooks/useProducts";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { convertCode } from "@/lib/utils/convertCode";
import format from "@/lib/utils/format";
import formatProductName from "@/lib/utils/formatProductName";
import unitsAreConsistent from "@/lib/utils/unitsConsistency";
import { ChevronDoubleUpIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import moment from "moment-timezone";
import React, {
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  memo,
} from "react";
import { v4 } from "uuid";

// ⚡ OPTIMIZACIÓN: Componente memoizado para cada ítem de packing list
const PackingListItemRow = memo(({ item, productId, updateItemField }) => {
  const handleQuantityChange = useCallback(
    (value) => {
      updateItemField(productId, item.id, "quantity", value);
    },
    [productId, item.id, updateItemField]
  );

  const handleLotNumberChange = useCallback(
    (value) => {
      updateItemField(productId, item.id, "lotNumber", value);
    },
    [productId, item.id, updateItemField]
  );

  const handleItemNumberChange = useCallback(
    (value) => {
      updateItemField(productId, item.id, "itemNumber", value);
    },
    [productId, item.id, updateItemField]
  );

  return {
    quantity: item.quantity,
    lotNumber: item.lotNumber,
    itemNumber: item.itemNumber,
    _callbacks: {
      handleQuantityChange,
      handleLotNumberChange,
      handleItemNumberChange,
    },
  };
});

PackingListItemRow.displayName = "PackingListItemRow";

// ⚡ OPTIMIZACIÓN: Componente memoizado para cada producto expandible
const PackingListProduct = memo(
  ({
    product,
    productIndex,
    isExpanded,
    onToggle,
    updateItemField,
    handleDeleteItemRow,
  }) => {
    // Memoizar las columnas específicas de este producto
    const columns = useMemo(
      () => [
        {
          key: "quantity",
          label: "Cantidad",
          render: (_, row) => (
            <Input
              placeholder="Cantidad"
              input={row.quantity}
              setInput={(value) =>
                updateItemField(product.id, row.id, "quantity", value)
              }
            />
          ),
        },
        {
          key: "lotNumber",
          label: "Lote",
          render: (_, row) => (
            <Input
              placeholder="Numero de Lote"
              input={row.lotNumber}
              setInput={(value) =>
                updateItemField(product.id, row.id, "lotNumber", value)
              }
            />
          ),
        },
        {
          key: "itemNumber",
          label: "Numero de Item",
          render: (_, row) => (
            <Input
              placeholder="Numero de Item"
              input={row.itemNumber}
              setInput={(value) =>
                updateItemField(product.id, row.id, "itemNumber", value)
              }
            />
          ),
        },
      ],
      [product.id, updateItemField]
    );

    const handleDelete = useCallback(
      (id, itemIndex) => {
        handleDeleteItemRow(productIndex, itemIndex);
      },
      [productIndex, handleDeleteItemRow]
    );

    return (
      <div
        className="rounded-md flex flex-col justify-center align-middle gap-3"
        key={`PAKING_LIST-${product.id}`}
      >
        <div
          onClick={onToggle}
          className="flex flex-row justify-between align-middle bg-zinc-800 rounded-md px-2 py-3 hover:bg-zinc-700 transition-colors cursor-pointer"
        >
          <h4 className="text-sm self-center">
            {product?.product?.name || ""}
          </h4>
          <IconButton onClick={onToggle}>
            <ChevronUpIcon
              className={`w-5 h-5 ${
                isExpanded ? "rotate-180" : ""
              } transition-all ease-in delay-75`}
            />
          </IconButton>
        </div>
        {isExpanded && (
          <Table
            columns={columns}
            data={product.items}
            getRowId={(row) => row.id}
            canDeleteRow={() => true}
            onRowDelete={handleDelete}
            canSelectRow={() => true}
            onRowEdit={() => true}
          />
        )}
      </div>
    );
  }
);

PackingListProduct.displayName = "PackingListProduct";

export default function PurchaseDetailPage({ params }) {
  const { id } = use(params);
  const { orders, updateOrder } = useOrders(
    {
      filters: {
        id: [id],
      },
      populate: [
        "orderProducts",
        "orderProducts.product",
        "orderProducts.items",
        "supplier",
        "destinationWarehouse",
      ],
    },
    {}
  );
  const order = orders[0] || null;
  const [dateCreated, setDateCreated] = useState(
    moment().tz("America/Bogota").toDate()
  );
  const { warehouses } = useWarehouses({});
  const { products: productsData = [] } = useProducts({});
  const [currency, setCurrency] = useState("$");
  const { suppliers } = useSuppliers({
    populate: ["prices", "prices.product"],
  });
  const [code, setCode] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [products, setProducts] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    if (order) {
      setProducts(
        order.orderProducts.map((op) => ({
          id: op.id,
          quantity: op.requestedQuantity,
          packages: op.requestedPackages,
          unit: op.product.unit,
          price: op.price,
          product: op.product,
          items:
            Array.isArray(op.items) && op.items.length > 0
              ? op.items.map((item) => ({
                  ...item,
                  key: v4(),
                  quantity: item.currentQuantity,
                }))
              : [
                  {
                    quantity: "",
                    lotNumber: "",
                    itemNumber: "",
                    id: v4(),
                    key: v4(),
                  },
                ],
        }))
      );
      setCode(order.containerCode || order.code);
      setSelectedSupplier(order.supplier);
      setSelectedWarehouse(order.destinationWarehouse);
    }
  }, [order]);

  const getAvailableProductsForRow = useCallback(
    (currentIndex) => {
      const selectedProductIds = products
        .map((p, idx) =>
          idx !== currentIndex && p.product ? p.product.id : null
        )
        .filter((id) => id !== null);

      return productsData.filter((p) => !selectedProductIds.includes(p.id));
    },
    [products, productsData]
  );

  const handleDeleteProductRow = useCallback((index) => {
    setProducts((currentProducts) => {
      const updatedProducts = currentProducts.filter((_, i) => i !== index);
      if (
        updatedProducts.length === 0 ||
        (updatedProducts.length > 0 && updatedProducts.at(-1).product !== null)
      ) {
        updatedProducts.push({
          id: v4(),
          name: "",
          quantity: "",
          price: "",
          product: null,
          key: `${v4()}-1`,
          total: "",
        });
      }
      return updatedProducts;
    });
  }, []);

  const handleDeleteItemRow = useCallback((productIndex, itemIndex) => {
    setProducts((currentProducts) => {
      const updatedProducts = [...currentProducts];
      const product = updatedProducts[productIndex];
      const items = product.items.filter((_, iIndex) => itemIndex !== iIndex);

      updatedProducts[productIndex] = {
        ...product,
        items:
          items.length === 0
            ? [
                {
                  quantity: "",
                  lotNumber: "",
                  itemNumber: "",
                  id: v4(),
                  key: v4(),
                },
              ]
            : items,
      };

      return updatedProducts;
    });
  }, []);

  const updateProductField = useCallback((productId, field, value) => {
    setProducts((currentProducts) => {
      return currentProducts.map((product) => {
        if (product.id !== productId) return product;

        const updatedProduct = { ...product, [field]: value };
        updatedProduct.total =
          Number(updatedProduct.price) * Number(updatedProduct.quantity);
        return updatedProduct;
      });
    });
  }, []);

  // ⚡ OPTIMIZACIÓN CRÍTICA: Actualizar solo el producto específico
  const updateItemField = useCallback((productId, itemId, field, value) => {
    setProducts((currentProducts) => {
      // Encontrar el índice del producto
      const productIndex = currentProducts.findIndex((p) => p.id === productId);
      if (productIndex === -1) return currentProducts;

      const product = currentProducts[productIndex];

      // Actualizar solo el item específico
      const updatedItems = product.items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      );

      // Solo agregar nueva fila si la última tiene contenido
      const lastItem = updatedItems[updatedItems.length - 1];
      if (lastItem?.quantity !== "") {
        updatedItems.push({
          quantity: "",
          lotNumber: "",
          itemNumber: "",
          id: v4(),
          key: v4(),
        });
      }

      // Crear nuevo array con solo el producto modificado
      const newProducts = [...currentProducts];
      newProducts[productIndex] = { ...product, items: updatedItems };

      return newProducts;
    });
  }, []);

  const handleProductSelect = useCallback(
    (selectedProduct, index) => {
      setProducts((currentProducts) => {
        const updatedProducts = currentProducts.map((product, i) => {
          if (i !== index) return product;

          const updated = { ...product, product: selectedProduct };

          if (selectedSupplier?.prices) {
            const price = selectedSupplier.prices.find(
              (p) => p.product.id === selectedProduct.id
            );
            updated.price = price ? String(price.unitPrice) : "";
          }

          updated.total = Number(updated.price) * Number(updated.quantity);
          return updated;
        });

        if (updatedProducts[updatedProducts.length - 1]?.product) {
          updatedProducts.push({
            id: v4(),
            name: "",
            quantity: "",
            price: "",
            product: null,
            key: `${v4()}-1`,
          });
        }

        return updatedProducts;
      });
    },
    [selectedSupplier]
  );

  const handleSetProductItemsFromFile = useCallback((data) => {
    if (!Array.isArray(data)) return;

    const items = data.map((item) => ({
      productId: item["id"] || item["ID"] || null,
      name: item["NOMBRE"] || null,
      quantity: Number(item["CANTIDAD"]) || null,
      lotNumber: Number(item["LOTE"]),
      itemNumber: Number(item["NUMERO"]),
    }));

    setProducts((currentProducts) => {
      return currentProducts.map((product) => {
        const productItems = items
          .filter(
            (item) =>
              item?.productId == product.product?.id ||
              item.name == product.product?.name
          )
          .map((item) => ({ ...item, id: v4(), key: v4() }));

        return productItems.length > 0
          ? { ...product, items: productItems }
          : product;
      });
    });
  }, []);

  const productColumns = useMemo(
    () => [
      {
        key: "name",
        label: "Producto",
        render: (name, row, index) => {
          const currentProduct = row.product;
          const availableProducts = getAvailableProductsForRow(index);
          const selectOptions = currentProduct
            ? [
                { label: currentProduct.name, value: currentProduct },
                ...availableProducts
                  .filter((p) => p.id !== currentProduct.id)
                  .map((p) => ({ label: p.name, value: p })),
              ]
            : availableProducts.map((p) => ({ label: p.name, value: p }));
          return (
            <>
              <div className="md:hidden">
                <Select
                  size="sm"
                  options={selectOptions}
                  value={currentProduct ? currentProduct : null}
                  onChange={(selectedProduct) =>
                    handleProductSelect(selectedProduct, index)
                  }
                  searchable
                />
              </div>
              <div className="hidden md:block">
                <Select
                  className="md:min-w-80"
                  size="md"
                  options={selectOptions}
                  value={currentProduct ? currentProduct : null}
                  onChange={(selectedProduct) =>
                    handleProductSelect(selectedProduct, index)
                  }
                  searchable
                />
              </div>
            </>
          );
        },
        footer: "Total",
      },
      {
        key: "price",
        label: "Precio",
        render: (_, row) => (
          <Input
            input={row.price}
            setInput={(value) => updateProductField(row.id, "price", value)}
            placeholder="$"
            className="md:max-w-28"
          />
        ),
        footer: "-",
      },
      {
        key: "quantity",
        label: "Cantidad requerida",
        render: (_, row) => (
          <Input
            input={row.quantity}
            setInput={(value) => updateProductField(row.id, "quantity", value)}
            placeholder="Cantidad"
            className="md:max-w-28"
          />
        ),
        footer: (data) =>
          unitsAreConsistent(
            data
              .filter((d) => d.product)
              .map((p) => ({ unit: p?.product?.unit }))
          )
            ? format(data.reduce((acc, d) => acc + Number(d.quantity), 0))
            : "-",
      },
      {
        key: "packages",
        label: "Items requeridos",
        render: (_, row) => (
          <p className="flex justify-start">
            {format(
              Math.round(row.quantity / row.product?.unitsPerPackage) || 0
            ) || "-"}
          </p>
        ),
        footer: (data) =>
          format(
            data.reduce(
              (acc, d) =>
                acc +
                Number(
                  Math.round(d.quantity / (d.product?.unitsPerPackage || 1))
                ),
              0
            )
          ),
      },
      {
        key: "items",
        label: "Cantidad confirmada",
        render: (_, row) => {
          const total = row.items.reduce(
            (acc, item) => acc + Number(item.quantity || 0),
            0
          );
          return <p>{format(total) || "-"}</p>;
        },
        footer: (data) => {
          const hasConsistentUnits = unitsAreConsistent(
            data
              .filter((d) => d.product)
              .map((p) => ({ unit: p?.product?.unit }))
          );

          if (!hasConsistentUnits) return "-";

          const total = data
            .flatMap((p) => p.items)
            .reduce((acc, item) => acc + Number(item.quantity || 0), 0);

          return format(total) || "-";
        },
      },
      {
        key: "itemsConfirmed",
        label: "Items Confirmados",
        render: (_, row) => {
          const count = row.items.reduce(
            (acc, i) => acc + (i.quantity > 0 ? 1 : 0),
            0
          );
          return format(count) || "-";
        },
        footer: (data) => {
          const total = data.reduce(
            (acc, p) =>
              acc +
              p.items.reduce((acc2, i) => acc2 + (i.quantity > 0 ? 1 : 0), 0),
            0
          );
          return format(total) || "-";
        },
      },
      {
        key: "unit",
        label: "Unidad",
        render: (_, row) => (
          <p className="flex justify-start">{row?.product?.unit || "-"}</p>
        ),
        footer: "-",
      },
      {
        key: "total",
        label: "Total",
        render: (_, row) => {
          const total = row.items.reduce(
            (acc, item) =>
              acc + Number(item.quantity || 0) * Number(row.price || 0),
            0
          );
          return (
            <p className="flex justify-start md:min-w-28">
              {format(total, "$") || "-"}
            </p>
          );
        },
        footer: (data) => {
          const total = data.reduce((acc, p) => {
            const itemsTotal = p.items.reduce(
              (sum, item) => sum + Number(item.quantity || 0),
              0
            );
            return acc + Number(p.price || 0) * itemsTotal;
          }, 0);
          return (
            <h3 className="font-bold">{format(total, currency) || "-"}</h3>
          );
        },
      },
    ],
    [
      getAvailableProductsForRow,
      handleProductSelect,
      updateProductField,
      currency,
    ]
  );

  const handleUpdateOrder = () => {
    try {
      updateOrder(order.id, {
        products: products.map((product) => ({
          product: product.product.id,
          items: product.items
            .filter(
              (item) => typeof item.quantity === "number" && item.quantity !== 0
            )
            .map(({ productId, id, key, name, lotNumber, ...item }) => ({
              ...item,
              containerCode: convertCode(order.containerCode),
              lot: lotNumber,
            })),
        })),
        state: "confirmed",
      });
    } catch (error) {
      alert(error.message);
    }
  };

  const toggleExpanded = useCallback((productId) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  return (
    <div>
      <h1 className="font-bold text-3xl py-4">{`${order?.code || ""} ${
        order?.containerCode ? ` | ${order.containerCode}` : ""
      }`}</h1>
      <div className="w-full md:flex md:flex-row md:gap-3">
        <div className="flex flex-col md:flex-1/2 gap-1">
          <h2 className="font-medium">Codigo de la orden</h2>
          <Input
            type="text"
            placeholder="Código"
            input={code}
            setInput={setCode}
          />
        </div>
        <div className="flex flex-col md:flex-1/2 gap-1 mt-3 md:mt-0">
          <h2 className="font-medium">Proveedor</h2>
          <Select
            options={suppliers.map((s) => ({ label: s.name, value: s.id }))}
            searchable
            onChange={(selectedId) => {
              const supplier = suppliers.find((s) => s.id === selectedId);
              setSelectedSupplier(supplier);
            }}
            value={selectedSupplier?.id}
            size="md"
          />
        </div>
      </div>
      <div className="w-full md:flex md:flex-row md:gap-3 mt-3">
        <div className="flex flex-col md:flex-1/2 gap-1">
          <h2 className="font-medium">Fecha de Creación</h2>
          <DatePicker
            mode="single"
            value={dateCreated}
            onChange={(date) => setDateCreated(date)}
          />
        </div>
        <div className="flex flex-col md:flex-1/2 gap-1 mt-3 md:mt-0">
          <h2 className="font-medium">Destino</h2>
          <Select
            options={warehouses.map((s) => ({ label: s.name, value: s.id }))}
            searchable
            onChange={(selectedId) => {
              const warehouse = warehouses.find((s) => s.id === selectedId);
              setSelectedWarehouse(warehouse);
            }}
            value={selectedWarehouse?.id}
          />
        </div>
      </div>
      <div className="block w-full pt-4 md:hidden">
        <Button
          className="w-full"
          variant="emerald"
          disabled={
            !selectedSupplier ||
            !selectedWarehouse ||
            products.length === 0 ||
            !dateCreated ||
            products.some(
              (p) =>
                (p.product && p.quantity === 0) ||
                (p.product && p.quantity === "")
            ) ||
            (products.length === 1 && products.some((p) => !p.product))
          }
        >
          Crear
        </Button>
      </div>
      <div className="py-4">
        <h3 className="text-xl pb-2">Productos</h3>
        <Table
          columns={productColumns}
          data={products}
          mobileBlock
          getRowId={(row) => row.id}
          canDeleteRow={() => true}
          onRowDelete={(id, index) => handleDeleteProductRow(index)}
          canSelectRow={() => true}
          onRowEdit={() => true}
        />
      </div>
      <h3 className="text-xl pb-2">Lista de empaque por producto</h3>
      <div className="p-4 bg-zinc-600 rounded-md flex flex-col gap-3">
        {products.map((product, productIndex) => (
          <PackingListProduct
            key={product.id}
            product={product}
            productIndex={productIndex}
            isExpanded={expandedRows.has(product.id)}
            onToggle={() => toggleExpanded(product.id)}
            updateItemField={updateItemField}
            handleDeleteItemRow={handleDeleteItemRow}
          />
        ))}
      </div>
      <div className="py-4 flex flex-col gap-3">
        <h3 className="text-xl font-bold">Carga de lista de empaque masiva</h3>
        <DragAndDrop onDataLoaded={handleSetProductItemsFromFile} />
      </div>
      <div>
        <Button onClick={handleUpdateOrder}>Actualizar</Button>
      </div>
    </div>
  );
}
