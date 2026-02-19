"use client";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useProducts } from "@/lib/hooks/useProducts";
import { useWarehouses } from "@/lib/hooks/useWarehouses";
import { useOrders } from "@/lib/hooks/useOrders";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  addToast,
} from "@heroui/react";
import { ArrowDownTrayIcon, TrashIcon } from "@heroicons/react/24/outline";
import { exportItemsToExcel } from "@/lib/utils/exportItemsToExcel";
import Entity from "@/components/entities/Entity";
import Section from "@/components/ui/Section";
import { useItems } from "@/lib/hooks/useItems";
import Entities from "@/components/entities/Entities";
import EntityFilters from "@/components/entities/EntityFilters";
import EntityActions from "@/components/entities/EntityActions";
import format from "@/lib/utils/format";

export default function ProductDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const screenSize = useScreenSize();
  const [product, setProduct] = useState(null);
  const [itemsPagination, setItemsPagination] = useState({
    page: 1,
    pageSize: 10,
  });
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [search, setSearch] = useState("");
  const {
    products = [],
    updateProduct,
    deleteProduct,
    updating,
    refetch,
  } = useProducts({
    filters: { id: { $eq: id } },
    populate: ["collections"],
  });
  const { warehouses } = useWarehouses();
  const itemsFilters = useMemo(() => {
    const filters = {
      product: { id: { $eq: id } },
      warehouse: { $null: false },
    };
    if (warehouseFilter) {
      filters.warehouse = { id: { $eq: warehouseFilter } };
    }
    if (search) {
      const searchConditions = [{ barcode: { $containsi: search } }];
      if (!isNaN(Number(search))) {
        searchConditions.push({ currentQuantity: { $eq: Number(search) } });
      }
      filters.$or = searchConditions;
    }
    return filters;
  }, [id, warehouseFilter, search]);
  const {
    items = [],
    pagination: { pageCount },
    loading: itemsLoading,
    refetch: refetchItems,
  } = useItems({
    filters: itemsFilters,
    populate: ["warehouse"],
    pagination: itemsPagination,
  });
  const headerFields = [
    {
      key: "name",
      label: "Nombre",
      type: "input",
      value: product?.name,
      onChange: (name) => setProduct({ ...product, name }),
    },
    {
      key: "code",
      label: "Código SKU",
      type: "input",
      value: product?.code,
      onChange: (code) => setProduct({ ...product, code }),
    },
    {
      key: "barcode",
      label: "Código de barras",
      type: "input",
      value: product?.barcode,
      onChange: (barcode) => setProduct({ ...product, barcode }),
    },
    {
      key: "unit",
      label: "Unidad",
      type: "select",
      options: [
        { key: "kg", label: "kg" },
        { key: "m", label: "m" },
        { key: "unit", label: "Unidad" },
      ],
      value: product?.unit,
      onChange: (unit) => setProduct({ ...product, unit }),
    },
    {
      key: "description",
      label: "Descripción",
      type: "textarea",
      value: product?.description,
      onChange: (description) => setProduct({ ...product, description }),
      fullWidth: true,
    },
    {
      key: "collections",
      label: "Colecciones",
      type: "multiselect",
      listType: "collections",
      render: (collection) => collection.name,
      values: product?.collections || [],
      onChange: (collections) => setProduct({ ...product, collections }),
      fullWidth: true,
    },
    {
      key: "hasVariableQuantity",
      label: "¿Tiene cantidad variable por paquete?",
      type: "checkbox",
      value: product?.hasVariableQuantity || false,
      onChange: (hasVariableQuantity) =>
        setProduct({ ...product, hasVariableQuantity }),
    },
    ...(product?.hasVariableQuantity
      ? [
          {
            key: "unitsPerPackage",
            label: "Cantidad de unidades promedio por paquete",
            type: "input",
            value: product?.unitsPerPackage,
            onChange: (unitsPerPackage) =>
              setProduct({ ...product, unitsPerPackage }),
            fullWidth: true,
            inputType: "number",
          },
        ]
      : []),
  ];
  useEffect(() => {
    if (products.length > 0) {
      setProduct(products[0]);
    }
  }, [products]);
  const itemColumns = useMemo(() => {
    return [
      { key: "barcode", label: "Código de Barras" },
      {
        key: "currentQuantity",
        label: "Cantidad",
        render: (item) =>
          (
            <span>
              {format(item?.currentQuantity)} {item?.unit || product?.unit}
            </span>
          ) || "-",
      },
      { key: "lotNumber", label: "Lote" },
      { key: "itemNumber", label: "Número" },
      {
        key: "warehouse",
        label: "Bodega",
        render: (item) => item?.warehouse?.name || "-",
      },
    ];
  }, []);
  const handleExport = async () => {
    await exportItemsToExcel({
      filters: itemsFilters,
      product,
      toast,
    });
  };
  const filters = useMemo(() => {
    return [
      {
        key: "warehouse",
        label: "Bodega",
        placeholder: "Bodega",
        options: warehouses.map((w) => ({ key: w.id, label: w.name })),
        selectedKeys: warehouseFilter ? new Set([warehouseFilter]) : new Set(),
        onSelectionChange: (keys) => {
          setWarehouseFilter(Array.from(keys)[0]);
        },
        selectionMode: "single",
      },
    ];
  }, [warehouses, warehouseFilter]);
  const { createOrder, creating: creatingOrder } = useOrders();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const handleDeleteItems = async () => {
    try {
      let selectedItems = [];
      // Handle "Select All" case
      if (selectedKeys === "all") {
        selectedItems = [...items];
      } else {
        const selectedIds = new Set(Array.from(selectedKeys).map(String));
        // Filter selected items ensuring ID type match
        selectedItems = items.filter((item) =>
          selectedIds.has(String(item.id)),
        );
      }
      if (selectedItems.length === 0) {
        addToast({
          title: "Error",
          description: "No se encontraron los items seleccionados",
          type: "error",
        });
        return;
      }
      const totalQuantity = selectedItems.reduce(
        (sum, item) => sum + Number(item.currentQuantity),
        0,
      );
      const payload = {
        type: "out",
        notes: "Baja de items desde detalle de producto",
        products: [
          {
            product: product.id,
            requestedQuantity: Math.round(totalQuantity * 100) / 100,
            items: selectedItems.map((item) => ({
              id: item.id,
              quantity: Number(item.currentQuantity),
            })),
          },
        ],
        state: "completed",
      };
      const res = await createOrder(payload);
      if (res && res.data) {
        addToast({
          title: "Items eliminados",
          description:
            "Se ha creado una orden de salida para los items seleccionados.",
          type: "success",
        });
        await refetch();
        await refetchItems();
        setSelectedKeys(new Set());
        onOpenChange();
      }
    } catch (error) {
      console.error("Error deleting items:", error);
      addToast({
        title: "Error",
        description: "No se pudieron eliminar los items. Intente nuevamente.",
        type: "error",
      });
    }
  };
  const handleUpdate = async () => {
    const data = {
      name: product?.name,
      code: product?.code,
      barcode: product?.barcode,
      description: product?.description,
      unit: product?.unit,
      hasVariableQuantity: product?.hasVariableQuantity || false,
      unitsPerPackage: product?.unitsPerPackage,
      collections: product?.collections?.map((c) => c.id) || [],
    };
    await updateProduct(product?.id, data);
    await refetch();
    addToast({
      title: "Producto actualizado",
      description: "El producto ha sido actualizado correctamente.",
      type: "success",
    });
  };
  const handleDeleteProduct = async () => {
    const res = await deleteProduct(id);
    if (res.error) {
      addToast({
        title: "Error",
        description: "No se pudo eliminar el producto.",
        type: "error",
      });
      return;
    }
    addToast({
      title: "Producto eliminado",
      description: "El producto ha sido eliminado correctamente.",
      type: "success",
    });
    router.push("/products");
  };

  return (
    <Entity
      title="Producto"
      entity={product}
      backPath="/products"
      headerFields={headerFields}
    >
      <Section
        title="Items"
        description={"Items del producto en diferentes bodegas"}
      >
        <EntityFilters
          filters={filters}
          showCreate={false}
          className="px-3 pt-2 pb-0"
          search={search}
          setSearch={setSearch}
        />
        <Entities
          entityName="items"
          entities={items}
          columns={itemColumns}
          pagination={itemsPagination}
          setPagination={setItemsPagination}
          pageCount={pageCount}
          loading={itemsLoading}
          screenSize={screenSize}
          selectedKeys={selectedKeys}
          setSelectedKeys={setSelectedKeys}
          className="p-3"
          emptyContent="No se encontraron Items asociados a este producto"
        />
        <div className="flex justify-end gap-2 p-3">
          <Button
            color="success"
            className="text-white w-full md:w-auto"
            onPress={handleExport}
            startContent={<ArrowDownTrayIcon className="w-4 h-4 text-white" />}
            size={screenSize === "lg" ? "md" : "sm"}
          >
            Exportar Excel
          </Button>
          {(selectedKeys === "all" || selectedKeys.size > 0) && (
            <Button
              color="danger"
              variant="flat"
              className="w-full md:w-auto"
              onPress={onOpen}
              startContent={<TrashIcon className="w-4 h-4" />}
              size={screenSize === "lg" ? "md" : "sm"}
              isLoading={creatingOrder}
            >
              Eliminar Items
            </Button>
          )}
        </div>
      </Section>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Confirmar Eliminación
              </ModalHeader>
              <ModalBody>
                <p>
                  ¿Estás seguro de que deseas eliminar los items seleccionados?
                  Esta acción no se puede deshacer.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancelar
                </Button>
                <Button
                  color="danger"
                  onPress={handleDeleteItems}
                  isLoading={creatingOrder}
                >
                  Eliminar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      <Section title={"Acciones"}>
        <EntityActions
          entity={product}
          setEntity={setProduct}
          onUpdate={handleUpdate}
          onDelete={handleDeleteProduct}
          isLoading={updating}
        />
      </Section>
    </Entity>
  );
}
