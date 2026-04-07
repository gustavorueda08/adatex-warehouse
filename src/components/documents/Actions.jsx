import { generateQuotationPDF } from "@/lib/utils/generateQuotationPDF";
import { exportDocumentToPDF } from "@/lib/utils/exportToPDF";
import { exportDocumentToExcel } from "@/lib/utils/exportToExcel";
import { ORDER_STATES } from "@/lib/utils/orderStates";
import { ORDER_TYPES } from "@/lib/utils/orderTypes";
import {
  addToast,
  Button,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import React, { useState } from "react";
import { useUser } from "@/lib/hooks/useUser";

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
  onCreateSaleInvoice,
  getInvoices,
  onCreditNote,
  getCreditNotePdf,
  onCreatePurchaseInvoice,
  onUpdatePurchaseInvoice,
  onDelete,
  onApproveCredit,
  loadings: parentLoadings,
  showAdminActions = true,
}) {
  const { user } = useUser();
  const [localLoadings, setLocalLoadings] = useState({
    downloadingQuotation: false,
    downloadingPackingList: false, // kept for backward compat or generic loading
    downloadingPDF: false,
    downloadingExcel: false,
    downloadingInvoice: false,
    invoicing: false,
    deleting: false,
    approvingCredit: false,
    issuingCreditNote: false,
    downloadingCreditNote: false,
    creatingPurchaseInvoice: false,
    updatingPurchaseInvoice: false,
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
            await (onCreateSaleInvoice ? onCreateSaleInvoice() : onInvoice?.("completed", true));
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
    } else if (type === "approveCredit") {
      setModalConfig({
        title: "Aprobar Excepción de Crédito",
        description:
          "Esta acción permitirá al área de bodega despachar y facturar esta orden aunque el cliente esté bloqueado por cupo o cartera vencida. ¿Confirmar?",
        loadingKey: "approvingCredit",
        color: "warning",
        confirmText: "Aprobar Excepción",
        onConfirm: async () => {
          await handleAction(async () => {
            await onApproveCredit(document.id, true);
            onConfirmClose();
          }, "approvingCredit");
        },
      });
    } else if (type === "revokeCredit") {
      setModalConfig({
        title: "Revocar Excepción de Crédito",
        description:
          "¿Revocar la excepción de crédito? El cliente volverá a estar bloqueado para esta orden.",
        loadingKey: "approvingCredit",
        color: "danger",
        confirmText: "Revocar",
        onConfirm: async () => {
          await handleAction(async () => {
            await onApproveCredit(document.id, false);
            onConfirmClose();
          }, "approvingCredit");
        },
      });
    } else if (type === "creditNote") {
      setModalConfig({
        title: "Emitir Nota Crédito",
        description:
          "¿Deseas emitir una nota crédito en Siigo para esta devolución? Se generará vinculada a la factura de venta original.",
        loadingKey: "issuingCreditNote",
        color: "secondary",
        confirmText: "Emitir Nota Crédito",
        onConfirm: async () => {
          await handleAction(async () => {
            await onCreditNote();
            onConfirmClose();
          }, "issuingCreditNote");
        },
      });
    } else if (type === "createPurchaseInvoice") {
      setModalConfig({
        title: "Crear Soporte Contable",
        description:
          "¿Deseas crear el soporte contable (factura de compra FC) en Siigo para esta orden?",
        loadingKey: "creatingPurchaseInvoice",
        color: "secondary",
        confirmText: "Crear Soporte Contable",
        onConfirm: async () => {
          await handleAction(async () => {
            await onCreatePurchaseInvoice();
            onConfirmClose();
          }, "creatingPurchaseInvoice");
        },
      });
    } else if (type === "updatePurchaseInvoice") {
      setModalConfig({
        title: "Actualizar Soporte Contable",
        description:
          "¿Deseas actualizar el soporte contable en Siigo con las cantidades y estado actuales de esta orden?",
        loadingKey: "updatingPurchaseInvoice",
        color: "primary",
        confirmText: "Actualizar Soporte Contable",
        onConfirm: async () => {
          await handleAction(async () => {
            await onUpdatePurchaseInvoice();
            onConfirmClose();
          }, "updatingPurchaseInvoice");
        },
      });
    }
    onConfirmOpen();
  };

  return (
    <div className="flex flex-col gap-3 p-4 md:grid md:grid-cols-2 lg:flex-row lg:flex">
      {showAdminActions && (
        <Button
          isLoading={parentLoadings?.isUpdating}
          onPress={async () => {
            if (onUpdate) {
              await onUpdate();
            }
          }}
          isDisabled={
            document?.state === ORDER_STATES.COMPLETED && user?.type !== "admin"
          }
        >
          Actualizar
        </Button>
      )}
      {document?.state === ORDER_STATES.CONFIRMED && showAdminActions && (
        <Button
          isLoading={localLoadings.completing}
          color="success"
          onPress={() => openConfirmModal("complete")}
          isDisabled={
            document?.type === ORDER_TYPES.PURCHASE &&
            document?.destinationWarehouse?.type !== "stock" &&
            document?.destinationWarehouse?.type !== "freeTradeZone"
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
            handleAction(
              () => generateQuotationPDF(document),
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
        document?.state === ORDER_STATES.COMPLETED &&
        showAdminActions &&
        onCreateSaleInvoice &&
        !(document?.siigoIdTypeA || document?.siigoIdTypeB) && (
          <Button
            color="secondary"
            isLoading={localLoadings.invoicing}
            onPress={() => openConfirmModal("invoice")}
          >
            Facturar Orden
          </Button>
        )}
      {document?.type === ORDER_TYPES.SALE &&
        document?.state === ORDER_STATES.COMPLETED &&
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
      {document?.type === ORDER_TYPES.RETURN &&
        document?.state === ORDER_STATES.COMPLETED &&
        onCreditNote &&
        (document?.parentOrder?.siigoIdTypeA ||
          document?.parentOrder?.siigoIdTypeB ||
          document?.parentOrder?.siigoId) &&
        !document?.creditNoteIdTypeA &&
        !document?.creditNoteIdTypeB && (
          <Button
            color="secondary"
            isLoading={localLoadings.issuingCreditNote}
            onPress={() => openConfirmModal("creditNote")}
          >
            Emitir Nota Crédito
          </Button>
        )}
      {document?.type === ORDER_TYPES.RETURN &&
        (document?.creditNoteIdTypeA || document?.creditNoteIdTypeB) && (
          <Button
            color="secondary"
            isLoading={localLoadings.downloadingCreditNote}
            onPress={() =>
              handleAction(async () => {
                try {
                  const res = await getCreditNotePdf(document.id);
                  if (!res.success) throw new Error(res.error?.message);
                  addToast({
                    title: "Nota Crédito Descargada",
                    description:
                      "La nota crédito ha sido descargada correctamente",
                    type: "success",
                  });
                } catch (error) {
                  console.error(error);
                  addToast({
                    title: "Error al descargar",
                    description:
                      "Ocurrió un error al descargar la nota crédito",
                    type: "error",
                  });
                }
              }, "downloadingCreditNote")
            }
          >
            Descargar Nota Crédito
          </Button>
        )}
      {/* Botón: Crear Soporte Contable (cuando no existe aún) */}
      {document?.type === ORDER_TYPES.PURCHASE &&
        onCreatePurchaseInvoice &&
        !document?.purchaseSiigoId && (
          <Button
            color="secondary"
            isLoading={localLoadings.creatingPurchaseInvoice}
            onPress={() => openConfirmModal("createPurchaseInvoice")}
          >
            Crear Soporte Contable
          </Button>
        )}
      {/* Chip + Botón: Actualizar Soporte Contable (cuando ya existe) */}
      {document?.type === ORDER_TYPES.PURCHASE &&
        document?.purchaseSiigoId && (
          <div className="flex items-center gap-2 col-span-2">
            <Chip color="success" variant="flat" size="sm">
              Siigo FC: {document.purchaseInvoiceNumber || document.purchaseSiigoId}
            </Chip>
            {onUpdatePurchaseInvoice && (
              <Button
                size="sm"
                color="primary"
                variant="flat"
                isLoading={localLoadings.updatingPurchaseInvoice}
                onPress={() => openConfirmModal("updatePurchaseInvoice")}
              >
                Actualizar
              </Button>
            )}
          </div>
        )}
      {user?.type === "admin" &&
        document?.type === ORDER_TYPES.SALE &&
        document?.state !== ORDER_STATES.COMPLETED &&
        document?.customer?.creditLimit > 0 &&
        onApproveCredit &&
        !document?.creditBlockOverridden && (
          <Button
            color="warning"
            variant="flat"
            isLoading={localLoadings.approvingCredit}
            onPress={() => openConfirmModal("approveCredit")}
          >
            Aprobar Excepción de Crédito
          </Button>
        )}
      {user?.type === "admin" &&
        document?.type === ORDER_TYPES.SALE &&
        document?.state !== ORDER_STATES.COMPLETED &&
        document?.customer?.creditLimit > 0 &&
        onApproveCredit &&
        document?.creditBlockOverridden && (
          <div className="flex items-center gap-2 col-span-2">
            <Chip color="success" variant="flat" size="sm">
              Excepción de Crédito Aprobada
            </Chip>
            <Button
              size="sm"
              color="danger"
              variant="light"
              isLoading={localLoadings.approvingCredit}
              onPress={() => openConfirmModal("revokeCredit")}
            >
              Revocar
            </Button>
          </div>
        )}
      {showAdminActions && (
        <Button
          color="danger"
          className="col-span-2"
          isLoading={localLoadings.deleting}
          onPress={() => openConfirmModal("delete")}
          isDisabled={
            document?.state === ORDER_STATES.COMPLETED && user?.type !== "admin"
          }
        >
          Eliminar Orden
        </Button>
      )}
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
