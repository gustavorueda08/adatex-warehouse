import format from "@/lib/utils/format";
import unitsAreConsistent from "@/lib/utils/unitsConsistency";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import classNames from "classnames";
import React, { useMemo } from "react";
import { useScreenSize } from "@/lib/hooks/useScreenSize";

export default function PInvoice({ document, taxes = [] }) {
  const screenSize = useScreenSize();

  const columns = useMemo(() => {
    if (screenSize === "xs" || screenSize === "sm") {
      return [
        { key: "name", label: "Producto" },
        { key: "subtotal", label: "Subtotal" },
      ];
    }
    return [
      { key: "name", label: "Producto" },
      { key: "price", label: "Precio" },
      { key: "quantity", label: "Cantidad" },
      { key: "subtotal", label: "Subtotal" },
    ];
  }, [screenSize]);

  const checkThreshold = (value, threshold, condition) => {
    console.log("VALUES", value, threshold, condition);
    switch (condition) {
      case "greaterThan":
        return value > threshold;
      case "greaterThanOrEqualTo":
        return value >= threshold;
      case "lessThan":
        return value < threshold;
      case "lessThanOrEqualTo":
        return value <= threshold;
      default:
        return value >= threshold;
    }
  };

  const { products, subtotal, appliedTaxes, total } = useMemo(() => {
    const validProducts =
      document?.orderProducts?.filter((p) => p.product) || [];
    // Calcular subtotal
    let subtotalForTaxes = 0;
    const subtotal = validProducts.reduce((acc, product) => {
      const {
        invoicePercentage = 0,
        confirmedQuantity = 0,
        ivaIncluded = false,
      } = product;
      let price = Number(product.price) || 0;
      if (ivaIncluded) {
        price = price / (1 + 0.19 * (Number(invoicePercentage) / 100));
      }
      subtotalForTaxes +=
        price * Number(confirmedQuantity) * (Number(invoicePercentage) / 100);
      return acc + price * Number(confirmedQuantity);
    }, 0);
    let total = subtotal;
    // De acuerdo con el subtotal para taxes, calcular los impuestos
    const appliedTaxes = taxes
      .filter(
        (t) =>
          t.applicationType !== "self-retention" &&
          checkThreshold(
            subtotalForTaxes,
            Number(t.treshold),
            t.tresholdContidion,
          ),
      )
      .map((t) => {
        const value = subtotalForTaxes * Number(t.amount);
        total = t.use === "increment" ? total + value : total - value;
        return {
          ...t,
          value,
        };
      });
    const products = validProducts.map((p) => {
      const { invoicePercentage, confirmedQuantity, ivaIncluded } = p;
      let price = p.price;
      if (ivaIncluded) {
        price =
          Math.round(
            (price / (1 + 0.19 * (Number(invoicePercentage) / 100))) * 100,
          ) / 100;
      }
      const calculatedBase = Math.round(price * confirmedQuantity * 100) / 100;
      return {
        ...p,
        price,
        calculatedBase,
      };
    });
    return {
      products,
      subtotal: Math.round(subtotal * 100) / 100,
      appliedTaxes,
      total: Math.round(total * 100) / 100,
    };
  }, [
    taxes,
    document?.orderProducts,
    document?.customer,
    document?.customerForInvoice,
  ]);
  const renderCell = (item, columnKey) => {
    const isSummaryRow = ["subtotal", "total", "tax"].includes(item.type);
    switch (columnKey) {
      case "name":
        return (
          <p
            className={classNames([
              "text-xs md:text-base",
              {
                "font-bold": isSummaryRow,
              },
            ])}
          >
            {item.name}
          </p>
        );
      case "price":
        return isSummaryRow ? null : (
          <p className="text-xs md:text-base">{format(item.price, "$")}</p>
        );
      case "quantity":
        if (isSummaryRow) return null;
        return (
          <p className="text-xs md:text-base">
            {format(item.confirmedQuantity)} {item.unit}
          </p>
        );
      case "subtotal":
        let value;
        if (isSummaryRow) {
          value = item.value;
        } else {
          value = item.calculatedBase;
        }
        return (
          <p
            className={classNames([
              "text-xs md:text-base",
              {
                "font-bold": isSummaryRow,
              },
            ])}
          >
            {format(value, "$")}
          </p>
        );
      default:
        return null;
    }
  };

  const summaryRows = [
    {
      id: "summary-subtotal",
      name: "Subtotal",
      value: subtotal,
      type: "subtotal",
    },
    ...appliedTaxes.map((tax, index) => ({
      id: `tax-${index}`,
      name: tax.name,
      value: tax.value,
      type: "tax",
    })),
    {
      id: "summary-total",
      name: "Total",
      value: total,
      type: "total",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Resumen de Productos */}
      <Table isStriped shadow="none" aria-label="Tabla de productos">
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn key={column.key}>{column.label}</TableColumn>
          )}
        </TableHeader>
        <TableBody items={products}>
          {(item) => (
            <TableRow key={item.id}>
              {(columnKey) => (
                <TableCell key={columnKey}>
                  {renderCell(item, columnKey)}
                </TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Resumen de Totales */}
      <div className="flex justify-end">
        <Table
          isStriped
          shadow="none"
          hideHeader
          aria-label="Tabla de totales"
          className="w-full lg:w-1/2"
        >
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn key={column.key}>{column.label}</TableColumn>
            )}
          </TableHeader>
          <TableBody items={summaryRows}>
            {(item) => (
              <TableRow key={item.id}>
                {(columnKey) => (
                  <TableCell key={columnKey}>
                    {renderCell(item, columnKey)}
                  </TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
