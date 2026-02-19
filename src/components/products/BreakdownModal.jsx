import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from "@heroui/react";
import format from "@/lib/utils/format";
import Link from "next/link";
import moment from "moment-timezone";

const CATEGORY_LABELS = {
  production: "En Producción",
  transit: "En Tránsito",
  required: "Requerido",
  arriving: "Llegando",
  reserved: "Reservado",
};

/**
 * Modal that shows the breakdown (order-level details) of an inventory category.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {string} props.productName
 * @param {string} props.unit - product unit (m, und, kg)
 * @param {string} props.category - "production" | "transit" | "required" | "arriving"
 * @param {Array} props.entries - breakdown entries from the API
 */
export default function BreakdownModal({
  isOpen,
  onClose,
  productName,
  unit = "",
  category,
  entries = [],
}) {
  const label = CATEGORY_LABELS[category] || category;
  const isCustomerCategory = category === "required";

  const total = entries.reduce((sum, e) => sum + (Number(e.quantity) || 0), 0);

  const columns = [
    { key: "orderCode", label: "Orden" },
    { key: "quantity", label: "Cantidad" },
    ...(isCustomerCategory
      ? [{ key: "customer", label: "Cliente" }]
      : [{ key: "supplier", label: "Proveedor" }]),
    { key: "estimatedCompletedDate", label: "Fecha Est." },
  ];

  const getOrderLink = (entry) => {
    if (!entry.order) return null;
    // required = sale orders, others = purchase orders
    const basePath = isCustomerCategory ? "/sales" : "/purchases";
    return `${basePath}/${entry.order}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <span className="text-lg font-bold">{label}</span>
          <span className="text-sm text-default-500 font-normal">
            {productName}
          </span>
        </ModalHeader>
        <ModalBody>
          <Table aria-label={`Desglose de ${label}`} removeWrapper>
            <TableHeader>
              {columns.map((col) => (
                <TableColumn key={col.key}>{col.label}</TableColumn>
              ))}
            </TableHeader>
            <TableBody emptyContent="Sin desglose disponible">
              {entries.map((entry, index) => (
                <TableRow key={entry.order || index}>
                  <TableCell>
                    {getOrderLink(entry) ? (
                      <Link
                        href={getOrderLink(entry)}
                        className="text-primary hover:underline font-mono text-sm"
                      >
                        {entry.orderCode || `#${entry.order}`}
                      </Link>
                    ) : (
                      <span className="font-mono text-sm text-default-400">
                        {entry.orderCode || "-"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {format(entry.quantity || 0)} {unit}
                  </TableCell>
                  <TableCell>
                    {isCustomerCategory
                      ? entry.customer || "-"
                      : entry.supplier || "-"}
                  </TableCell>
                  <TableCell className="text-default-500 text-sm">
                    {entry.estimatedCompletedDate
                      ? moment(entry.estimatedCompletedDate).format(
                          "DD/MM/YYYY",
                        )
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {entries.length > 0 && (
            <div className="flex justify-between items-center px-3 py-2 bg-default-100 rounded-lg mt-2">
              <span className="font-semibold text-sm">Total</span>
              <span className="font-bold">
                {format(total)} {unit}
              </span>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            Cerrar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
