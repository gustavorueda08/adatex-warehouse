import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  RadioGroup,
  Radio,
} from "@heroui/react";

/**
 * Modal to confirm how the user wants to download the inventory.
 * They can either download the currently visible page or the entire database.
 */
export default function ExportInventoryModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) {
  const [exportType, setExportType] = useState("current_page");

  const handleConfirm = () => {
    onConfirm(exportType);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="bottom-center">
      <ModalContent>
        <>
          <ModalHeader className="flex flex-col gap-1">
            Descargar Inventario
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-500 mb-2">
              ¿Qué datos deseas incluir en el archivo Excel?
            </p>
            <RadioGroup
              value={exportType}
              onValueChange={setExportType}
              color="secondary"
            >
              <Radio
                value="current_page"
                description="Descargar únicamente los productos que estás viendo en la página actual."
              >
                Página Actual
              </Radio>
              <Radio
                value="all_results"
                description="Descargar todos los productos de la base de datos que coincidan con los filtros actuales."
              >
                Toda la Base de Datos
              </Radio>
            </RadioGroup>
          </ModalBody>
          <ModalFooter>
            <Button
              color="default"
              variant="light"
              onPress={onClose}
              isDisabled={loading}
            >
              Cancelar
            </Button>
            <Button
              color="secondary"
              onPress={handleConfirm}
              isLoading={loading}
            >
              Descargar
            </Button>
          </ModalFooter>
        </>
      </ModalContent>
    </Modal>
  );
}
