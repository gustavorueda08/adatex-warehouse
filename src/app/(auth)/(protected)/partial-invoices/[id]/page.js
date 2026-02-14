"use client";
import { use, useMemo, useState, useEffect } from "react";

import { useOrders } from "@/lib/hooks/useOrders";
import { useCustomerSelector } from "@/lib/hooks/useCustomerSelector";
import { createPartialInvoiceDetailConfig } from "@/lib/config/partialInvoiceDocumentConfigs"; // Use Edit Config

import DocumentDetail from "@/components/documents/DocumentDetail";

export default function PartialInvoiceDetailPage({ params }) {
  const { id } = use(params);

  // Fetch document with all relations needed for the config
  const { orders, updateOrder, deleteOrder, refetch, getInvoices, updating } =
    useOrders({
      filters: { id: [id] },
      populate: [
        "orderProducts",
        "orderProducts.product",
        "orderProducts.items", // Important for expanded content
        "customer",
        "customer.parties",
        "customer.parties.taxes",
        "customer.prices",
        "customer.prices.product",
        "customer.taxes",
        "customerForInvoice",
        "customerForInvoice.prices",
        "customerForInvoice.prices.product",
        "customerForInvoice.taxes",
        "parentOrder", // For reference
      ],
    });

  const order = orders[0] || null;

  // Hooks for data required by config
  const customerSelector = useCustomerSelector({});
  const [invoiceableItems, setInvoiceableItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Fetch invoiceable items for the customer
  useEffect(() => {
    if (!order?.customer?.id) return;
    const fetchItems = async () => {
      setLoadingItems(true);
      try {
        const groups = await customerSelector.getInvoiceableItems(
          order.customer.id,
          { "pagination[limit]": -1 },
        );
        console.log("PartialInvoiceDetailPage: Fetched groups", groups);
        setInvoiceableItems(groups);
      } catch (error) {
        console.error("Error fetching invoiceable items:", error);
      } finally {
        setLoadingItems(false);
      }
    };
    fetchItems();
  }, [order?.customer?.id]);

  // Memoize config
  const config = useMemo(() => {
    if (!order) return null;

    // Ensure the current customer is in the list of customers for the Select
    const allCustomers = [...(customerSelector.customers || [])];
    if (
      order.customer &&
      !allCustomers.find((c) => c.id === order.customer.id)
    ) {
      allCustomers.push(order.customer);
    }

    return createPartialInvoiceDetailConfig({
      customers: allCustomers,
      invoiceableItems,
      updateOrder,
      deleteOrder,
      refetch,
      getInvoices,
    });
  }, [
    order,
    customerSelector.customers,
    invoiceableItems,
    updateOrder,
    deleteOrder,
    refetch,
    getInvoices,
  ]);

  if (!order || !config) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Cargando factura parcial...</div>
      </div>
    );
  }

  // KEY: Force remount only when CRITICAL data changes (loaded items or order ID)
  // This ensures getInitialState runs once with all data available.
  const formKey = `${order.id}-${loadingItems ? "loading" : "loaded"}-${invoiceableItems.length}`;

  return <DocumentDetail key={formKey} config={config} initialData={order} />;
}
