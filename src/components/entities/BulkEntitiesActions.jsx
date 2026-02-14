import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import React from "react";

export default function BulkEntitiesActions({
  entities,
  selectedKeys,
  onDelete,
  loading,
}) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const count =
    selectedKeys === "all" ? entities.length : selectedKeys.size || 0;

  return (
    <>
      <div className="flex flex-col md:flex-row ga-2 justify-center md:justify-end">
        <Button
          onPress={onOpen}
          color="danger"
          variant="flat"
          isLoading={loading}
        >
          Eliminar ({count})
        </Button>
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Confirmar eliminación
              </ModalHeader>
              <ModalBody>
                <p>
                  ¿Estás seguro de que deseas eliminar <strong>{count}</strong>{" "}
                  elementos seleccionados? Esta acción no se puede deshacer.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancelar
                </Button>
                <Button
                  color="danger"
                  onPress={() => {
                    onDelete();
                    onClose();
                  }}
                  isLoading={loading}
                >
                  Eliminar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
