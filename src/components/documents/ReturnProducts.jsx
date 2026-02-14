"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Checkbox,
  Table,
  TableColumn,
  TableHeader,
  TableBody,
  TableCell,
  TableRow,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
} from "@heroui/react";
import classNames from "classnames";
import DebouncedInput from "../ui/DebounceInput";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import format from "@/lib/utils/format";

function ModalReturnItems({ product, setDocument, disabled = false }) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedKeys, setSelectedKeys] = useState(new Set([]));

  // Sincronizar selectedKeys con product.items, pero solo cuando realmente cambia
  useEffect(() => {
    const items = product.items || [];
    const selectedIds = items
      .filter((item) => item?.selected)
      .map((item) => String(item?.id));

    // Solo actualizar si el contenido realmente cambió
    const currentIds = [...selectedKeys].sort().join(",");
    const newIds = [...selectedIds].sort().join(",");
    if (currentIds !== newIds) {
      setSelectedKeys(new Set(selectedIds));
    }
  }, [product.items]);

  const columns = useMemo(() => {
    return [
      {
        key: "currentQuantity",
        label: "Cantidad",
      },
      {
        key: "returnQuantity",
        label: "Retornar",
      },
    ];
  }, []);

  const handleSelectionChange = (keys) => {
    // Construir un Set de string IDs
    let newSelectedIds;

    if (keys === "all") {
      newSelectedIds = new Set(
        (product.items || []).map((item) => String(item.id)),
      );
    } else {
      newSelectedIds = new Set([...keys].map(String));
    }

    // Verificar si realmente cambió la selección
    const currentIds = [...selectedKeys].sort().join(",");
    const newIds = [...newSelectedIds].sort().join(",");
    if (currentIds === newIds) return;

    // Actualizar estado local
    setSelectedKeys(newSelectedIds);

    // Actualizar el estado de selected en cada item y establecer returnQuantity
    if (!setDocument) return;

    setDocument((prev) => {
      const updatedOrderProducts = prev.orderProducts.map((op) => {
        if (op.id !== product.id) return op;

        const updatedItems = (op.items || []).map((item) => {
          const isSelected = newSelectedIds.has(String(item.id));
          const currentQty = item.currentQuantity || item.quantity || 0;

          if (isSelected && !item.selected) {
            // Seleccionando por primera vez
            return {
              ...item,
              selected: true,
              returnQuantity: currentQty,
            };
          }

          if (!isSelected && item.selected) {
            // Deseleccionando
            return {
              ...item,
              selected: false,
              returnQuantity: 0,
            };
          }

          // Sin cambio
          return item;
        });

        return {
          ...op,
          items: updatedItems,
        };
      });

      return {
        ...prev,
        orderProducts: updatedOrderProducts,
      };
    });
  };

  const handleQuantityChange = (itemId, value) => {
    if (!setDocument) return;
    setDocument((prev) => {
      const updatedOrderProducts = prev.orderProducts.map((op) => {
        if (op.id !== product.id) return op;

        const updatedItems = (op.items || []).map((item) => {
          if (item.id !== itemId) return item;

          const numValue = Number(value) || 0;
          const maxQuantity = item.currentQuantity || item.quantity || 0;
          // Validar que esté entre 0 y la cantidad máxima
          const validValue = Math.min(Math.max(0, numValue), maxQuantity);

          return {
            ...item,
            returnQuantity: validValue,
          };
        });
        return {
          ...op,
          items: updatedItems,
        };
      });
      return {
        ...prev,
        orderProducts: updatedOrderProducts,
      };
    });
  };

  const renderCell = (item, columnKey) => {
    // selectedKeys siempre es un Set de strings
    const isSelected = selectedKeys.has(String(item.id));

    // Detener todos los eventos que HeroUI usa para selección
    const stopEvents = {
      onClick: (e) => e.stopPropagation(),
      onPointerDown: (e) => e.stopPropagation(),
      onMouseDown: (e) => e.stopPropagation(),
      onPointerUp: (e) => e.stopPropagation(),
    };

    switch (columnKey) {
      case "currentQuantity":
        return (
          <div {...stopEvents}>
            <Input
              value={String(item.currentQuantity || item.quantity || 0)}
              readOnly
            />
          </div>
        );
      case "returnQuantity":
        return (
          <div {...stopEvents}>
            <DebouncedInput
              initialValue={String(item.returnQuantity || 0)}
              onDebouncedChange={(value) =>
                handleQuantityChange(item.id, value)
              }
              disabled={!isSelected || disabled}
            />
          </div>
        );
      default:
        return "";
    }
  };
  return (
    <>
      <Button
        size="sm"
        variant="light"
        isIconOnly
        onPress={onOpen}
        className=""
      >
        <Squares2X2Icon className="w-5 h-5 m-auto" />
      </Button>
      <Modal isOpen={isOpen} onClose={onOpenChange} size="5xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {product.product?.name}
              </ModalHeader>
              <ModalBody>
                <Table
                  selectionMode={"multiple"}
                  disabledKeys={
                    disabled
                      ? new Set([...product.items.map((i) => String(i.id))])
                      : new Set()
                  }
                  selectedKeys={selectedKeys}
                  onSelectionChange={handleSelectionChange}
                >
                  <TableHeader columns={columns}>
                    {(column) => (
                      <TableColumn key={column.key}>{column.label}</TableColumn>
                    )}
                  </TableHeader>
                  <TableBody items={product.items}>
                    {(item) => (
                      <TableRow key={item.id}>
                        {(columnKey) => (
                          <TableCell>{renderCell(item, columnKey)}</TableCell>
                        )}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cerrar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

export default function ReturnProducts({
  orderProducts = [],
  setDocument,
  disabled = false,
}) {
  const screenSize = useScreenSize();
  const [isOpenModal, setIsOpenModal] = useState(false);
  const columns = useMemo(() => {
    if (screenSize !== "lg") {
      return [
        {
          key: "more",
          label: <Squares2X2Icon className="w-5 h-5" />,
        },
        {
          key: "name",
          label: "Producto",
        },
        {
          key: "returnQuantity",
          label: "Retornar",
        },
      ];
    }
    return [
      {
        key: "more",
        label: <Squares2X2Icon className="w-5 h-5" />,
      },
      {
        key: "name",
        label: "Producto",
      },
      {
        key: "availableItems",
        label: "Items disponibles",
      },
      {
        key: "selectedItems",
        label: "Items seleccionados",
      },
      {
        key: "returnQuantity",
        label: "Cantidad a devolver",
      },
    ];
  }, [orderProducts, setDocument, screenSize]);

  const renderCell = (product, columnKey) => {
    switch (columnKey) {
      case "more":
        return (
          <ModalReturnItems
            product={product}
            setDocument={setDocument}
            disabled={disabled}
          />
        );
      case "name":
        return (
          <p className="font-semibold text-nowrap">{product.product?.name}</p>
        );
      case "availableItems":
        return (
          <p>
            {format(product.items?.filter((i) => i.state === "sold").length)}
            {" Items"}
          </p>
        );
      case "selectedItems":
        return (
          <p className="font-semibold">
            {format(product.items?.filter((i) => i.selected).length)} {" Items"}
          </p>
        );
      case "returnQuantity":
        return (
          <p className="font-semibold">
            {format(
              product.items
                ?.filter((i) => i.selected)
                .reduce((acc, i) => acc + i?.returnQuantity || 0, 0),
            )}{" "}
            {product.unit}
          </p>
        );
    }
  };

  return (
    <>
      <Table className="p-2" shadow="none">
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn key={column.key}>{column.label}</TableColumn>
          )}
        </TableHeader>
        <TableBody
          items={orderProducts}
          emptyContent={"Selecciona una orden de venta"}
        >
          {(product) => (
            <TableRow key={product.id}>
              {(columnKey) => (
                <TableCell>{renderCell(product, columnKey)}</TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}
