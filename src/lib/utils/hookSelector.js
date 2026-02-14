import { useCustomers } from "../hooks/useCustomers";
import { useItems } from "../hooks/useItems";
import { useOrders } from "../hooks/useOrders";
import { useProducts } from "../hooks/useProducts";
import { useSellers } from "../hooks/useSellers";
import { useSuppliers } from "../hooks/useSuppliers";
import { useWarehouses } from "../hooks/useWarehouses";
import { useTerritories } from "../hooks/useTerritories";
import { useTaxes } from "../hooks/useTaxes";
import { useLines } from "../hooks/useLines";
import { useCollections } from "../hooks/useCollections";

export function hookSelector(listType) {
  switch (listType) {
    case "orders":
      return useOrders;
    case "products":
      return useProducts;
    case "customers":
      return useCustomers;
    case "sellers":
      return useSellers;
    case "suppliers":
      return useSuppliers;
    case "items":
      return useItems;
    case "warehouses":
      return useWarehouses;
    case "territories":
      return useTerritories;
    case "taxes":
      return useTaxes;
    case "lines":
      return useLines;
    case "collections":
      return useCollections;
    default:
      return useOrders;
  }
}
