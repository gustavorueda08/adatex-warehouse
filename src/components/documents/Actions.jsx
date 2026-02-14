import { generateQuotationPDF } from "@/lib/utils/generateQuotationPDF";
import { exportDocumentToPDF } from "@/lib/utils/exportToPDF";
import { exportDocumentToExcel } from "@/lib/utils/exportToExcel";
import { ORDER_STATES } from "@/lib/utils/orderStates";
import { ORDER_TYPES } from "@/lib/utils/orderTypes";
import {
  addToast,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import React, { useState } from "react";

// Filter document to remove empty products and items before export
function filterDocumentForExport(document) {
  if (!document?.orderProducts) return document;

  return {
    ...document,
    orderProducts: document.orderProducts
      .filter((p) => {
        // Keep only products with product object and valid confirmedQuantity
        return (
          p.product &&
          p.confirmedQuantity !== null &&
          p.confirmedQuantity !== undefined &&
          p.confirmedQuantity !== 0
        );
      })
      .map((p) => ({
        ...p,
        // Filter items to only include those with currentQuantity
        items: (p.items || []).filter((item) => {
          const qty = Number(item.currentQuantity);
          return (
            item.currentQuantity !== "" &&
            item.currentQuantity !== null &&
            item.currentQuantity !== undefined &&
            !isNaN(qty) &&
            qty !== 0
          );
        }),
      })),
  };
}

export function ActionModalConfirm({
  title,
  description,
  onConfirm,
  isOpen,
  onOpenChange,
  loading,
  color,
  confirmText = "Confirmar",
}) {
  return (
    <Modal
      isOpen={isOpen}
      placement={"bottom-center"}
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>{title}</ModalHeader>
            <ModalBody>
              <p>{description}</p>
            </ModalBody>
            <ModalFooter>
              <Button color="default" variant="light" onPress={onClose}>
                Cancelar
              </Button>
              <Button color={color} onPress={onConfirm} isLoading={loading}>
                {confirmText}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

function DownloadFormatModal({
  isOpen,
  onOpenChange,
  onSelectFormat,
  loading,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="bottom-center"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>Descargar Lista de Empaque</ModalHeader>
            <ModalBody>
              <p>Seleccione el formato de descarga deseado:</p>
              <div className="flex flex-col gap-3 py-2">
                <Button
                  color="warning"
                  variant="flat"
                  onPress={() => onSelectFormat("pdf")}
                  isLoading={loading?.pdf}
                  className="w-full justify-start"
                  startContent={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                      />
                    </svg>
                  }
                >
                  Descargar PDF
                </Button>
                <Button
                  color="success"
                  variant="flat"
                  onPress={() => onSelectFormat("excel")}
                  isLoading={loading?.excel}
                  className="w-full justify-start"
                  startContent={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                      />
                    </svg>
                  }
                >
                  Descargar Excel
                </Button>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="default" variant="light" onPress={onClose}>
                Cancelar
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

export default function Actions({
  document,
  onUpdate,
  onComplete,
  onInvoice,
  getInvoices,
  onDelete,
  loadings: parentLoadings,
}) {
  const [localLoadings, setLocalLoadings] = useState({
    downloadingQuotation: false,
    downloadingPackingList: false, // kept for backward compat or generic loading
    downloadingPDF: false,
    downloadingExcel: false,
    downloadingInvoice: false,
    invoicing: false,
    deleting: false,
  });

  // Controls for Confirmation Modal
  const {
    isOpen: isConfirmOpen,
    onOpen: onConfirmOpen,
    onOpenChange: onConfirmOpenChange,
    onClose: onConfirmClose,
  } = useDisclosure();

  // Controls for Download Modal
  const {
    isOpen: isDownloadOpen,
    onOpen: onDownloadOpen,
    onOpenChange: onDownloadOpenChange,
    onClose: onDownloadClose,
  } = useDisclosure();

  const [modalConfig, setModalConfig] = useState({
    title: "",
    description: "",
    color: "",
    confirmText: "",
    onConfirm: async () => {},
    loadingKey: "", // 'invoicing' or 'deleting'
  });

  const handleAction = async (actionFn, loadingKey) => {
    if (!actionFn) return;
    try {
      setLocalLoadings((prev) => ({ ...prev, [loadingKey]: true }));
      await actionFn();
    } catch (error) {
      console.error(error);
    } finally {
      setLocalLoadings((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleDownloadSelect = async (format) => {
    let data = document;
    if (document.type === ORDER_TYPES.RETURN) {
      data.orderProducts = document.orderProducts.map((product) => {
        return {
          ...product,
          items: product.items.filter((item) => item.selected),
        };
      });
    }
    const filteredDocument = filterDocumentForExport(data);
    if (format === "pdf") {
      await handleAction(
        () => exportDocumentToPDF(filteredDocument),
        "downloadingPDF",
      );
    } else if (format === "excel") {
      await handleAction(
        () => exportDocumentToExcel(filteredDocument),
        "downloadingExcel",
      );
    }
    onDownloadClose();
  };

  const openConfirmModal = (type) => {
    if (type === "delete") {
      setModalConfig({
        title: "Eliminar",
        description:
          "¿Estás seguro de que quieres eliminar esta orden? Esta acción no se puede deshacer.",
        loadingKey: "deleting",
        color: "danger",
        confirmText: "Eliminar",
        onConfirm: async () => {
          await handleAction(async () => {
            await onDelete();
            onConfirmClose();
          }, "deleting");
        },
      });
    } else if (type === "invoice") {
      setModalConfig({
        title: "Facturar",
        description: "¿Estás seguro de que deseas facturar esta orden?",
        loadingKey: "invoicing",
        color: "secondary",
        confirmText: "Facturar",
        onConfirm: async () => {
          await handleAction(async () => {
            await onInvoice("completed", true);
            onConfirmClose();
          }, "invoicing");
        },
      });
    } else if (type === "complete") {
      setModalConfig({
        title: "Completar",
        description: "¿Estás seguro de que deseas completar esta orden?",
        loadingKey: "completing",
        color: "success",
        confirmText: "Completar",
        onConfirm: async () => {
          await handleAction(async () => {
            await onComplete("completed");
            onConfirmClose();
          }, "completing");
        },
      });
    }
    onConfirmOpen();
  };

  return (
    <div className="flex flex-col gap-3 p-4 md:grid md:grid-cols-2 lg:flex-row lg:flex">
      <Button
        isLoading={parentLoadings?.isUpdating}
        onPress={async () => {
          if (onUpdate) {
            await onUpdate();
          }
        }}
        isDisabled={document?.state === ORDER_STATES.COMPLETED}
      >
        Actualizar
      </Button>
      {document?.state === ORDER_STATES.CONFIRMED && (
        <Button
          isLoading={localLoadings.completing}
          color="success"
          onPress={() => openConfirmModal("complete")}
          isDisabled={
            document?.type === ORDER_TYPES.PURCHASE &&
            document?.destinationWarehouse?.type !== "stock"
          }
        >
          {document.type === ORDER_TYPES.SALE
            ? "Completar / Despachar"
            : "Completar"}
        </Button>
      )}
      {document?.type === ORDER_TYPES.SALE && (
        <Button
          isLoading={localLoadings.downloadingQuotation}
          color="primary"
          onPress={() => {
            const filteredDocument = filterDocumentForExport(document);
            handleAction(
              () => generateQuotationPDF(filteredDocument),
              "downloadingQuotation",
            );
          }}
        >
          Descargar Cotización
        </Button>
      )}
      <Button
        isLoading={
          localLoadings.downloadingPackingList ||
          localLoadings.downloadingPDF ||
          localLoadings.downloadingExcel
        }
        color="warning"
        onPress={onDownloadOpen}
      >
        Descargar Lista de Empaque
      </Button>
      {document?.type === ORDER_TYPES.SALE &&
        !(document?.siigoIdTypeA || document?.siigoIdTypeB) && (
          <Button
            color="secondary"
            isLoading={localLoadings.invoicing}
            onPress={() => openConfirmModal("invoice")}
            isDisabled={
              document?.state === ORDER_STATES.COMPLETED &&
              (document?.siigoIdTypeA || document?.siigoIdTypeB)
            }
          >
            Facturar Orden
          </Button>
        )}
      {document?.type === ORDER_TYPES.SALE &&
        (document?.siigoIdTypeA || document?.siigoIdTypeB) && (
          <Button
            color="secondary"
            isLoading={localLoadings.downloadingInvoice}
            onPress={() =>
              handleAction(async () => {
                try {
                  const res = await getInvoices(document.id);
                  if (!res.success) throw new Error(res.error);
                  addToast({
                    title: "Factura Descargada",
                    description: "La factura ha sido descargada correctamente",
                    type: "success",
                  });
                } catch (error) {
                  console.error(error);
                  addToast({
                    title: "Error al descargar",
                    description: "Ocurrió un error al descargar la factura",
                    type: "error",
                  });
                }
              }, "downloadingInvoice")
            }
          >
            Descargar Factura
          </Button>
        )}
      <Button
        color="danger"
        className="col-span-2"
        isLoading={localLoadings.deleting}
        onPress={() => openConfirmModal("delete")}
        isDisabled={document?.state === ORDER_STATES.COMPLETED}
      >
        Eliminar Orden
      </Button>

      {/* Confirmation Modal */}
      <ActionModalConfirm
        title={modalConfig.title}
        description={modalConfig.description}
        onConfirm={modalConfig.onConfirm}
        loading={localLoadings[modalConfig.loadingKey]}
        isOpen={isConfirmOpen}
        onOpenChange={onConfirmOpenChange}
        color={modalConfig.color}
        confirmText={modalConfig.confirmText}
      />

      {/* Download Format Selection Modal */}
      <DownloadFormatModal
        isOpen={isDownloadOpen}
        onOpenChange={onDownloadOpenChange}
        onSelectFormat={handleDownloadSelect}
        loading={{
          pdf: localLoadings.downloadingPDF,
          excel: localLoadings.downloadingExcel,
        }}
      />
    </div>
  );
}
