"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useProducts } from "@/lib/hooks/useProducts";
import { addToast, Button } from "@heroui/react";
import Entity from "@/components/entities/Entity";
import { CheckIcon } from "@heroicons/react/24/outline";
import RoleGuard from "@/components/auth/RoleGuard";
import TransformationFactorsManager from "@/components/products/TransformationFactorsManager";
import Section from "@/components/ui/Section";

function NewProductPageInner() {
  const router = useRouter();
  const { createProduct, creating } = useProducts(
    {},
    {
      enabled: false,
      onCreate: (createdProduct) => {
        addToast({
          title: "Producto creado",
          description: "El producto se ha creado exitosamente",
          color: "success",
        });
        // Strapi v4 returns id in the top level response or documentId
        router.push(`/products/${createdProduct.id}`);
      },
      onError: (error) => {
        addToast({
          title: "Error al crear producto",
          description: error.message,
          color: "danger",
        });
      },
    },
  );

  const [product, setProduct] = useState({
    name: "",
    code: "",
    barcode: "",
    description: "",
    type: "variableQuantityPerItem",
    unit: "m",
    category: "Confeccion",
    isActive: true,
    canCut: false,
    cutUnit: "m",
    cutTransformationFactor: null,
    unitsPerPackage: 1,
    hasVariableQuantity: true,
    defaultCutProduct: false,
    parentProduct: null,
    hasVariableQuantity: true,
    defaultCutProduct: false,
    parentProduct: null,
    transformationFactors: [],
    productsForCuts: [],
    suppliers: [],
    collections: [],
    siigoId: "",
    cutWarehouseType: "smartCut",
  });

  const headerFields = useMemo(() => {
    const fields = [
      {
        label: "Nombre",
        type: "input",
        value: product.name,
        onChange: (name) => setProduct({ ...product, name }),
        required: true,
      },
      {
        label: "Unidad",
        type: "select",
        options: [
          { key: "kg", label: "Kilogramo (kg)" },
          { key: "m", label: "Metro (m)" },
          { key: "unit", label: "Unidad (und)" },
        ],
        value: product.unit,
        required: true,
        onChange: (unit) => setProduct({ ...product, unit }),
      },
      {
        label: "Tipo de Producto",
        type: "select",
        options: [
          {
            key: "variableQuantityPerItem",
            label: "Cantidad Variable por Empaque",
          },
          { key: "fixedQuantityPerItem", label: "Cantidad Fija por Empaque" },
          { key: "cutItem", label: "Producto para Corte" },
          { key: "service", label: "Servicio (Sin Inventario)" },
        ],
        value: product.type,
        onChange: (type) => setProduct({ ...product, type }),
        required: true,
        fullWidth: product?.type === "fixedQuantityPerItem" ? true : false,
      },
      ...(product?.type === "variableQuantityPerItem" &&
      product?.type !== "service"
        ? [
            {
              key: "unitsPerPackage",
              label: "Cantidad de unidades promedio por paquete",
              type: "input",
              value: product?.unitsPerPackage,
              onChange: (unitsPerPackage) =>
                setProduct({ ...product, unitsPerPackage }),
              inputType: "number",
            },
          ]
        : []),
      ...((product?.type === "variableQuantityPerItem" ||
        product?.type === "fixedQuantityPerItem") &&
      product?.type !== "service"
        ? [
            {
              key: "canCut",
              label: "¿Crear Producto de Corte Automáticamente?",
              type: "checkbox",
              value: product?.canCut,
              onChange: (canCut) => setProduct({ ...product, canCut }),
              fullWidth: true,
            },
          ]
        : []),
      ...(product?.canCut && product?.type !== "service"
        ? [
            {
              key: "cutUnit",
              label: "Unidad de Corte",
              type: "select",
              options: [
                { key: "kg", label: "Kilogramo (kg)" },
                { key: "m", label: "Metro (m)" },
                { key: "unit", label: "Unidad (und)" },
              ],
              value: product?.cutUnit,
              required: true,
              onChange: (cutUnit) => setProduct({ ...product, cutUnit }),
            },
            {
              key: "cutTransformationFactor",
              label: "Factor de Transformación",
              type: "input",
              inputType: "number",
              value: product?.cutTransformationFactor,
              required: true,
              onChange: (cutTransformationFactor) =>
                setProduct({ ...product, cutTransformationFactor }),
            },
          ]
        : []),
      ...(product.type === "cutItem"
        ? [
            {
              label: "Producto Padre (Rollo Maestro)",
              type: "async-select",
              listType: "products",
              value: product.parentProduct,
              placeholder: "Selecciona el producto a consumir",
              selectedOption: product.parentProduct,
              selectedOptionLabel: product.parentProduct?.name,
              render: (p) => p?.name,
              filters: (search) => ({ name: { $containsi: search } }),
              onChange: (parentProduct) =>
                setProduct({ ...product, parentProduct }),
              required: true,
            },
            {
              label: "Tipo de Proceso",
              type: "select",
              options: [
                { key: "smartCut", label: "Corte Estándar (SmartCut)" },
                { key: "printlab", label: "Impresión / Sublimado (PrintLab)" },
              ],
              value: product.cutWarehouseType,
              onChange: (cutWarehouseType) =>
                setProduct({ ...product, cutWarehouseType }),
              required: true,
            },
          ]
        : []),
      {
        label: "Descripción",
        type: "textarea",
        value: product.description,
        onChange: (description) => setProduct({ ...product, description }),
        fullWidth: true,
      },
    ];

    return fields;
  }, [product]);

  const handleCreate = async () => {
    if (!product.name) {
      addToast({
        title: "Campos Requeridos",
        description: "El Nombre es obligatorio.",
        color: "warning",
      });
      return;
    }

    if (product.type === "cutItem" && !product.parentProduct) {
      addToast({
        title: "Campos Requeridos",
        description: "Los items de corte necesitan un producto padre asignado.",
        color: "warning",
      });
      return;
    }

    try {
      const data = {
        name: product.name,
        description: product.description,
        type: product.type,
        unit: product.unit,
        category: product.category,
        isActive: product.isActive,
        canCut: product.canCut,
        cutUnit: product.canCut ? product.cutUnit : undefined,
        cutTransformationFactor: product.canCut
          ? Number(product.cutTransformationFactor)
          : undefined,
        unitsPerPackage: product.unitsPerPackage,
        siigoId: product.siigoId,
      };

      if (product.code) data.code = product.code;
      if (product.barcode) data.barcode = product.barcode;

      if (product.type === "variableQuantityPerItem") {
        data.hasVariableQuantity = product.hasVariableQuantity;
      } else if (product.type === "cutItem") {
        data.parentProduct = product.parentProduct.id || product.parentProduct;
        data.defaultCutProduct = product.defaultCutProduct;
        if (
          product.transformationFactors &&
          product.transformationFactors.length > 0
        ) {
          data.transformationFactors = product.transformationFactors.map(
            (tf) => (tf.id ? { id: tf.id } : tf),
          );
        }
        data.cutWarehouseType = product.cutWarehouseType;
      }

      if (product.productsForCuts && product.productsForCuts.length > 0) {
        data.productsForCuts = product.productsForCuts.map((p) => p.id || p);
      }

      if (product.suppliers.length > 0) {
        data.suppliers = product.suppliers.map((s) => s.id || s);
      }
      if (product.collections.length > 0) {
        data.collections = product.collections.map((c) => c.id || c);
      }

      await createProduct(data);
    } catch (error) {
      console.error(error);
      addToast({
        title: "Error",
        description: error.message || "Ocurrió un error al crear el producto",
        color: "danger",
      });
    }
  };

  return (
    <Entity
      title="Nuevo Producto"
      headerFields={headerFields}
      entity={product}
      setEntity={setProduct}
    >
      {product.type === "cutItem" && (
        <Section title="Factor de Transformación">
          <TransformationFactorsManager
            product={product}
            setProduct={setProduct}
          />
        </Section>
      )}

      <div className="flex justify-end w-full">
        <Button color="success" isLoading={creating} onPress={handleCreate}>
          Crear Producto
        </Button>
      </div>
    </Entity>
  );
}

export default function NewProductPage(params) {
  return (
    <RoleGuard forbiddenRoles={["seller"]} fallbackRoute="/">
      <NewProductPageInner {...params} />
    </RoleGuard>
  );
}
