"use client";

import { use } from "react";
import { useProductDetail } from "@/lib/hooks/useProductDetail";
import ProductDetailView from "@/components/products/ProductDetailView";

export default function ProductDetailPage({ params }) {
  const { id } = use(params);
  const {
    product,
    productData,
    inventoryByWarehouse,
    stats,
    loading,
    updateProduct,
  } = useProductDetail(id);

  return (
    <ProductDetailView
      product={product}
      productData={productData}
      inventoryByWarehouse={inventoryByWarehouse}
      stats={stats}
      loading={loading}
      updateProduct={updateProduct}
    />
  );
}
