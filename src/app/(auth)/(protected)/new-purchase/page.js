"use client";

import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";
import { useOrders } from "@/lib/hooks/useOrders";
import { useProducts } from "@/lib/hooks/useProducts";
import { TrashIcon } from "@heroicons/react/24/solid";
import { useState } from "react";

export default function NewPurchase() {
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const { products: productsData = [] } = useProducts({});

  const { createOrder, orders } = useOrders({}, {});
  const [products, setProducts] = useState([
    { barcode: "", name: "", quantity: "", product: null, key: 1 },
  ]);

  const handleDeleteProductRow = (index) => {
    const updatedProducts = products.filter((_, i) => i !== index);
    if (
      updatedProducts.length === 0 ||
      (updatedProducts.length > 0 && updatedProducts.at(-1).product === null)
    ) {
      updatedProducts.push({
        barcode: "",
        name: "",
        quantity: "",
        product: null,
      });
    }
    setProducts(updatedProducts);
  };

  const handleSetQuantity = (input, index) => {
    const updatedProducts = products.map((product, i) => {
      const updatedProduct = product;
      if (index === i) {
        updatedProduct.quantity = input;
      }
      return updatedProduct;
    });
    if (updatedProducts.at(-1).product) {
      updatedProducts.push({});
    }
    setProducts(updatedProducts);
  };

  const handleSetBarcode = (input, index) => {
    setProducts(
      products.map((product, i) => {
        const updatedProduct = product;
        if (index === i) {
          updatedProduct.barcode = input;
        }
        return updatedProduct;
      })
    );
  };

  const handleAddItem = async (index) => {
    const product = products[index];
    const itemData = {
      name: product.name,
      barcode: product.barcode,
      quantity: Number(product.quantity),
    };
    const orderProduct = {};
  };

  const productColumns = [
    {
      key: "name",
      label: "Producto",
      render: (name, _, index) => (
        <Select
          className="min-w-96"
          options={productsData.map((p) => ({ label: p.name, value: p }))}
          onChange={(selectedProduct) => {
            const updatedProducts = products.map((product, i) => {
              const updatedProduct = product;
              if (i === index) {
                product.product = selectedProduct;
              }
              return updatedProduct;
            });

            if (updatedProducts.at(-1).product) {
              updatedProducts.push({});
            }
            setProducts(updatedProducts);
          }}
          value={products[index].product}
          searchable
        />
      ),
    },
    {
      key: "quantity",
      label: "Cantidad requerida",
      render: (_, __, index) => (
        <div className="flex justify-start ">
          <Input
            className="!min-w-1"
            placeHolder="Cantidad"
            input={products[index].quantity}
            setInput={(input) => handleSetQuantity(input, index)}
          />
        </div>
      ),
    },
    {
      key: "id",
      label: "Unidad",
      render: (_, __, index) => {
        const product = products[index].product;
        if (product) {
          return <div className="flex justify-start ">{product.unit}</div>;
        }
        return <div />;
      },
    },
    {
      key: "key",
      label: "-",
      render: (_, __, index) => {
        return (
          <IconButton
            variant="red"
            onClick={() => handleDeleteProductRow(index)}
          >
            <TrashIcon className="w-5 h-5 self-center" />
          </IconButton>
        );
      },
    },
  ];

  return (
    <div>
      <h1 className="font-bold text-2xl py-4">Nueva Órden de Compra</h1>
      {/*
       <div className="py-2 flex flex-col gap-2 pb-4 max-w-96">
        <h3 className="text-xl font-bold">Escaneo de código de barras</h3>
        <Input placeHolder="Escanea o escribe aquí el cógido de barras del producto" />
      </div>
      */}
      <div className="max-w-4/5">
        <h5 className="font-bold text-lg pb-2">Requerimientos</h5>
        <Table columns={productColumns} data={products} />
        <Button variant="emerald">Crear</Button>
      </div>
    </div>
  );
}
