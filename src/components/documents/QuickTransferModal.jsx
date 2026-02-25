"use client";

import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  addToast,
} from "@heroui/react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { useOrders } from "@/lib/hooks/useOrders";

export default function QuickTransferModal({
  isOpen,
  onOpenChange,
  onTransferComplete,
  cutItemProduct,
}) {
  const [sourceWarehouse, setSourceWarehouse] = useState(null);
  const [destinationWarehouse, setDestinationWarehouse] = useState(null);
  const [quantity, setQuantity] = useState("");

  const { createOrder, creating } = useOrders(
    {},
    {
      enabled: false,
    },
  );

  const parentProduct = cutItemProduct?.parentProduct;

  const handleTransfer = async (onClose) => {
    if (
      !sourceWarehouse ||
      !destinationWarehouse ||
      !quantity ||
      !parentProduct
    )
      return;

    try {
      const payload = {
        type: "transfer",
        state: "completed",
        products: [
          {
            requestedQuantity: Number(quantity),
            product: parentProduct.id,
            price: 0,
          },
        ],
        sourceWarehouse: sourceWarehouse.id,
        destinationWarehouse: destinationWarehouse.id,
        createdDate: new Date(),
        completedDate: new Date(),
        confirmedDate: new Date(),
      };
      const result = await createOrder(payload);
      if (result.success) {
        addToast({
          title: "Transferencia Exitosa",
          description: "Los items han sido transferidos correctamente.",
          color: "success",
        });
        onTransferComplete();
        onClose();
        setQuantity("");
        setSourceWarehouse(null);
        setDestinationWarehouse(null);
      } else {
        throw new Error(result.error?.message || "Error al transferir");
      }
    } catch (error) {
      console.error(error);
      addToast({
        title: "Error al Transferir",
        description:
          error.message || "No se pudo realizar la transferencia rápida",
        color: "danger",
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              Transferencia Rápida
            </ModalHeader>
            <ModalBody>
              {parentProduct ? (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-default-500">
                    Mover <strong>{parentProduct.name}</strong> a bodega
                    SmartCut para completar el corte.
                  </p>

                  <SearchableSelect
                    label="Bodega Origen (Stock)"
                    listType="warehouses"
                    selectionMode="single"
                    value={sourceWarehouse ? [sourceWarehouse] : []}
                    onChange={(items) => setSourceWarehouse(items[0] || null)}
                    filters={(search) => {
                      const base = { type: { $eq: "stock" } };
                      if (!search) return base;
                      return {
                        $and: [base, { name: { $containsi: search } }],
                      };
                    }}
                    renderItem={(item) => item.name}
                  />

                  <SearchableSelect
                    label="Bodega Destino (SmartCut)"
                    listType="warehouses"
                    selectionMode="single"
                    value={destinationWarehouse ? [destinationWarehouse] : []}
                    onChange={(items) =>
                      setDestinationWarehouse(items[0] || null)
                    }
                    filters={(search) => {
                      const base = { type: { $eq: "smartCut" } };
                      if (!search) return base;
                      return {
                        $and: [base, { name: { $containsi: search } }],
                      };
                    }}
                    renderItem={(item) => item.name}
                  />

                  <Input
                    label="Cantidad a Transferir"
                    type="number"
                    value={quantity}
                    onValueChange={setQuantity}
                    endContent={
                      <div className="pointer-events-none flex items-center">
                        <span className="text-default-400 text-small">
                          {parentProduct.unit}
                        </span>
                      </div>
                    }
                  />
                </div>
              ) : (
                <p className="text-sm text-danger">
                  El producto cortado no tiene un producto padre asignado. No se
                  puede realizar transferencia.
                </p>
              )}
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                Cancelar
              </Button>
              <Button
                color="primary"
                onPress={() => handleTransfer(onClose)}
                isLoading={creating}
                isDisabled={
                  !sourceWarehouse ||
                  !destinationWarehouse ||
                  !quantity ||
                  !parentProduct ||
                  Number(quantity) <= 0
                }
              >
                Transferir
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
