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
 * Modal to confirm how the user wants to download the customers.
 * They can either download the currently visible page or the entire database.
 */
export default function ExportCustomersModal({
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
            Exportar Clientes a Excel
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-500 mb-2">
              ¿Qué datos deseas incluir en el archivo Excel?
            </p>
            <RadioGroup
              value={exportType}
              onValueChange={setExportType}
              color="success"
            >
              <Radio
                value="current_page"
                description="Descargar únicamente los clientes de la tabla actual."
              >
                Página Actual
              </Radio>
              <Radio
                value="all_results"
                description="Descargar todos los clientes que coincidan con los filtros de búsqueda actuales."
              >
                Todos los Resultados
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
              color="success"
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
