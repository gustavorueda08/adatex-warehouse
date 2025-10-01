"use client";

import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import IconButton from "@/components/ui/IconButton";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";
import { useOrders } from "@/lib/hooks/useOrders";
import { useProducts } from "@/lib/hooks/useProducts";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import format from "@/lib/utils/format";
import { ORDER_TYPES } from "@/lib/utils/orderTypes";
import unitsAreConsistent from "@/lib/utils/unitsConsistency";
import { TrashIcon } from "@heroicons/react/24/solid";
import moment from "moment-timezone";
import { useRouter } from "next/navigation";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { v4 } from "uuid";

export default function NewPurchase() {
  const router = useRouter();
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const { products: productsData = [] } = useProducts({});

  const { createOrder, creating } = useOrders(
    {},
    {
      enabled: false,
      onCreate: (createdOrder) => {
        console.log("Orden creada exitosamente:", createdOrder);
        router.push(`/purchases/${createdOrder.id}`);
      },
    }
  );
  const [dateCreated, setDateCreated] = useState(
    moment().tz("America/Bogota").toDate()
  );
  const { warehouses } = useWarehouses({});
  const [currency, setCurrency] = useState("$");
  const { suppliers } = useSuppliers({
    populate: ["prices", "prices.product"],
  });
  const [code, setCode] = useState("");
  const [products, setProducts] = useState([
    {
      id: v4(),
      name: "",
      quantity: "",
      price: "",
      product: null,
      key: v4(),
      total: "",
    },
  ]);

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

  const updateProductField = useCallback((productId, field, value) => {
    setProducts((currentProducts) => {
      const updatedProducts = currentProducts.map((product) => {
        const updatedProduct =
          product.id === productId ? { ...product, [field]: value } : product;
        updatedProduct.total =
          Number(updatedProduct.price) * Number(updatedProduct.quantity);
        return updatedProduct;
      });
      return updatedProducts;
    });
  }, []);

  const handleProductSelect = useCallback(
    (selectedProduct, index) => {
      setProducts((currentProducts) => {
        const updatedProducts = currentProducts.map((product, i) => {
          if (i === index) {
            const updated = { ...product, product: selectedProduct };
            if (selectedSupplier && selectedSupplier?.prices) {
              const price = selectedSupplier.prices.find(
                (p) => p.product.id === selectedProduct.id
              );
              updated.price = price ? String(price.unitPrice) : "";
            }
            updated.total = Number(updated.price) * Number(updated.quantity);
            return updated;
          }
          return product;
        });

        if (updatedProducts.at(-1).product) {
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

  const handleCreateOrder = async () => {
    const data = {
      type: ORDER_TYPES.PURCHASE,
      products: products
        .filter((product) => product.product)
        .map((product) => ({
          requestedQuantity: Number(product.quantity),
          product: product.product.id,
          price: Number(product.price),
          name: product.name,
        })),
      destinationWarehouse: selectedWarehouse.id,
      supplier: selectedSupplier.id,
      createdDate: dateCreated,
      containerCode: code,
    };
    createOrder(data);
  };

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
              {/* Select para móvil - size sm */}
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

              {/* Select para desktop - size md */}
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
        key: "id",
        label: "Unidad",
        render: (_, row) => (
          <p className="flex justify-start">{row?.product?.unit || "-"}</p>
        ),
        footer: "-",
      },
      {
        key: "total",
        label: "Total",
        render: (_, row) => (
          <p className="flex justify-start md:min-w-28">
            {format(row?.total || "", "$") || "-"}
          </p>
        ),
        footer: (data) => (
          <h3 className="font-bold">
            {format(
              data.reduce((acc, d) => acc + Number(d.total), 0) || "",
              currency
            ) || "-"}
          </h3>
        ),
      },
    ],
    [
      getAvailableProductsForRow,
      handleProductSelect,
      updateProductField,
      handleDeleteProductRow,
    ]
  );

  return (
    <div>
      <h1 className="font-bold text-3xl py-4">Nueva órden de compra</h1>
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
            options={suppliers.map((s) => ({ label: s.name, value: s }))}
            searchable
            onChange={(s) => setSelectedSupplier(s)}
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
            options={warehouses.map((s) => ({ label: s.name, value: s }))}
            searchable
            onChange={(s) => setSelectedWarehouse(s)}
          />
        </div>
      </div>
      <div className="block w-full pt-4 md:hidden">
        <Button
          className="w-full"
          variant="emerald"
          onClick={handleCreateOrder}
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
          loading={creating}
        >
          Crear
        </Button>
      </div>
      <div className="py-4">
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
      <div className="hidden w-full pt-4 md:block">
        <Button
          variant="emerald"
          onClick={handleCreateOrder}
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
          loading={creating}
        >
          Crear
        </Button>
      </div>
    </div>
  );
}
