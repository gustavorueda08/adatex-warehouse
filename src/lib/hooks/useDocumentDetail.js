// lib/hooks/useDocumentDetail.js
import { useState, useCallback, useEffect, useMemo } from "react";
import { v4 } from "uuid";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { useSocket } from "./useSocket";
import format from "../utils/format";

/**
 * Hook reutilizable para manejar la lógica de documentos (ventas, compras, devoluciones, etc.)
 * @param {Object} config - Configuración del documento
 * @param {Object} config.document - Documento actual
 * @param {Function} config.updateDocument - Función para actualizar
 * @param {Function} config.deleteDocument - Función para eliminar
 * @param {Function} config.addItem - Función para agregar items
 * @param {Function} config.removeItem - Función para remover items
 * @param {Array} config.availableProducts - Productos disponibles
 * @param {string} config.documentType - Tipo de documento (sale, purchase, return, in, out)
 * @param {Function} config.prepareUpdateData - Función opcional que retorna datos adicionales para la actualización
 */
export function useDocumentDetail(config) {
  const {
    document,
    updateDocument,
    deleteDocument,
    addItem,
    removeItem,
    availableProducts = [],
    documentType = "generic",
    onSuccess,
    redirectPath,
    prepareUpdateData,
    allowAutoCreateItems = true,
  } = config;

  const router = useRouter();

  // Estados comunes
  const [products, setProducts] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");

  const { isConnected, joinOrder, on, leaveOrder } = useSocket();

  useEffect(() => {
    if (!isConnected || !document?.id) return;

    console.log(`Uniéndose a orden de transformación: ${document.id}`);
    joinOrder(document.id);

    // Escuchar cuando se agrega un item
    const onItemAdded = on("order:item-added", (item) => {
      console.log("Item agregado vía socket:", item);
      toast.success(
        `Item ${item.product.name} | ${format(item.currentQuantity, "")} ${
          item.product.unit
        } agregado a la orden`
      );
      const { currentQuantity, ...itemData } = item;
      setProducts((current) =>
        current.map((product) => {
          if (product?.product?.id === itemData?.product?.id) {
            return {
              ...product,
              items: [
                { ...itemData, quantity: currentQuantity },
                ...product.items,
              ],
            };
          }
          return product;
        })
      );
    });

    // Escuchar cuando se elimina un item
    const onItemRemoved = on("order:item-removed", (removedItem) => {
      console.log("Item eliminado vía socket:", removedItem);
      toast.success(
        `Item ${removedItem.product.name} | ${format(
          removedItem.currentQuantity,
          ""
        )} ${removedItem.product.unit} agregado a la orden`
      );
      setProducts((current) =>
        current.map((product) => {
          if (product?.product?.id === removedItem?.product?.id) {
            return {
              ...product,
              items: product.items.filter((item) => item.id !== removedItem.id),
            };
          }
          return product;
        })
      );
    });

    // Escuchar actualizaciones de la orden
    const onDocumentUpdated = on("order:updated", (updatedDocument) => {
      console.log(
        "Orden de transformación actualizada vía socket:",
        updatedDocument
      );
    });

    // Cleanup
    return () => {
      console.log(`Saliendo de orden de transformación: ${document.id}`);
      leaveOrder(document.id);
      onItemAdded?.();
      onItemRemoved?.();
      onDocumentUpdated?.();
    };
  }, [isConnected, document?.id, joinOrder, leaveOrder, on]);

  // Inicializar productos desde el documento
  useEffect(() => {
    if (document) {
      const productsKey = getProductsKey(documentType);
      const documentProducts = document[productsKey] || [];
      setProducts([
        ...documentProducts.map((op) => ({
          ...op,
          items:
            Array.isArray(op.items) && op.items.length > 0
              ? op.items.map((item) => ({
                  ...item,
                  key: v4(),
                  quantity: item.currentQuantity,
                  currentQuantity: item.currentQuantity,
                }))
              : [createEmptyItem()],
        })),
        ...(allowAutoCreateItems ? [createEmptyProduct()] : []),
      ]);
      setNotes(document.notes || "");
    }
  }, [document, documentType, allowAutoCreateItems]);

  // Actualizar producto
  const updateProductField = useCallback((productId, field, value) => {
    setProducts((current) =>
      current.map((product) => {
        if (product.id !== productId) return product;
        const updated = { ...product, [field]: value };
        return updated;
      })
    );
  }, []);

  // Actualizar item
  const updateItemField = useCallback(
    (productId, itemId, field, value) => {
      setProducts((current) => {
        const productIndex = current.findIndex((p) => p.id === productId);
        if (productIndex === -1) return current;
        const product = current[productIndex];
        const updatedItems = product.items.map((item) =>
          item.id === itemId ? { ...item, [field]: value } : item
        );
        // Agregar item vacío si el último tiene cantidad
        const lastItem = updatedItems[updatedItems.length - 1];
        if (
          allowAutoCreateItems &&
          lastItem?.quantity !== "" &&
          lastItem?.quantity !== 0
        ) {
          updatedItems.push(createEmptyItem());
        }
        const newProducts = [...current];
        newProducts[productIndex] = { ...product, items: updatedItems };
        return newProducts;
      });
    },
    [allowAutoCreateItems]
  );

  // Seleccionar producto
  const handleProductSelect = useCallback(
    (selectedProduct, index) => {
      setProducts((current) => {
        const updated = current.map((product, i) => {
          if (i !== index) return product;
          return {
            ...product,
            product: selectedProduct,
            items: [createEmptyItem()],
          };
        });
        // Agregar fila vacía si la última tiene producto
        if (allowAutoCreateItems && updated[updated.length - 1]?.product) {
          updated.push(createEmptyProduct());
        }
        return updated;
      });
    },
    [allowAutoCreateItems]
  );

  // Eliminar producto
  const handleDeleteProductRow = useCallback(
    (index) => {
      setProducts((current) => {
        const updated = current.filter((_, i) => i !== index);
        if (
          allowAutoCreateItems &&
          (updated.length === 0 || updated.at(-1).product !== null)
        ) {
          updated.push(createEmptyProduct());
        }
        return updated;
      });
    },
    [allowAutoCreateItems]
  );

  // Eliminar item
  const handleDeleteItemRow = useCallback(
    async (productId, itemId) => {
      const loadingToast = toast.loading("Eliminando Item");
      try {
        if (removeItem) {
          const response = await removeItem(document.id, itemId);
          if (!response.success) {
            toast.error("No se pudo eliminar el item");
            return;
          }
        }
        toast.dismiss(loadingToast);
        setProducts((current) =>
          current.map((product) => {
            if (product?.id === productId) {
              return {
                ...product,
                items: product.items.filter((item) => item.id !== itemId),
              };
            }
            return product;
          })
        );
      } catch (error) {
        toast.dismiss(loadingToast);
        console.error(error);
        toast.error("Error al eliminar item");
      }
    },
    [document, removeItem]
  );

  // Agregar item directo al server
  const handleAddItemRow = useCallback(
    async (productId, data = "", setInput = () => {}) => {
      if (!addItem) {
        toast.error("Función addItem no disponible");
        return;
      }
      const loadingToast = toast.loading("Agregando Item");
      try {
        const { barcode, quantity } = parseItemData(data);
        const response = await addItem(document.id, {
          product: productId,
          item: {
            barcode,
            quantity,
            product: productId,
            warehouse: document.sourceWarehouse?.id,
          },
        });
        toast.dismiss(loadingToast);
        if (!response.success) {
          toast.error(
            "No se pudo agregar el item, el item no existe o ya fue vendido"
          );
          return;
        }
        const { currentQuantity, ...item } = response.data;
        setProducts((current) =>
          current.map((product) => {
            if (product?.product?.id === item.product) {
              return {
                ...product,
                items: [
                  { ...item, quantity: currentQuantity },
                  ...product.items,
                ],
              };
            }
            return product;
          })
        );
      } catch (error) {
        toast.error(error.message);
      } finally {
        setInput("");
      }
    },
    [document?.id, addItem]
  );

  // Actualizar documento
  const handleUpdateDocument = useCallback(
    async (additionalData = {}, loading = true, stateOverride = null) => {
      const loadingToast = toast.loading("Actualizando documento...");
      setLoading(loading);
      try {
        // Obtener datos adicionales del callback si existe
        const extraData =
          prepareUpdateData?.(document, products, stateOverride) || {};

        const { destinationWarehouse } = extraData;

        const result = await updateDocument(document.id, {
          products: products
            .filter((p) => p.product)
            .map((p) => ({
              product: p.product.id,
              requestedQuantity: p.requestedQuantity,
              price: p.price,
              ivaIncluded: p.ivaIncluded,
              invoicePercentage: p.invoicePercentage,
              items: p.items
                .filter((i) => i.quantity !== 0 && i.quantity !== "")
                .map((item) => ({
                  id: item?.id || null,
                  lot: item.lotNumber,
                  itemNumber: item.itemNumber,
                  parentItem: item?.parentItem?.id || item?.parentItem || null,
                  warehouse: destinationWarehouse || item?.warehouse?.id,
                  quantity: Number(item.quantity),
                })),
            })),
          notes,
          ...extraData,
          ...additionalData,
        });
        toast.dismiss(loadingToast);
        if (result.success) {
          toast.success("Documento actualizado exitosamente");
          onSuccess?.(result);
        } else {
          toast.error("Error al actualizar el documento");
        }
      } catch (error) {
        toast.dismiss(loadingToast);
        toast.error("Error al actualizar el documento");
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    },
    [document, products, notes, updateDocument, onSuccess, prepareUpdateData]
  );

  // Eliminar documento
  const handleDeleteDocument = useCallback(async () => {
    if (!document) return;
    const result = await Swal.fire({
      title: "Eliminar Documento",
      html: `Se eliminará el documento <strong>${document.code}</strong><br/> Esta acción no se puede deshacer.`,
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
    const loadingToast = toast.loading("Eliminando Orden...");
    try {
      const result = await deleteDocument(document.id);
      toast.dismiss(loadingToast);
      if (result.success) {
        toast.success("Documento eliminado exitosamente");
        if (redirectPath) {
          router.push(redirectPath);
        }
      } else {
        toast.error("Error al eliminar el documento");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error al eliminar el documento");
      console.error("Error:", error);
    }
  }, [document, deleteDocument, router, redirectPath]);

  // Toggle expandir
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
  // Productos disponibles por fila
  const getAvailableProductsForRow = useCallback(
    (currentIndex) => {
      const selectedIds = products
        .map((p, idx) =>
          idx !== currentIndex && p.product ? p.product.id : null
        )
        .filter((id) => id !== null);
      return availableProducts.filter((p) => !selectedIds.includes(p.id));
    },
    [products, availableProducts]
  );
  return {
    products,
    setProducts,
    expandedRows,
    loading,
    notes,
    setNotes,
    updateProductField,
    updateItemField,
    handleProductSelect,
    handleDeleteProductRow,
    handleAddItemRow,
    handleDeleteItemRow,
    handleUpdateDocument,
    handleDeleteDocument,
    toggleExpanded,
    getAvailableProductsForRow,
  };
}

// Utilidades
function createEmptyItem() {
  return {
    quantity: "",
    lotNumber: "",
    itemNumber: "",
    id: v4(),
    key: v4(),
  };
}

function createEmptyProduct() {
  return {
    id: v4(),
    name: "",
    quantity: "",
    price: "",
    product: null,
    key: v4(),
    total: "",
    ivaIncluded: false,
    invoicePercentage: 100,
    items: [createEmptyItem()],
  };
}

function parseItemData(input) {
  if (!input || input === "") {
    return { barcode: null, quantity: null };
  }

  const cleanInput = String(input).trim();

  // Si tiene 16+ caracteres, es un barcode
  if (cleanInput.length >= 16) {
    return { barcode: cleanInput, quantity: null };
  }

  // Para strings cortos, verificar si es numérico
  const normalizedInput = cleanInput.replace(",", ".");
  const asNumber = Number(normalizedInput);

  const isQuantity =
    !isNaN(asNumber) &&
    isFinite(asNumber) &&
    /^-?\d+([.,]\d+)?$/.test(cleanInput);

  if (isQuantity) {
    return { barcode: null, quantity: asNumber };
  } else {
    return { barcode: cleanInput, quantity: null };
  }
}

function getProductsKey(documentType) {
  const keys = {
    sale: "orderProducts",
    purchase: "orderProducts",
    return: "orderProducts",
    in: "orderProducts",
    out: "orderProducts",
  };
  return keys[documentType] || "orderProducts";
}
