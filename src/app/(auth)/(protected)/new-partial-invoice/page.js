"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DocumentForm from "@/components/documents/DocumentForm";
import { createPartialInvoiceFormConfig } from "@/lib/config/partialInvoiceDocumentConfigs";
import { useOrders } from "@/lib/hooks/useOrders";
import { useCustomerSelector } from "@/lib/hooks/useCustomerSelector";
import toast from "react-hot-toast";
import { useEffect } from "react";
import RoleGuard from "@/components/auth/RoleGuard";
function NewPartialInvoicePageInner() {
  const router = useRouter();
  const customerSelector = useCustomerSelector({ pageSize: 50 });
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [invoiceableProducts, setInvoiceableProducts] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const { createOrder, creating } = useOrders(
    {},
    {
      enabled: false,
      onCreate: (createdOrder) => {
        console.log("Orden creada exitosamente:", createdOrder);
        router.push(`/partial-invoices/${createdOrder.id}`);
      },
    },
  );

  // 1. Fetch invoiceable items when customer changes
  useEffect(() => {
    if (!selectedCustomerId) {
      setInvoiceableProducts([]);
      return;
    }

    const fetchItems = async () => {
      setLoadingItems(true);
      try {
        const groups = await customerSelector.getInvoiceableItems(
          selectedCustomerId,
          {
            "pagination[limit]": -1,
          },
        );

        // Map groups to DocumentForm structure
        const processedGroups = groups.map((group) => ({
          id: group.product.id,
          product: group.product,
          // Initialize items with control fields
          items: group.items.map((item) => ({
            ...item,
            toInvoice: false,
            invoiceQuantity: item.currentQuantity,
            price: item.price || 0,
          })),
          totalAvailable: group.totalQuantity || 0,
          quantity: 0, // Total to invoice
          total: 0, // Total amount
        }));

        setInvoiceableProducts(processedGroups);
      } catch (error) {
        console.error("Error fetching invoiceable items for customer:", error);
        toast.error("Error al cargar items facturables");
      } finally {
        setLoadingItems(false);
      }
    };

    fetchItems();
  }, [selectedCustomerId, customerSelector.getInvoiceableItems]); // Check deps

  const config = useMemo(
    () =>
      createPartialInvoiceFormConfig({
        customers: customerSelector.customers,
        products: invoiceableProducts,
        onSubmit: createOrder,
        loading: creating,
        customerSelectProps: {
          onSearch: customerSelector.setSearch,
          onLoadMore: customerSelector.loadMore,
          hasMore: customerSelector.hasMore,
          loading: customerSelector.loading,
          loadingMore: customerSelector.loadingMore,
        },
        onCustomerChange: (customer) => {
          setSelectedCustomerId(customer?.id || null);
        },
        currentCustomer: customerSelector.customers.find(
          (c) => c.id === selectedCustomerId,
        ),
      }),
    [
      customerSelector.customers,
      invoiceableProducts,
      creating,
      selectedCustomerId,
      customerSelector.loading,
    ],
  );

  const formKey = `${selectedCustomerId || "none"}-${loadingItems ? "loading" : "loaded"}`;

  return <DocumentForm key={formKey} config={config} />;
}


export default function NewPartialInvoicePage(params) {
  return (
    <RoleGuard forbiddenRoles={["seller"]} fallbackRoute="/">
      <NewPartialInvoicePageInner {...params} />
    </RoleGuard>
  );
}
