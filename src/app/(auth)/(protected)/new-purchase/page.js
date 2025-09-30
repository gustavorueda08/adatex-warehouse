"use client";

import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";
import { useOrders } from "@/lib/hooks/useOrders";
import { useProducts } from "@/lib/hooks/useProducts";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { TrashIcon } from "@heroicons/react/24/solid";
import { useEffect, useMemo, useState } from "react";
import { v4 } from "uuid";

export default function NewPurchase() {
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const { products: productsData = [] } = useProducts({});
  const { createOrder, orders } = useOrders({}, {});
  const { suppliers } = useSuppliers({
    populate: ["prices", "prices.product"],
  });
  const [availableProducts, setAvailableProducts] = useState([]);
  const [products, setProducts] = useState([
    { id: v4(), name: "", quantity: "", price: 0, product: null, key: 1 },
  ]);

  const handleDeleteProductRow = (index) => {
    const updatedProducts = products.filter((_, i) => i !== index);
    if (
      updatedProducts.length === 0 ||
      (updatedProducts.length > 0 && updatedProducts.at(-1).product === null)
    ) {
      updatedProducts.push({
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

  const handleSetPrice = (input, index) => {
    const updatedProducts = products.map((product, i) => {
      const updatedProduct = product;
      if (index === i) {
        updatedProduct.price = input;
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

  useEffect(() => {
    setAvailableProducts(productsData);
    const selectedProducts = products.map((p) => p.product);
    const availableProducts = productsData.filter(
      (product) =>
        !selectedProducts.some((selected) => selected.id === product.id)
    );
    setAvailableProducts(availableProducts);
  }, [products]);

  const productColumns = [
    {
      key: "name",
      label: "Producto",
      render: (name, _, index) => (
        <Select
          className="md:min-w-96"
          options={availableProducts.map((p) => ({ label: p.name, value: p }))}
          onChange={(selectedProduct) => {
            const updatedProducts = products.map((product, i) => {
              const updatedProduct = product;
              if (i === index) {
                product.product = selectedProduct;
                if (selectedSupplier && selectedSupplier?.prices) {
                  const price = selectedSupplier.prices.find(
                    (p) => p.product.id === selectedProduct.id
                  );
                  product.price = price ? price.unitPrice : 0;
                }
              }
              return updatedProduct;
            });

            if (updatedProducts.at(-1).product) {
              updatedProducts.push({ id: v4() });
            }
            setProducts(updatedProducts);
          }}
          value={products[index].product}
          searchable
        />
      ),
    },
    {
      key: "price",
      label: "Precio",
      render: (_, __, index) => (
        <div className="flex justify-start ">
          <Input
            className="!min-w-1"
            placeHolder="$"
            input={products[index].price}
            setInput={(input) => handleSetPrice(input, index)}
          />
        </div>
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
      <h1 className="font-bold text-3xl  py-4">Nueva órden de compra</h1>
      <div className="w-full md:flex md:flex-row md:gap-3">
        <div className="flex flex-col md:flex-1/2 gap-1">
          <h2 className="font-medium">Codigo de la orden</h2>
          <Input placeHolder="Código" className="w-full" />
        </div>
        <div className="flex flex-col md:flex-1/2 gap-1 mt-3 md:mt-0">
          <h2 className="font-medium">Proveedor</h2>
          <Select
            options={suppliers.map((s) => ({ label: s.name, value: s }))}
            searchable
            onChange={(s) => setSelectedSupplier(s)}
          />
        </div>
      </div>
      <div className="py-4">
        <Table columns={productColumns} data={products} mobileBlock />
      </div>
    </div>
  );
}
