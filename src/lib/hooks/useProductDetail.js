"use client";

import { useMemo } from "react";
import { useInventory } from "./useInventory";
import { useProducts } from "./useProducts";

/**
 * Hook para obtener el detalle completo de un producto
 * Combina información del producto con su inventario por bodega
 */
export function useProductDetail(productDocumentId) {
  // Obtener información básica del producto
  const {
    products,
    loading: loadingProduct,
    updateProduct,
    refetch,
  } = useProducts(
    {
      filters: {
        documentId: productDocumentId,
      },
    },
    {
      enabled: !!productDocumentId,
    }
  );

  // Obtener inventario del producto por bodega
  // IMPORTANTE: type "by-product" debe estar en la lista de validTypes en strapiQueryBuilder.js
  const { inventory, loading: loadingInventory } = useInventory(
    {
      filters: {
        type: "by-product",
        productId: productDocumentId,
      },
    },
    {
      enabled: !!productDocumentId,
    }
  );

  // El primer item del array inventory contiene el producto con todos sus items
  const productData = inventory?.[0] || null;
  const product = products?.[0] || productData || null;

  // Procesar items por bodega
  const inventoryByWarehouse = useMemo(() => {
    if (!productData) return [];

    const warehouseMap = new Map();

    // Función helper para procesar items de un array
    const processItems = (items, state) => {
      items.forEach((item) => {
        if (!item.warehouse) return;

        const warehouseId = item.warehouse.documentId;

        if (!warehouseMap.has(warehouseId)) {
          warehouseMap.set(warehouseId, {
            warehouse: item.warehouse,
            items: [],
            stats: {
              totalItems: 0,
              totalQuantity: 0,
              availableItems: 0,
              availableQuantity: 0,
              reservedItems: 0,
              reservedQuantity: 0,
              inTransitItems: 0,
              inTransitQuantity: 0,
              inProductionItems: 0,
              inProductionQuantity: 0,
              printLabItems: 0,
              printLabQuantity: 0,
            },
          });
        }

        const warehouseData = warehouseMap.get(warehouseId);
        warehouseData.items.push({ ...item, state });

        // Actualizar estadísticas
        const quantity = parseFloat(item.currentQuantity || item.quantity || 0);
        warehouseData.stats.totalItems++;
        warehouseData.stats.totalQuantity += quantity;

        switch (state) {
          case "available":
            warehouseData.stats.availableItems++;
            warehouseData.stats.availableQuantity += quantity;
            break;
          case "reserved":
            warehouseData.stats.reservedItems++;
            warehouseData.stats.reservedQuantity += quantity;
            break;
          case "inTransit":
            warehouseData.stats.inTransitItems++;
            warehouseData.stats.inTransitQuantity += quantity;
            break;
          case "inProduction":
            warehouseData.stats.inProductionItems++;
            warehouseData.stats.inProductionQuantity += quantity;
            break;
          case "printLab":
            warehouseData.stats.printLabItems++;
            warehouseData.stats.printLabQuantity += quantity;
            break;
        }
      });
    };

    // Procesar todos los arrays de items
    processItems(productData.available || [], "available");
    processItems(productData.reserved || [], "reserved");
    processItems(productData.inTransit || [], "inTransit");
    processItems(productData.inProduction || [], "inProduction");
    processItems(productData.printLab || [], "printLab");

    return Array.from(warehouseMap.values());
  }, [productData]);

  // Calcular estadísticas globales
  const stats = useMemo(() => {
    if (!productData) return null;

    const statistics = {
      totalWarehouses: inventoryByWarehouse.length,
      totalPackages: productData.totalPackages || 0,
      totalItems: 0,
      totalQuantity: productData.totalQuantity || 0,
      totalAvailableItems: 0,
      totalAvailableQuantity: 0,
      totalReservedItems: 0,
      totalReservedQuantity: 0,
      totalInTransitItems: 0,
      totalInTransitQuantity: 0,
      totalInProductionItems: 0,
      totalInProductionQuantity: 0,
      totalPrintLabItems: 0,
      totalPrintLabQuantity: 0,
      totalRequestedInQuantity: productData.totalRequestedInQuantity || 0,
      totalRequestedOutQuantity: productData.totalRequestedOutQuantity || 0,
      warehousesWithStock: 0,
      lastUpdated: productData.updatedAt
        ? new Date(productData.updatedAt)
        : null,
    };

    // Contar items por estado
    statistics.totalAvailableItems = productData.available?.length || 0;
    statistics.totalReservedItems = productData.reserved?.length || 0;
    statistics.totalInTransitItems = productData.inTransit?.length || 0;
    statistics.totalInProductionItems = productData.inProduction?.length || 0;
    statistics.totalPrintLabItems = productData.printLab?.length || 0;

    statistics.totalItems =
      statistics.totalAvailableItems +
      statistics.totalReservedItems +
      statistics.totalInTransitItems +
      statistics.totalInProductionItems +
      statistics.totalPrintLabItems;

    // Calcular cantidades por estado
    const calculateQuantity = (items) =>
      items?.reduce(
        (sum, item) =>
          sum + parseFloat(item.currentQuantity || item.quantity || 0),
        0
      ) || 0;

    statistics.totalAvailableQuantity = calculateQuantity(productData.available);
    statistics.totalReservedQuantity = calculateQuantity(productData.reserved);
    statistics.totalInTransitQuantity = calculateQuantity(productData.inTransit);
    statistics.totalInProductionQuantity = calculateQuantity(
      productData.inProduction
    );
    statistics.totalPrintLabQuantity = calculateQuantity(productData.printLab);

    // Contar bodegas con stock
    statistics.warehousesWithStock = inventoryByWarehouse.filter(
      (w) => w.stats.availableItems > 0
    ).length;

    return statistics;
  }, [productData, inventoryByWarehouse]);

  return {
    product,
    productData, // Datos completos del producto con items
    inventoryByWarehouse, // Items reorganizados por bodega
    stats,
    loading: loadingProduct || loadingInventory,
    updateProduct, // Función para actualizar el producto
    refetch, // Función para refrescar los datos
  };
}
