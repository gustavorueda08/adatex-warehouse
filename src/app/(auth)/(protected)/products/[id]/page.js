"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EntityForm from "@/components/entities/EntityForm";
import toast from "react-hot-toast";
import { useProducts } from "@/lib/hooks/useProducts";
import { useStrapi } from "@/lib/hooks/useStrapi";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { createProductDetailConfig } from "@/lib/config/productConfigs";
import ExportItemsModal from "@/components/products/ExportItemsModal";
import { exportItemsToExcel } from "@/lib/utils/exportItemsToExcel";

export default function ProductDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  // States para filtros y sorting
  const [warehouseFilter, setWarehouseFilter] = useState([]);
  const [sortOrder, setSortOrder] = useState("");
  const [isExportItemsModalOpen, setIsExportItemsModalOpen] = useState(false);

  // Cargar bodegas para el filtro
  const { warehouses } = useWarehouses({}, { skip: false });

  // Construir filtros dinámicos
  const productFilters = useMemo(() => {
    return { id: { $eq: id } };
  }, [id]);

  const itemFilters = useMemo(() => {
    const filters = {
      warehouse: { id: { $null: false } },
    };

    if (warehouseFilter && warehouseFilter.length > 0) {
      filters.warehouse.id.$in = warehouseFilter;
    }

    return filters;
  }, [warehouseFilter]);
  // Fetch producto con items
  const { products, loading, updateProduct, syncing, refetch } = useProducts(
    {
      filters: productFilters,
      populate: {
        items: {
          populate: { warehouse: true },
        },
        collections: true,
      },
    },
    {
      onUpdate: () => {
        toast.success("Producto actualizado correctamente");
        refetch();
      },
      onError: (err) => {
        console.error("Error cargando producto:", err);
        toast.error("Error al cargar el producto");
      },
    }
  );

  const product = products?.[0] || null;

  // Client-side filtering and sorting of items
  const filteredItems = useMemo(() => {
    if (!product?.items) return [];

    let items = [...product.items];

    // 1. Filter: Warehouse Not Null (Always)
    items = items.filter((item) => item.warehouse);

    // 2. Filter: Selected Warehouses
    if (warehouseFilter && warehouseFilter.length > 0) {
      // warehouseFilter is an array of IDs
      // item.warehouse.id might be number or string, ensure comparison works
      items = items.filter((item) =>
        warehouseFilter.some(
          (filterId) => String(filterId) === String(item.warehouse.id)
        )
      );
    }

    // 3. Sort: Quantity
    if (sortOrder) {
      const [field, direction] = sortOrder.split(":");
      items.sort((a, b) => {
        const valA = Number(a[field] ?? a.quantity ?? 0);
        const valB = Number(b[field] ?? b.quantity ?? 0);
        if (direction === "asc") return valA - valB;
        return valB - valA;
      });
    }

    return items;
  }, [product, warehouseFilter, sortOrder]);

  const handleExportItems = async (columns) => {
    // Export filtered items instead of all items? Usually beneficial to export what you see.
    // But `product.items` would include everything. Let's export filteredItems.
    if (!filteredItems || filteredItems.length === 0) return;

    await exportItemsToExcel({
      items: filteredItems,
      product,
      columns,
      toast,
    });
  };

  // Fetch sales history
  const { entries: salesHistory, loading: loadingSales } = useStrapi(
    "orders",
    {
      filters: {
        items: { product: { id: { $eq: id } } },
        type: "sale",
        status: { $in: ["confirmed", "completed"] },
      },
      populate: {
        customer: true,
        items: { product: true }, // Need to parse qty
      },
      sort: ["createdAt:desc"],
      pagination: { pageSize: 50 }, // Limit history
    },
    {
      enabled: !!id,
      singularName: "order",
      pluralName: "orders",
    }
  );

  const config = useMemo(
    () =>
      createProductDetailConfig({
        product,
        items: filteredItems,
        salesHistory: salesHistory || [], // Pass to config
        updateProduct,
        router,
        loading: loading || loadingSales,
        warehouses: warehouses || [],
        warehouseFilter,
        setWarehouseFilter,
        sortOrder,
        setSortOrder,
        onExportClick: () => setIsExportItemsModalOpen(true),
      }),
    [
      product,
      filteredItems,
      salesHistory,
      updateProduct,
      router,
      loading,
      loadingSales,
      warehouses,
      warehouseFilter,
      sortOrder,
    ]
  );

  if (loading && !product) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  if (!product && !loading) {
    return <div className="text-center py-10">Producto no encontrado</div>;
  }

  return (
    <>
      <EntityForm config={config} initialData={product} backPath="/products" />
      <ExportItemsModal
        isOpen={isExportItemsModalOpen}
        onClose={() => setIsExportItemsModalOpen(false)}
        onExport={handleExportItems}
      />
    </>
  );
}
