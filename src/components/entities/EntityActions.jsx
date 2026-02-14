import { Button, useDisclosure } from "@heroui/react";
import React, { useState } from "react";
import { ActionModalConfirm } from "../documents/Actions";

export default function EntityActions({
  onUpdate,
  onDelete,
  isLoading: parentLoading,
}) {
  const [localLoading, setLocalLoading] = useState({
    updating: false,
    deleting: false,
  });

  const {
    isOpen: isConfirmOpen,
    onOpen: onConfirmOpen,
    onOpenChange: onConfirmOpenChange,
    onClose: onConfirmClose,
  } = useDisclosure();

  const handleUpdate = async () => {
    if (!onUpdate) return;
    try {
      setLocalLoading((prev) => ({ ...prev, updating: true }));
      await onUpdate();
    } catch (error) {
      console.error(error);
    } finally {
      setLocalLoading((prev) => ({ ...prev, updating: false }));
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    try {
      setLocalLoading((prev) => ({ ...prev, deleting: true }));
      await onDelete();
      onConfirmClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLocalLoading((prev) => ({ ...prev, deleting: false }));
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 md:grid md:grid-cols-2 lg:flex-row lg:flex">
      <Button
        isLoading={parentLoading || localLoading.updating}
        onPress={handleUpdate}
        color="primary"
        isDisabled={localLoading.deleting}
      >
        Actualizar
      </Button>
      {onDelete && (
        <Button
          isLoading={localLoading.deleting}
          onPress={onConfirmOpen}
          color="danger"
          variant="flat"
          isDisabled={parentLoading || localLoading.updating}
        >
          Eliminar
        </Button>
      )}

      <ActionModalConfirm
        title="Eliminar registro"
        description="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
        onConfirm={handleDelete}
        loading={localLoading.deleting}
        isOpen={isConfirmOpen}
        onOpenChange={onConfirmOpenChange}
        color="danger"
        confirmText="Eliminar"
      />
    </div>
  );
}
