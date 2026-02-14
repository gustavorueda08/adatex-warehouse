import { ActionModalConfirm } from "./Actions";
import { ORDER_STATES } from "@/lib/utils/orderStates";
import { Button, useDisclosure } from "@heroui/react";
import React, { useState } from "react";
import toast from "react-hot-toast";

export default function BulkActions({
  documents,
  selectedKeys,
  onUpdate,
  onDelete,
  refreshOrders,
  loading: parentLoading,
  showInvoiceButton = false,
}) {
  const [loading, setLoading] = useState({
    complete: false,
    invoice: false,
    delete: false,
  });

  const {
    isOpen: isConfirmOpen,
    onOpen: onConfirmOpen,
    onOpenChange: onConfirmOpenChange,
    onClose: onConfirmClose,
  } = useDisclosure();

  const [modalConfig, setModalConfig] = useState({
    title: "",
    description: "",
    onConfirm: async () => {},
    color: "",
    confirmText: "",
    loadingKey: "",
  });

  const getSelectedDocuments = () => {
    if (selectedKeys === "all") {
      return documents;
    }
    return documents.filter(
      (doc) =>
        selectedKeys.has(doc.id.toString()) || selectedKeys.has(Number(doc.id)),
    );
  };

  const handleBulkAction = async (actionFn, loadingKey, successMessage) => {
    const selectedDocs = getSelectedDocuments();
    if (selectedDocs.length === 0) return;

    setLoading((prev) => ({ ...prev, [loadingKey]: true }));
    const toastId = toast.loading("Procesando...");

    try {
      // Execute all actions in parallel
      await Promise.all(selectedDocs.map((doc) => actionFn(doc)));
      toast.success(successMessage, { id: toastId });
      if (refreshOrders) refreshOrders();
      onConfirmClose();
    } catch (error) {
      console.error(error);
      toast.error("Error al procesar algunos elementos", { id: toastId });
    } finally {
      setLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  const validateForInvoice = (doc) => {
    // Check if order has products
    if (!doc.orderProducts || doc.orderProducts.length === 0) return false;

    // Check if all products have price and items (quantity)
    return doc.orderProducts.every((op) => {
      const hasPrice = op.price > 0;
      const hasItems = op.items && op.items.length > 0;
      // Also check if quantities in items are valid > 0
      const hasValidQuantities =
        hasItems && op.items.every((item) => item.quantity > 0);
      return hasPrice && hasValidQuantities;
    });
  };

  const openConfirmModal = (type) => {
    const selectedDocs = getSelectedDocuments();
    const count = selectedDocs.length;

    if (type === "complete") {
      setModalConfig({
        title: "Completar Órdenes",
        description: `¿Estás seguro de que deseas marcar como COMPLETADAS ${count} órdenes seleccionadas?`,
        loadingKey: "complete",
        color: "success",
        confirmText: "Completar",
        onConfirm: () =>
          handleBulkAction(
            (doc) =>
              onUpdate(doc.id, {
                state: ORDER_STATES.COMPLETED,
              }),
            "complete",
            "Órdenes completadas correctamente",
          ),
      });
    } else if (type === "invoice") {
      // Pre-validation
      const invalidDocs = selectedDocs.filter(
        (doc) => !validateForInvoice(doc),
      );
      if (invalidDocs.length > 0) {
        toast.error(
          `No se puede facturar. ${invalidDocs.length} órdenes tienen productos sin precio o sin items confirmados.`,
        );
        return;
      }

      setModalConfig({
        title: "Facturar Órdenes",
        description: `¿Estás seguro de que deseas FACTURAR ${count} órdenes seleccionadas? Esto cambiará su estado a Completado y generará las facturas.`,
        loadingKey: "invoice",
        color: "secondary",
        confirmText: "Facturar",
        onConfirm: () =>
          handleBulkAction(
            (doc) =>
              onUpdate(doc.id, {
                state: ORDER_STATES.COMPLETED,
                emitInvoice: true,
              }),
            "invoice",
            "Órdenes facturadas correctamente",
          ),
      });
    } else if (type === "delete") {
      setModalConfig({
        title: "Eliminar Órdenes",
        description: `¿Estás seguro de que deseas ELIMINAR ${count} órdenes seleccionadas? Esta acción no se puede deshacer.`,
        loadingKey: "delete",
        color: "danger",
        confirmText: "Eliminar",
        onConfirm: () =>
          handleBulkAction(
            (doc) => onDelete(doc.id),
            "delete",
            "Órdenes eliminadas correctamente",
          ),
      });
    }
    onConfirmOpen();
  };

  if (!selectedKeys || (selectedKeys !== "all" && selectedKeys.size === 0)) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col md:flex-row gap-2 md:justify-end md:mb-4">
        <Button
          color="success"
          variant="flat"
          onPress={() => openConfirmModal("complete")}
          isDisabled={parentLoading}
        >
          Completar
        </Button>
        {showInvoiceButton && (
          <Button
            color="secondary"
            variant="flat"
            onPress={() => openConfirmModal("invoice")}
            isDisabled={parentLoading}
          >
            Facturar
          </Button>
        )}
        <Button
          color="danger"
          variant="flat"
          onPress={() => openConfirmModal("delete")}
          isDisabled={parentLoading}
        >
          Eliminar
        </Button>
      </div>

      <ActionModalConfirm
        title={modalConfig.title}
        description={modalConfig.description}
        onConfirm={modalConfig.onConfirm}
        loading={loading[modalConfig.loadingKey]}
        isOpen={isConfirmOpen}
        onOpenChange={onConfirmOpenChange}
        color={modalConfig.color}
        confirmText={modalConfig.confirmText}
      />
    </>
  );
}
