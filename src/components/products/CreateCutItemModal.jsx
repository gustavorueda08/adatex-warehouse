"use client";

import { useState, useRef, useMemo } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  Autocomplete,
  AutocompleteItem,
  addToast,
} from "@heroui/react";
import { useEntityList } from "@/lib/hooks/useEntityList";
import { useProducts } from "@/lib/hooks/useProducts";
import { useInfiniteScroll } from "@heroui/use-infinite-scroll";

export default function CreateCutItemModal({ isOpen, onClose, onSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    parentProduct: "",
    unit: "unit",
    cutTransformationFactor: "",
  });

  const { createProduct } = useProducts({}, { enabled: false });

  // Autocomplete states
  const [isOpenAutocomplete, setIsOpenAutocomplete] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const ignoreNextInputChange = useRef(false);

  const {
    options: parentProducts,
    isLoading: loadingParents,
    setSearch: searchParents,
    hasMore,
    onLoadMore,
  } = useEntityList({
    listType: "products",
    filters: (search) => ({
      name: { $containsi: search },
      $or: [
        { type: { $eq: "variableQuantityPerItem" } },
        { type: { $eq: "fixedQuantityPerItem" } },
        { type: { $eq: "printLab" } }, // In case the type is printLab instead of checking just the warehouse, but parent was filtered by type
      ],
    }),
    populate: [],
  });

  const [, scrollerRef] = useInfiniteScroll({
    hasMore,
    isEnabled: isOpenAutocomplete,
    shouldUseLoader: false,
    onLoadMore,
  });

  const onSelectionChange = (key) => {
    if (!key) return;
    ignoreNextInputChange.current = true;
    const selectedItem = parentProducts.find(
      (item) => String(item.id) === String(key),
    );
    if (selectedItem) {
      setFormData({ ...formData, parentProduct: selectedItem.id });
      setInputValue(selectedItem.name);
    }
    setIsOpenAutocomplete(false);
  };

  const onInputChange = (value) => {
    setInputValue(value);
    if (ignoreNextInputChange.current) {
      ignoreNextInputChange.current = false;
      return;
    }
    searchParents(value);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      if (
        !formData.name ||
        !formData.parentProduct ||
        !formData.cutTransformationFactor
      ) {
        addToast({
          title: "Error",
          description: "Por favor complete todos los campos requeridos.",
          color: "danger",
        });
        return;
      }

      const parentNode = parentProducts.find(
        (p) => String(p.id) === String(formData.parentProduct),
      );

      const entityData = {
        name: formData.name,
        type: "cutItem",
        unit: formData.unit,
        parentProduct: formData.parentProduct,
        canCut: false,
        isActive: true,
        transformationFactors: [
          {
            name: `Factor ${formData.name}`,
            factor: Number(formData.cutTransformationFactor),
            sourceUnit: formData.unit,
            destinationUnit: parentNode?.unit || "m",
          },
        ],
      };

      const result = await createProduct(entityData);

      if (!result.success) {
        throw new Error(result.error?.message || "Error al crear producto");
      }

      addToast({
        title: "Producto creado",
        description:
          "El producto se ha creado exitosamente y ha sido seleccionado.",
        color: "success",
      });

      if (onSuccess) {
        onSuccess(result.data);
      }

      setFormData({
        name: "",
        parentProduct: "",
        unit: "unit",
        cutTransformationFactor: "",
      });
      setInputValue("");
      onClose();
    } catch (error) {
      addToast({
        title: "Error",
        description: error.message,
        color: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="xl"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Crear Producto de Corte/Sublimado
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <Input
              label="Nombre del Producto Final (Ej: Tela Diseño Flores)"
              value={formData.name}
              onValueChange={(val) => setFormData({ ...formData, name: val })}
              isRequired
            />

            <Autocomplete
              label="Materia Prima Base (Bodega PrintLab o SmartCut)"
              placeholder="Buscar materia prima"
              inputValue={inputValue}
              isLoading={loadingParents}
              items={parentProducts}
              onInputChange={onInputChange}
              onSelectionChange={onSelectionChange}
              onOpenChange={setIsOpenAutocomplete}
              scrollRef={isOpenAutocomplete ? scrollerRef : null}
              selectedKey={
                formData.parentProduct ? String(formData.parentProduct) : null
              }
              isRequired
            >
              {(item) => (
                <AutocompleteItem key={item.id} textValue={item.name}>
                  {item.name}
                </AutocompleteItem>
              )}
            </Autocomplete>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Unidad Final"
                selectedKeys={[formData.unit]}
                onSelectionChange={(keys) =>
                  setFormData({ ...formData, unit: Array.from(keys)[0] })
                }
                isRequired
              >
                <SelectItem key="unit" value="unit">
                  Unidad (und)
                </SelectItem>
                <SelectItem key="piece" value="piece">
                  Pieza
                </SelectItem>
                <SelectItem key="m" value="m">
                  Metro (m)
                </SelectItem>
                <SelectItem key="kg" value="kg">
                  Kilogramo (kg)
                </SelectItem>
              </Select>

              <Input
                label="Factor de Transformación/Corte"
                type="number"
                value={formData.cutTransformationFactor}
                onValueChange={(val) =>
                  setFormData({ ...formData, cutTransformationFactor: val })
                }
                description="Cantidad de materia prima necesaria por cada unidad final."
                isRequired
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="danger" variant="light" onPress={onClose}>
            Cancelar
          </Button>
          <Button color="primary" isLoading={submitting} onPress={handleSubmit}>
            Crear Producto
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
