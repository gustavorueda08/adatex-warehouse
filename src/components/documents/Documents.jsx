import { useOrders } from "@/lib/hooks/useOrders";
import { getChipVariant } from "@/lib/utils/getChipVariant";
import { getDocumentLabel } from "@/lib/utils/getDocumentLabel";
import { getPartyLabel } from "@/lib/utils/getPartyLabel";
import {
  getOrderStateDataFromState,
  ORDER_STATES,
  orderStatesArray,
} from "@/lib/utils/orderStates";
import { ORDER_TYPES } from "@/lib/utils/orderTypes";
import {
  UserIcon,
  CalendarIcon,
  DocumentTextIcon,
  RectangleStackIcon,
  EllipsisHorizontalCircleIcon,
} from "@heroicons/react/24/outline";
import {
  Table,
  useDisclosure,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Pagination,
  Skeleton,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Chip,
  Card,
} from "@heroui/react";
import moment from "moment-timezone";
import Link from "next/link";
import { useState } from "react";
import Products from "./Products";
import PInvoice from "./PInvoice";

function ModalDocumentResume({ document, isOpen, onOpenChange, screenSize }) {
  if (!document) return null;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      size={screenSize === "lg" ? "5xl" : "full"}
      scrollBehavior="inside"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-row justify-between items-center py-4">
              <div className="flex flex-col  gap-3">
                <h2 className="text-xl font-bold text-default-900">
                  Orden {document.code}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-small text-default-500 font-normal">
                    {getDocumentLabel(document, {
                      includeCode: false,
                      includeInvoices: true,
                      includeContainerCode: true,
                    })}
                  </span>
                  <Chip
                    color={getChipVariant(document)}
                    size="sm"
                    variant="flat"
                    className="capitalize"
                  >
                    {getOrderStateDataFromState(document.state).label}
                  </Chip>
                </div>
              </div>
            </ModalHeader>
            <ModalBody className="p-4 md:p-6 gap-6">
              {/* Metadata Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card de Cliente o Proveedor */}
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary-50 text-primary self-center">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-tiny text-default-500 font-bold">
                        {document.type === ORDER_TYPES.SALE
                          ? "Cliente"
                          : "Proveedor"}
                      </span>
                      <span className="text-sm font-semibold text-default-900">
                        {getPartyLabel(
                          document.type === ORDER_TYPES.SALE
                            ? document.customer
                            : document.supplier,
                        )}
                      </span>
                      {document.customerForInvoice &&
                        document.type === ORDER_TYPES.SALE && (
                          <div className="mt-1 flex flex-col">
                            <span className="text-tiny text-default-400 font-bold">
                              Facturar a:
                            </span>
                            <span className="text-tiny text-default-700">
                              {getPartyLabel(document.customerForInvoice)}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                </Card>
                {/* Card de Fechas */}
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-secondary-50 text-secondary self-center">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-tiny text-default-500 font-bold">
                        Fechas
                      </span>
                      <div className="flex flex-col text-small">
                        <div className="flex justify-between gap-2">
                          <span className="text-default-500">Creado:</span>
                          <span className="text-default-900 font-medium">
                            {moment(document.createdAt).format("DD/MM/YYYY")}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-default-500">Actualizado:</span>
                          <span className="text-default-900 font-medium">
                            {moment(document.updatedAt).format("DD/MM/YYYY")}
                          </span>
                        </div>
                        {document.state === ORDER_STATES.COMPLETED && (
                          <div className="flex justify-between gap-2">
                            <span className="text-default-500">
                              Completado:
                            </span>
                            <span className="text-default-900 font-medium">
                              {moment(document.completedDate).format(
                                "DD/MM/YYYY",
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
              {/* Products Section */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-1">
                  <DocumentTextIcon className="w-5 h-5 text-default-500" />
                  <h3 className="text-lg font-semibold text-default-900">
                    Productos
                  </h3>
                </div>
                <Card className="overflow-hidden">
                  <Products
                    products={document.orderProducts}
                    showSmallColumns={true}
                  />
                </Card>
              </div>
              {/* Financial Section (Sales Only) */}
              {document.type === ORDER_TYPES.SALE && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 px-1">
                    <DocumentTextIcon className="w-5 h-5 text-default-500" />
                    <h3 className="text-lg font-semibold text-default-900">
                      Resumen Financiero
                    </h3>
                  </div>
                  <Card className="overflow-hidden">
                    <PInvoice
                      document={document}
                      taxes={document?.customerForInvoice?.taxes || []}
                    />
                  </Card>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button onPress={onClose} variant="light" color="danger">
                Cerrar
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

export default function Documents({
  documents = [],
  columns = [],
  pagination,
  setPagination,
  pageCount,
  loading = true,
  screenSize,
  selectedKeys,
  setSelectedKeys,
}) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [documentForResume, setDocumentForResume] = useState(null);

  const getDocumentLink = (document) => {
    switch (document.type) {
      case ORDER_TYPES.SALE:
        return `/sales/${document.id}`;
      case ORDER_TYPES.PURCHASE:
        return `/purchases/${document.id}`;
      case ORDER_TYPES.IN:
        return `/inflows/${document.id}`;
      case ORDER_TYPES.OUT:
        return `/outflows/${document.id}`;
      case ORDER_TYPES.TRANSFER:
        return `/transfers/${document.id}`;
      case ORDER_TYPES.RETURN:
        return `/returns/${document.id}`;
      case ORDER_TYPES.TRANSFORM:
        return `/transformations/${document.id}`;
      default:
        return "/";
    }
  };

  const handleSelectionChange = (keys) => {
    console.log("PASO", keys);

    setSelectedKeys(keys === "all" ? "all" : new Set([...keys]));
  };

  const renderCell = (document, columnKey) => {
    switch (columnKey) {
      case "invoice":
        return (
          <Link href={getDocumentLink(document)}>
            <p className="focus:underline hover:underline text-xs md:text-sm text-nowrap">
              {getDocumentLabel(document, {
                includeCode: false,
                includeContainerCode: false,
                includeInvoices: true,
              })}
            </p>
          </Link>
        );
      case "code":
        return (
          <Link href={getDocumentLink(document)}>
            <p className="focus:underline hover:underline text-nowrap">
              {getDocumentLabel(document, {
                includeCode:
                  screenSize !== "lg" && document.type === ORDER_TYPES.PURCHASE
                    ? false
                    : true,
                includeContainerCode:
                  document.type === ORDER_TYPES.PURCHASE ? true : false,
                includeInvoices: false,
              })}
            </p>
          </Link>
        );
      case "customer":
        return (
          <Link href={`/customers/${document?.customer?.id}`}>
            <p className="focus:underline hover:underline text-nowrap">
              {getPartyLabel(document?.customer)}
            </p>
          </Link>
        );
      case "supplier":
        return (
          <Link href={`/suppliers/${document?.supplier?.id}`}>
            <p className="focus:underline hover:underline text-nowrap">
              {getPartyLabel(document?.supplier)}
            </p>
          </Link>
        );
      case "state":
        return (
          <Link href={getDocumentLink(document)}>
            <Chip color={getChipVariant(document)} size="sm">
              {screenSize !== "lg"
                ? getOrderStateDataFromState(document.state).miniLabel
                : getOrderStateDataFromState(document.state).label}
            </Chip>
          </Link>
        );
      case "items":
        return (
          <p className="text-xs md:text-sm">
            {document?.orderProducts?.reduce(
              (acc, p) => acc + p?.items?.length || 0,
              0,
            )}
          </p>
        );
      case "createdAt":
        return moment(document.createdAt).format("DD/MM/YYYY");
      case "updatedAt":
        return moment(document.updatedAt).format("DD/MM/YYYY");
      case "sourceWarehouse":
        return (
          <p className="text-xs md:text-sm text-nowrap">
            {document?.sourceWarehouse?.name || "-"}
          </p>
        );
      case "destinationWarehouse":
        return (
          <p className="text-xs md:text-sm text-nowrap">
            {document?.destinationWarehouse?.name || "-"}
          </p>
        );
      case "more":
        return (
          <>
            <Button
              isIconOnly
              aria-label="Editar"
              variant="light"
              onPress={() => {
                onOpen();
                setDocumentForResume(document);
              }}
            >
              <EllipsisHorizontalCircleIcon className="w-5 h-5 md:w-6 md:h-6 self-start m-auto" />
            </Button>
          </>
        );
      case "parentOrder":
        return (
          <Link
            href={
              document?.parentOrder ? `/sales/${document.parentOrder.id}` : "#"
            }
          >
            <p className="focus:underline hover:underline text-nowrap">
              {document?.parentOrder?.code || "-"}
            </p>
          </Link>
        );
      default:
        return document[columnKey];
    }
  };

  if (loading) {
    return (
      <Table aria-label="Cargando documentos">
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn key={column.key}>{column.label}</TableColumn>
          )}
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell key={column.key}>
                  <Skeleton className="rounded-lg">
                    <div className="h-6 w-full rounded-lg bg-default-200" />
                  </Skeleton>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <>
      <Table
        isStriped
        selectionMode={screenSize !== "lg" ? "none" : "multiple"}
        onSelectionChange={handleSelectionChange}
        selectedKeys={selectedKeys}
        bottomContent={
          pagination?.pageSize > 0 && (
            <div className="flex w-full justify-center lg:justify-end">
              <Pagination
                isCompact
                showControls
                showShadow
                color="primary"
                page={pagination?.page}
                total={pageCount}
                onChange={(page) => setPagination({ ...pagination, page })}
              />
            </div>
          )
        }
      >
        <TableHeader columns={columns}>
          {(column) => <TableColumn>{column.label}</TableColumn>}
        </TableHeader>
        <TableBody items={documents} emptyContent="No se encontraron ordenes">
          {(document) => (
            <TableRow>
              {(columnKey) => (
                <TableCell>{renderCell(document, columnKey)}</TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
      <ModalDocumentResume
        document={documentForResume}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        screenSize={screenSize}
      />
    </>
  );
}
