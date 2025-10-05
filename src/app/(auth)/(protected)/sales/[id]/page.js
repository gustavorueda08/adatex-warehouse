"use client";

import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import FileInput from "@/components/ui/FileInput";
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
import unitsAreConsistent from "@/lib/utils/unitsConsistency";
import { ChevronUpIcon, TrashIcon } from "@heroicons/react/24/solid";
import moment from "moment-timezone";
import React, {
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  memo,
  useRef,
} from "react";
import { v4 } from "uuid";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import Bagde from "@/components/ui/Bagde";
import { getOrderStateDataFromState } from "@/lib/utils/orderStates";
import Textarea from "@/components/ui/Textarea";
import { generateLabels } from "@/lib/utils/generateLabels";
import { List } from "react-window";
import useDebouncedCallback from "@/lib/hooks/useDebounceCallback";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useSocketContext } from "@/lib/contexts/SocketContext";

// ============================================================================
// COMPONENTES MEMOIZADOS CON DEBOUNCE
// ============================================================================

const DebouncedInput = memo(
  ({ value: initialValue, onChange, disabled, placeholder }) => {
    const [localValue, setLocalValue] = useState(initialValue);

    useEffect(() => {
      setLocalValue(initialValue);
    }, [initialValue]);

    const debouncedOnChange = useDebouncedCallback(onChange, 300);

    const handleChange = useCallback(
      (newValue) => {
        setLocalValue(newValue);
        debouncedOnChange(newValue);
      },
      [debouncedOnChange]
    );

    return (
      <Input
        disabled={disabled}
        placeholder={placeholder}
        input={localValue}
        setInput={handleChange}
      />
    );
  }
);
DebouncedInput.displayName = "DebouncedInput";

// ============================================================================
// COMPONENTE DE FILA PARA LA LISTA VIRTUALIZADA
// ============================================================================

const VirtualizedRow = memo(
  ({
    index,
    style,
    items,
    productId,
    updateItemField,
    disabled,
    handleDeleteItemRow,
    productIndex,
  }) => {
    const item = items?.[index];

    if (!item) return null;

    return (
      <div
        style={style}
        className="flex items-center gap-2 px-4 border-b border-neutral-700 hover:bg-neutral-800"
      >
        <div className="flex-1 min-w-0">
          <DebouncedInput
            value={item.quantity}
            onChange={(value) =>
              updateItemField(productId, item.id, "quantity", value)
            }
            disabled={disabled}
            placeholder="Cantidad"
          />
        </div>
        <div className="flex-1 min-w-0">
          <DebouncedInput
            value={item.lotNumber}
            onChange={(value) =>
              updateItemField(productId, item.id, "lotNumber", value)
            }
            disabled={disabled}
            placeholder="Lote"
          />
        </div>
        <div className="flex-1 min-w-0">
          <DebouncedInput
            value={item.itemNumber}
            onChange={(value) =>
              updateItemField(productId, item.id, "itemNumber", value)
            }
            disabled={disabled}
            placeholder="Numero"
          />
        </div>
        {!disabled && (
          <div className="w-10">
            <IconButton
              onClick={() => handleDeleteItemRow(productId, item.id)}
              variant="red"
              size="sm"
            >
              <TrashIcon className="w-4 h-4" />
            </IconButton>
          </div>
        )}
      </div>
    );
  }
);
VirtualizedRow.displayName = "VirtualizedRow";

// ============================================================================
// TABLA VIRTUALIZADA PARA ITEMS
// ============================================================================

const VirtualizedItemsTable = memo(
  ({
    items,
    productId,
    updateItemField,
    handleDeleteItemRow,
    productIndex,
    disabled,
  }) => {
    const listRef = useRef(null);
    const ROW_HEIGHT = 60;
    const HEADER_HEIGHT = 50;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return (
        <div className="bg-neutral-900 rounded-md overflow-hidden p-8 text-center text-gray-400">
          No hay items para mostrar
        </div>
      );
    }

    const tableHeight = Math.min(
      items.length * ROW_HEIGHT + HEADER_HEIGHT,
      500
    );

    return (
      <div className="bg-neutral-900 rounded-md overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-neutral-800 font-semibold text-sm border-b border-neutral-700">
          <div className="flex-1">Cantidad</div>
          <div className="flex-1">Lote</div>
          <div className="flex-1">Numero de Item</div>
          {!disabled && <div className="w-10">Acción</div>}
        </div>

        <List
          ref={listRef}
          height={tableHeight - HEADER_HEIGHT}
          rowComponent={VirtualizedRow}
          rowCount={items.length}
          rowHeight={ROW_HEIGHT}
          width="100%"
          rowProps={{
            items,
            productId,
            updateItemField,
            disabled,
            handleDeleteItemRow,
            productIndex,
          }}
        />

        <div className="px-4 py-2 bg-neutral-800 border-t border-neutral-700 text-xs text-gray-400">
          Total de items: {items.length} | Items con cantidad:{" "}
          {items.filter((i) => i.quantity > 0).length}
        </div>
      </div>
    );
  }
);
VirtualizedItemsTable.displayName = "VirtualizedItemsTable";

// ============================================================================
// COMPONENTE DE PRODUCTO EXPANDIBLE
// ============================================================================

const PackingListProduct = memo(
  ({
    product,
    productIndex,
    isExpanded,
    onToggle,
    updateItemField,
    handleDeleteItemRow,
    disabled,
    onEnter = () => {},
    loading = false,
  }) => {
    const stats = useMemo(() => {
      const totalQuantity =
        product?.items?.reduce(
          (acc, item) => acc + Number(item.quantity || 0),
          0
        ) || 0;
      const itemsWithQuantity =
        product.items?.filter((i) => i.quantity > 0).length || 0;
      return { totalQuantity, itemsWithQuantity };
    }, [product.items]);

    return (
      <div className="rounded-md flex flex-col justify-center align-middle gap-3">
        <div
          onClick={onToggle}
          className="flex flex-row justify-between align-middle bg-zinc-700 rounded-md px-2 py-3 hover:bg-zinc-700 transition-colors cursor-pointer"
        >
          <div className="flex flex-col flex-1">
            <h4 className="text-sm font-semibold">
              {product?.product?.name || ""}
            </h4>
            <p className="text-xs text-gray-400 mt-1">
              {stats.itemsWithQuantity} items | Total:{" "}
              {format(stats.totalQuantity)} {product?.product?.unit || ""}
            </p>
          </div>
          <Input
            placeholder="Escanea o introduce un codigo o cantidad"
            className="w-3/5 px-3"
            onEnter={(data) => onEnter(data)}
            loading={loading}
          />
          <IconButton onClick={onToggle}>
            <ChevronUpIcon
              className={`w-5 h-5 ${
                isExpanded ? "rotate-180" : ""
              } transition-all ease-in delay-75`}
            />
          </IconButton>
        </div>

        {isExpanded && (
          <VirtualizedItemsTable
            items={product.items}
            productId={product.id}
            updateItemField={updateItemField}
            handleDeleteItemRow={handleDeleteItemRow}
            productIndex={productIndex}
            disabled={disabled}
          />
        )}
      </div>
    );
  }
);
PackingListProduct.displayName = "PackingListProduct";

// ============================================================================
// COMPONENTES DE INPUTS PARA TABLA DE PRODUCTOS
// ============================================================================

const PriceInput = memo(
  ({ value, productId, updateProductField, disabled }) => {
    const handleChange = useCallback(
      (newValue) => {
        updateProductField(productId, "price", newValue);
      },
      [productId, updateProductField]
    );

    return (
      <Input
        input={value}
        setInput={handleChange}
        placeholder="$"
        className="md:max-w-28"
        disabled={disabled}
      />
    );
  }
);
PriceInput.displayName = "PriceInput";

const QuantityInput = memo(
  ({ value, productId, updateProductField, disabled }) => {
    const handleChange = useCallback(
      (newValue) => {
        updateProductField(productId, "quantity", newValue);
      },
      [productId, updateProductField]
    );

    return (
      <Input
        input={value}
        setInput={handleChange}
        placeholder="Cantidad"
        className="md:max-w-28"
        disabled={disabled}
      />
    );
  }
);
QuantityInput.displayName = "QuantityInput";

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

const calculateItemsTotal = (items) => {
  return items?.reduce((acc, item) => acc + Number(item.quantity || 0), 0) || 0;
};

const calculateItemsCount = (items) => {
  return items?.reduce((acc, i) => acc + (i.quantity > 0 ? 1 : 0), 0) || 0;
};

const calculateRowTotal = (items, price) => {
  return (
    items?.reduce(
      (acc, item) => acc + Number(item.quantity || 0) * Number(price || 0),
      0
    ) || 0
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function SaleDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const {
    orders,
    updateOrder,
    updating,
    deleteOrder,
    deleting,
    addItem,
    addingItem,
    removeItem,
  } = useOrders({
    filters: { id: [id] },
    populate: [
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
      "customer",
      "customerForInvoice",
      "customerForInvoice.prices",
      "customerForInvoice.taxes",
      "customer.prices",
      "customer.parties",
      "customer.taxes",
      "sourceWarehouse",
    ],
  });

  const order = orders[0] || null;
  const isCompleted = order?.state === "completed";

  const [dateCreated, setDateCreated] = useState(
    moment().tz("America/Bogota").toDate()
  );
  const [dateTransit, setDateTransit] = useState(null);
  const [dateArrived, setDateArrived] = useState(null);
  const [dateCompleted, setDateCompleted] = useState(null);
  const [currency, setCurrency] = useState("$");
  const [code, setCode] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCustomerForInvoice, setSelectedCustomerForInvoice] =
    useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [products, setProducts] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedProductsForLabels, setSelectedProductsForLabels] = useState(
    new Set()
  );
  const [loadingLabels, setLoadingLabels] = useState(false);

  const { warehouses } = useWarehouses({});
  const { products: productsData = [] } = useProducts({});
  const { customers } = useCustomers({
    populate: ["prices", "prices.product", "parties"],
  });
  const [parties, setParties] = useState([]);
  const { isConnected, joinOrder, on, leaveOrder } = useSocketContext();

  useEffect(() => {
    if (order) {
      setProducts([
        ...order.orderProducts.map((op) => ({
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
        })),
        {
          id: v4(),
          name: "",
          quantity: "",
          price: "",
          product: null,
          key: v4(),
          total: "",
          ivaIncluded: false,
          invoicePercentage: 100,
        },
      ]);
      setSelectedCustomer(order.customer);
      setSelectedCustomerForInvoice(order.customerForInvoice);
      setParties([...order.customer.parties, order.customer]);
      setSelectedWarehouse(order.sourceWarehouse);
      setNotes(order.notes);
      setDateCreated(order?.createdDate || null);
      setDateTransit(order?.actualDispatchDate || null);
      setDateArrived(order?.actualWarehouseDate || null);
      setDateCompleted(order?.completedDate || null);
    }
  }, [order]);

  useEffect(() => {
    if (
      selectedCustomer &&
      order &&
      selectedCustomer.id !== order.customer.id
    ) {
      const parties = selectedCustomer.parties;
      setParties([...parties, selectedCustomer]);
      if (parties.length === 0) {
        setSelectedCustomerForInvoice(selectedCustomer);
      } else {
        const defaultParty = parties.find((party) => party.isDefault);
        if (defaultParty) {
          setSelectedCustomerForInvoice(defaultParty);
        }
      }
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (!isConnected || !order?.id) return;

    console.log(`Uniéndose a orden:${order.id}`);
    joinOrder(order.id);

    // ✅Escuchar "order:item-added" en lugar de "item:added"
    const unsubscribeItemAdded = on("order:item-added", (item) => {
      // Actualizar el producto específico en el estado local
      setProducts((currentProducts) => {
        return currentProducts.map((product) => {
          if (product.product?.id === item.product?.id) {
            return {
              ...product,
              items: [
                {
                  ...item,
                  id: item.id || v4(),
                  key: item.id || v4(),
                  quantity: item.currentQuantity,
                  lotNumber: item.lotNumber,
                  itemNumber: item.itemNumber,
                },
                ...product.items.filter((i) => i.quantity), // Remover items vacíos
                // Nueva fila vacía
                {
                  quantity: "",
                  lotNumber: "",
                  itemNumber: "",
                  id: v4(),
                  key: v4(),
                },
              ],
            };
          }
          return product;
        });
      });

      toast.success(
        `${item.product?.name || "Item"}: ${format(item.currentQuantity)} ${
          item.product?.unit || ""
        } agregado`,
        { id: `item-${item.id}` } // Evita toasts duplicados
      );
    });

    // ✅ Escuchar item eliminado
    const unsubscribeItemRemoved = on("order:item-removed", (removedItem) => {
      console.log("Item eliminado vía socket:", removedItem);

      setProducts((currentProducts) => {
        return currentProducts.map((product) => {
          if (product.product?.id === removedItem.product?.id) {
            // Filtrar el item eliminado
            const updatedItems = product.items.filter(
              (item) => item.id !== removedItem.id
            );

            // Si no quedan items, agregar uno vacío
            if (
              updatedItems.length === 0 ||
              !updatedItems.some((i) => !i.quantity)
            ) {
              updatedItems.push({
                quantity: "",
                lotNumber: "",
                itemNumber: "",
                id: v4(),
                key: v4(),
              });
            }
            return {
              ...product,
              items: updatedItems,
            };
          }
          return product;
        });
      });

      toast.success(`${removedItem.product?.name || "Item"} eliminado`, {
        id: `item-removed-${removedItem.id}`,
      });
    });

    // Escuchar otros eventos si los tienes
    const unsubscribeOrderUpdated = on("order:updated", (updatedOrder) => {
      console.log("Orden actualizada vía socket:", updatedOrder);
    });

    return () => {
      console.log(`Saliendo de orden:${order.id}`);
      leaveOrder(order.id);
      unsubscribeItemAdded?.();
      unsubscribeOrderUpdated?.();
      unsubscribeItemRemoved?.();
    };
  }, [isConnected, order?.id, joinOrder, leaveOrder, on]);

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

  const handleDeleteItemRow = useCallback(
    async (productId, itemId) => {
      const loadingToast = toast.loading("Eliminando Item");
      try {
        const response = await removeItem(order.id, itemId);
        toast.dismiss(loadingToast);
        if (!response.success) {
          const product = products.find((product) => product.id === productId);
          toast.error(
            `No se pudo removerl el item ${product.product.name} ${format(
              item.quantity
            )}`
          );
        }
        return;
      } catch (error) {
        toast.dismiss(loadingToast);
        console.error(error);
      }
    },
    [order, products]
  );

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

  const updateItemField = useCallback((productId, itemId, field, value) => {
    setProducts((currentProducts) => {
      const productIndex = currentProducts.findIndex((p) => p.id === productId);
      if (productIndex === -1) return currentProducts;

      const product = currentProducts[productIndex];
      const updatedItems = product.items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      );

      const lastItem = updatedItems[updatedItems.length - 1];
      if (lastItem?.quantity !== "" && lastItem?.quantity !== 0) {
        updatedItems.push({
          quantity: "",
          lotNumber: "",
          itemNumber: "",
          id: v4(),
          key: v4(),
        });
      }

      const newProducts = [...currentProducts];
      newProducts[productIndex] = { ...product, items: updatedItems };
      return newProducts;
    });
  }, []);

  const handleAddItem = useCallback(
    async (productId, data = "") => {
      const loadingToast = toast.loading("Agregando Item");
      try {
        // Función para detectar si es barcode o cantidad
        const parseData = (input) => {
          if (!input || input === "") {
            return { barcode: null, quantity: null };
          }

          const cleanInput = String(input).trim();

          // Reemplazar coma por punto para números decimales
          const normalizedInput = cleanInput.replace(",", ".");

          // Intentar convertir a número
          const asNumber = Number(normalizedInput);

          // Es cantidad si:
          // - Se puede convertir a número válido
          // - No tiene letras
          // - No tiene guiones (excepto negativo al inicio)
          const isQuantity =
            !isNaN(asNumber) &&
            isFinite(asNumber) &&
            /^-?\d+([.,]\d+)?$/.test(cleanInput);

          if (isQuantity) {
            return { barcode: null, quantity: asNumber };
          } else {
            // Es barcode si tiene letras, guiones, o es alfanumérico largo
            return { barcode: cleanInput, quantity: null };
          }
        };

        const { barcode, quantity } = parseData(data);
        const response = await addItem(order.id, {
          product: productId,
          item: {
            barcode,
            quantity,
            product: productId,
            warehouse: order.sourceWarehouse.id,
          },
        });
        toast.dismiss(loadingToast);

        if (!response.success) {
          const product = products.find((p) => p?.product?.id == productId);
          toast.error(
            `No se encontró ningun Item de ${product.product.name} con ${
              barcode ? `código ${barcode}` : `cantidad ${quantity}`
            }`
          );
          console.log(response.data);
        }
        return;
      } catch (error) {
        toast.error(error.message);
      }
    },
    [order?.id, addItem]
  );

  const handleProductSelect = useCallback(
    (selectedProduct, index) => {
      setProducts((currentProducts) => {
        const updatedProducts = currentProducts.map((product, i) => {
          if (i !== index) return product;

          const updated = {
            ...product,
            product: selectedProduct,
            items: [
              {
                quantity: "",
                lotNumber: "",
                itemNumber: "",
                id: `${v4()}-2`,
                key: `${v4()}-3`,
              },
            ],
          };

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
            items: [
              {
                quantity: "",
                lotNumber: "",
                itemNumber: "",
                id: `${v4()}-2`,
                key: `${v4()}-3`,
              },
            ],
          });
        }

        return updatedProducts;
      });
    },
    [selectedCustomer, selectedCustomerForInvoice]
  );

  const handleSetProductItemsFromFile = useCallback((data, remove) => {
    if (!Array.isArray(data)) return;
    const items = data.map((item) => ({
      productId: item["id"] || item["ID"] || null,
      name: item["NOMBRE"] || null,
      quantity: Number(item["CANTIDAD"]) || null,
      lotNumber: Number(item["LOTE"]),
      itemNumber: Number(item["NUMERO"]),
    }));

    if (items.some((item) => !item.quantity)) {
      toast.error("El formato del archivo no es válido");
      remove();
      return;
    }

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

    toast.success(`Se han añadido ${items.length} Items a la órden`);
  }, []);

  const handleDeleteOrder = useCallback(async () => {
    if (!order) return;
    if (order.state !== "draft" && order.state !== "confirmed") {
      toast.error("No se puede eliminar la orden");
      return;
    }

    const result = await Swal.fire({
      title: "Eliminar Órdenes",
      html: `Se eliminará la orden <strong>${
        order.containerCode || order.code
      }</strong><br/> Esta acción no se puede deshacer.`,
      icon: "warning",
      iconColor: "red",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      background: "#27272a",
      color: "#fff",
      confirmButtonColor: "red",
      cancelButtonColor: "#71717a",
    });

    if (!result.isConfirmed) return;

    const loadingToast = toast.loading("Eliminando órden...");
    try {
      const result = await deleteOrder(order.id);
      toast.dismiss(loadingToast);
      if (result.success) {
        toast.success(
          `Órdenen ${order.containerCode || order.code} eliminada exitosamente`
        );
        router.push("/purchases");
      } else {
        toast.error(
          `Se produjo un error al eliminar la órden ${
            order.containerCode || order.code
          }`,
          { duration: 5000 }
        );
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error al eliminar órden");
      console.error("Error:", error);
    }
  }, [order, deleteOrder, router]);

  const handleUpdateOrder = useCallback(
    async (complete = false) => {
      const loadingToast = toast.loading("Actualizando órden...");
      try {
        let destinationWarehouse = selectedWarehouse;
        if (complete) {
          setLoadingComplete(true);
          if (destinationWarehouse.type !== "stock") {
            destinationWarehouse = warehouses.find(
              (warehouse) => warehouse.type === "stock" && warehouse.isDefault
            );
            if (!destinationWarehouse) {
              toast.dismiss(loadingToast);
              toast.error("No se ha encontrado ninguna bodega stock");
              return;
            }
          }
        }

        const result = await updateOrder(order.id, {
          products: products
            .filter((product) => product.product)
            .map((product) => ({
              product: product.product.id,
              items: product.items
                .filter(
                  (item) =>
                    typeof item.quantity === "number" && item.quantity !== 0
                )
                .map(
                  ({
                    productId,
                    id,
                    key,
                    name,
                    lotNumber,
                    warehouse,
                    ...item
                  }) => ({
                    ...item,
                    containerCode: order.containerCode,
                    lot: lotNumber,
                    warehouse: warehouse?.id,
                  })
                ),
            })),
          state: complete ? "completed" : "confirmed",
          destinationWarehouse: destinationWarehouse.id,
          customer: selectedCustomer.id,
          containerCode: code,
          notes,
          createdDate: dateCreated,
          actualDispatchDate: dateTransit,
          actualWarehouseDate: dateArrived,
          completedDate: dateCompleted,
        });

        toast.dismiss(loadingToast);
        if (result.success) {
          toast.success(
            `Órdenen ${
              order.containerCode || order.code
            } actualizada exitosamente`
          );
        } else {
          toast.error(
            `Se produjo un error al actualizar la órden ${
              order.containerCode || order.code
            }`,
            { duration: 5000 }
          );
        }
      } catch (error) {
        toast.dismiss(loadingToast);
        toast.error("Error al actualizar la órden");
        console.error("Error:", error);
      } finally {
        if (complete) {
          setLoadingComplete(false);
        }
      }
    },
    [
      order,
      products,
      selectedWarehouse,
      selectedCustomer,
      selectedCustomerForInvoice,
      code,
      notes,
      dateCreated,
      dateTransit,
      dateArrived,
      dateCompleted,
      warehouses,
      updateOrder,
    ]
  );

  const handleDownloadSelectedLabels = useCallback(async () => {
    setLoadingLabels(true);
    const toastLoading = toast.loading("Creando etiquetas...");
    const selectedProducts = products
      .filter((product) => selectedProductsForLabels.has(product.id))
      .map((product) => ({
        id: product.id,
        name: product.product.name,
        unit: product.product.unit,
        items: product.items
          .map((item) => ({
            id: item.id,
            name: product.product.name,
            barcode: item.barcode,
            alternativeBarcode: item.alternativeBarcode,
            quantity: item.currentQuantity,
            unit: product.product.unit,
          }))
          .sort((a, b) => a.quantity - b.quantity),
      }));

    try {
      await generateLabels(selectedProducts, {
        separateFiles:
          selectedProducts.length === products.length ? false : true,
      });
      toast.dismiss(toastLoading);
      toast.success("Etiquetas generadas exitosamente");
    } catch (error) {
      toast.error("Error al generar etiquetas");
    } finally {
      setLoadingLabels(false);
    }
  }, [products, selectedProductsForLabels]);

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

  const productColumns = useMemo(
    () => [
      {
        key: "name",
        label: "Producto",
        render: (_, row, index) => {
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
                  value={currentProduct || null}
                  onChange={(selectedProduct) =>
                    handleProductSelect(selectedProduct, index)
                  }
                  searchable
                  disabled={isCompleted}
                />
              </div>
              <div className="hidden md:block">
                <Select
                  className="md:min-w-80"
                  size="md"
                  options={selectOptions}
                  value={currentProduct || null}
                  onChange={(selectedProduct) =>
                    handleProductSelect(selectedProduct, index)
                  }
                  searchable
                  disabled={isCompleted}
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
          <PriceInput
            value={row.price}
            productId={row.id}
            updateProductField={updateProductField}
            disabled={isCompleted}
          />
        ),
        footer: "-",
      },
      {
        key: "quantity",
        label: "Cantidad requerida",
        render: (_, row) => (
          <QuantityInput
            value={row.quantity}
            productId={row.id}
            updateProductField={updateProductField}
            disabled={isCompleted}
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
        render: (_, row) => (
          <p>{format(calculateItemsTotal(row.items)) || "-"}</p>
        ),
        footer: (data) => {
          const hasConsistentUnits = unitsAreConsistent(
            data
              .filter((d) => d.product)
              .map((p) => ({ unit: p?.product?.unit }))
          );
          if (!hasConsistentUnits) return "-";
          const total =
            data
              .flatMap((p) => p.items)
              .reduce((acc, item) => acc + Number(item?.quantity || 0), 0) || 0;
          return format(total) || "-";
        },
      },
      {
        key: "itemsConfirmed",
        label: "Items Confirmados",
        render: (_, row) => format(calculateItemsCount(row.items)) || "-",
        footer: (data) => {
          const total = data.reduce(
            (acc, p) => acc + calculateItemsCount(p.items),
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
        render: (_, row) => (
          <p className="flex justify-start md:min-w-28">
            {format(calculateRowTotal(row.items, row.price), "$") || "-"}
          </p>
        ),
        footer: (data) => {
          const total = data.reduce((acc, p) => {
            const itemsTotal = calculateItemsTotal(p.items);
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
      isCompleted,
    ]
  );

  const stateData = getOrderStateDataFromState(order?.state);

  return (
    <div>
      <div className="flex flex-row gap-4">
        <h1 className="font-bold text-3xl py-4">{`${order?.code || ""} ${
          order?.containerCode ? ` | ${order.containerCode}` : ""
        }`}</h1>
        {stateData.key !== "error" && (
          <Bagde variant={stateData.variant}>{stateData.label}</Bagde>
        )}
      </div>

      <div className="w-full md:flex md:flex-row md:gap-3">
        <div className="flex flex-col md:flex-1/2 gap-1 mt-3 md:mt-0">
          <h2 className="font-medium">Cliente</h2>
          <Select
            disabled={isCompleted}
            options={customers.map((customer) => ({
              label: customer.name,
              value: customer.id,
            }))}
            value={selectedCustomer?.id}
            onChange={(id) => {
              const customer = customers.find((c) => id === c.id);
              setSelectedCustomer(customer);
            }}
            searchable
            size="md"
          />
        </div>
        <div className="flex flex-col md:flex-1/2 gap-1 mt-3 md:mt-0">
          <h2 className="font-medium">Cliente para la factura</h2>
          <Select
            disabled={isCompleted}
            options={parties.map((customer) => ({
              label: customer.name,
              value: customer.id,
            }))}
            value={selectedCustomerForInvoice?.id}
            onChange={(id) => {
              const customer = parties.find((c) => c.id === id);
              setSelectedCustomerForInvoice(customer);
            }}
            searchable
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
            onChange={setDateCreated}
            isDisabled
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
            disabled={isCompleted}
          />
        </div>
      </div>

      <div className="w-full md:flex md:flex-row md:gap-3 mt-3">
        <div className="flex flex-col md:flex-1/2 gap-1">
          <h2 className="font-medium">Fecha de despacho</h2>
          <DatePicker
            mode="single"
            value={dateTransit}
            onChange={setDateTransit}
            isDisabled
          />
        </div>
        <div className="flex flex-col md:flex-1/2 gap-1">
          <h2 className="font-medium">Fecha de arribo</h2>
          <DatePicker
            mode="single"
            value={dateArrived}
            onChange={setDateArrived}
            isDisabled
          />
        </div>
      </div>

      <div className="py-4">
        <h3 className="text-xl pb-2">Productos</h3>
        <Table
          columns={productColumns}
          data={products}
          mobileBlock
          getRowId={(row) => row.id}
          canDeleteRow={() => !isCompleted}
          onRowDelete={(id, index) => handleDeleteProductRow(index)}
          canSelectRow={() => true}
          onRowEdit={() => true}
        />
      </div>

      <h3 className="text-xl pb-2">Lista de empaque por producto</h3>
      <div className="p-4 bg-zinc-600 rounded-md flex flex-col gap-3">
        {products
          .filter((product) => product.product)
          .map((product, productIndex) => (
            <PackingListProduct
              key={product.id}
              product={product}
              productIndex={productIndex}
              isExpanded={expandedRows.has(product.id)}
              onToggle={() => toggleExpanded(product.id)}
              updateItemField={updateItemField}
              handleDeleteItemRow={handleDeleteItemRow}
              disabled={isCompleted}
              loading={addingItem}
              onEnter={(input) => handleAddItem(product.product.id, input)}
            />
          ))}
      </div>

      {(order?.state === "draft" || order?.state === "confirmed") && (
        <div className="py-4 flex flex-col gap-3">
          <h3 className="text-xl font-bold">
            Carga de lista de empaque masiva
          </h3>
          <FileInput onFileLoaded={handleSetProductItemsFromFile} />
        </div>
      )}

      <h3 className="text-xl pt-4 pb-2">Comentarios</h3>
      <div>
        <Textarea
          placeholder="Agrega comentarios a la órden"
          setValue={setNotes}
        />
      </div>

      <h3 className="text-xl pt-4 pb-2">Etiquetas</h3>
      <div>
        <Table
          columns={[
            { label: "Producto", key: "name" },
            { label: "Etiquetas", key: "itemCount" },
          ]}
          data={products
            .filter(
              (product) =>
                product.product &&
                !product.items.some(
                  (item) => item.quantity === 0 || item.quantity === ""
                )
            )
            .map((product) => ({
              id: product.id,
              name: product.product?.name || "",
              itemCount: product.items?.length || 0,
            }))}
          onRowSelect={(selection) =>
            setSelectedProductsForLabels(new Set(selection))
          }
          canSelectRow={() => true}
        />
        <Button
          variant="yellow"
          onClick={handleDownloadSelectedLabels}
          className="mt-4"
          loading={loadingLabels}
        >
          Descargar selección de etiquetas
        </Button>
      </div>

      <h3 className="text-xl pt-4 pb-2">Acciones de la órden</h3>
      <div className="flex flex-col w-full md:flex-row md:w-auto gap-4">
        <Button
          loading={updating && !loadingComplete}
          onClick={() => handleUpdateOrder(false)}
          disabled={!(order?.state === "draft" || order?.state === "confirmed")}
        >
          Actualizar
        </Button>
        <Button
          disabled={!(order?.state === "draft" || order?.state === "confirmed")}
          variant="red"
          loading={deleting}
          onClick={handleDeleteOrder}
        >
          Eliminar
        </Button>
        <Button
          variant="emerald"
          loading={loadingComplete}
          onClick={() => handleUpdateOrder(true)}
          disabled={!(order?.state === "draft" || order?.state === "confirmed")}
        >
          Recibir en bodega
        </Button>
        <Button variant="cyan">Descargar lista de empaque</Button>
        <Button variant="yellow">Descargar factura</Button>
      </div>
    </div>
  );
}
