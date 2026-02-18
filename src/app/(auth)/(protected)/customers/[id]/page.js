"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { addToast } from "@heroui/react";
import { useCustomers } from "@/lib/hooks/useCustomers";
import Entity from "@/components/entities/Entity";
import Section from "@/components/ui/Section";
import PaymentTerms from "@/components/entities/PaymentTerms";
import Taxes from "@/components/entities/Taxes";
import Prices from "@/components/entities/Prices";
import Documents from "@/components/documents/Documents";
import EntityActions from "@/components/entities/EntityActions";
import { useOrders } from "@/lib/hooks/useOrders";
import { useScreenSize } from "@/lib/hooks/useScreenSize";

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id;
  const screenSize = useScreenSize();
  const { customers, updateCustomer, updating, refetch, deleteCustomer } =
    useCustomers({
      filters: { id: { $eq: customerId } },
      pagination: { page: 1, pageSize: 1 },
      populate: [
        "taxes",
        "parties",
        "prices",
        "prices.product",
        "territory",
        "seller",
      ],
    });
  const [orderPagination, setOrderPagination] = useState({
    page: 1,
    pageSize: 10,
  });
  const {
    orders,
    pagination: { pageCount },
    loading: ordersLoading,
  } = useOrders({
    filters: { customer: { $eq: customerId } },
    pagination: orderPagination,
    populate: [
      "customer",
      "customer.taxes",
      "customer.territory",
      "customer.seller",
      "customer.parties",
      "customer.prices",
      "customer.prices.product",
      "orderProducts",
      "orderProducts.product",
      "orderProducts.items",
    ],
  });
  const columns = useMemo(() => {
    if (screenSize !== "lg") {
      return [
        { label: "", key: "more" },
        { label: "Código", key: "code" },
        { label: "Estado", key: "state" },
        { label: "Items", key: "items" },
      ];
    }
    return [
      { label: "Código", key: "code" },
      { label: "No Factura", key: "invoice" },
      { label: "", key: "more" },
      { label: "Estado", key: "state" },
      { label: "Items", key: "items" },
      { label: "Creado", key: "createdAt" },
    ];
  }, [screenSize]);
  const [customer, setCustomer] = useState(null);
  const headerFields = useMemo(() => {
    return [
      {
        key: "name",
        label: "Nombre",
        type: "input",
        value: customer?.name,
        onChange: (name) => {
          setCustomer({ ...customer, name });
        },
      },
      {
        key: "lastName",
        label: "Apellido",
        type: "input",
        value: customer?.lastName,
        onChange: (lastName) => {
          setCustomer({ ...customer, lastName });
        },
      },
      {
        key: "identificationType",
        label: "Tipo",
        type: "select",
        options: [
          { key: "CC", label: "CC" },
          { key: "NIT", label: "NIT" },
        ],
        value: customer?.identificationType,
        onChange: (identificationType) => {
          setCustomer({ ...customer, identificationType });
        },
      },
      {
        label: "Identificación",
        type: "input",
        value: customer?.identification,
        onChange: (identification) => {
          setCustomer({ ...customer, identification });
        },
      },
      {
        label: "Email",
        type: "input",
        value: customer?.email,
        onChange: (email) => {
          setCustomer({ ...customer, email });
        },
      },
      {
        label: "Teléfono",
        type: "input",
        value: customer?.phone,
        onChange: (phone) => {
          setCustomer({ ...customer, phone });
        },
      },
      {
        label: "Nombre Comercial",
        type: "input",
        value: customer?.companyName,
        onChange: (companyName) => {
          setCustomer({ ...customer, companyName });
        },
        fullWidth: true,
      },
      {
        label: "Dirección",
        type: "textarea",
        value: customer?.address,
        fullWidth: true,
        onChange: (address) => {
          setCustomer({ ...customer, address });
        },
      },
      {
        label: "Ciudad",
        listType: "territories",
        type: "async-select",
        value: customer?.territory,
        placeholder: "Selecciona una ciudad",
        selectedOption: customer?.territory,
        selectedOptionLabel: customer?.territory
          ? `${customer?.territory?.city}`
          : "",
        render: (territory) => `${territory?.city}`,
        filters: (search) => {
          if (!search) return {};
          const terms = search.split(/\s+/).filter(Boolean);
          if (terms.length === 0) return {};
          return {
            $and: terms.map((term) => ({
              $or: [
                { city: { $containsi: term } },
                { code: { $containsi: term } },
                { state: { $containsi: term } },
                { stateCode: { $containsi: term } },
              ],
            })),
          };
        },
        onChange: (territory) => {
          setCustomer({ ...customer, territory });
        },
      },
      {
        label: "Vendedor",
        type: "async-select",
        listType: "sellers",
        value: customer?.seller,
        placeholder: "Selecciona un vendedor",
        selectedOption: customer?.seller,
        selectedOptionLabel: customer?.seller
          ? `${customer?.seller?.name}`
          : "",
        render: (seller) => `${seller?.name}`,
        filters: (search) => {
          if (!search) return {};
          const terms = search.split(/\s+/).filter(Boolean);
          if (terms.length === 0) return {};
          return {
            $and: terms.map((term) => ({
              $or: [{ name: { $containsi: term } }],
            })),
          };
        },
        onChange: (seller) => {
          setCustomer({ ...customer, seller });
        },
      },
    ];
  }, [customer]);

  useEffect(() => {
    if (customers.length > 0) {
      setCustomer(customers[0]);
    }
  }, [customers]);

  const [selectedKeys, setSelectedKeys] = useState(new Set());

  const handleUpdate = async () => {
    const payload = {
      data: {
        ...customer,
        taxes: customer.taxes?.map((t) => t.id) || [],
        prices:
          customer.prices
            ?.filter((p) => p.product) // Filter out empty rows
            .map((p) => {
              const priceData = {
                product: p.product.id || p.product,
                unitPrice: p.unitPrice,
                ivaIncluded: p.ivaIncluded,
                invoicePercentage: p.invoicePercentage,
              };
              // Include ID only if it exists (update case)
              if (p.id && typeof p.id === "number") {
                priceData.id = p.id;
              }
              return priceData;
            }) || [],
        parties: customer.parties?.map((p) => p.id) || [],
        // Ensure relations are IDs
        territory: customer.territory?.id || customer.territory,
        seller: customer.seller?.id || customer.seller,
        // Basic fields
        companyName: customer.companyName,
      },
    };

    await updateCustomer(customerId, payload.data);
    await refetch();
    addToast({
      title: "Cliente actualizado",
      description: "El cliente ha sido actualizado correctamente.",
      type: "success",
    });
  };

  const handleDelete = async () => {
    const res = await deleteCustomer(customerId);
    if (res.error) {
      addToast({
        title: "Error",
        description: "No se pudo eliminar el cliente.",
        type: "error",
      });
      return;
    }
    addToast({
      title: "Cliente eliminado",
      description: "El cliente ha sido eliminado correctamente.",
      type: "success",
    });
    router.push("/customers");
  };

  return (
    <Entity
      title="Cliente"
      entity={customer}
      backPath="/customers"
      headerFields={headerFields}
    >
      <Section
        title="Terminos de Pago"
        description={"Plazo de pago asignado y cupo del cliente"}
      >
        <PaymentTerms entity={customer} setEntity={setCustomer} />
      </Section>
      <Section
        title="Impuestos"
        description={"Configuración de impuestos aplicables al cliente"}
      >
        <Taxes taxes={customer?.taxes} setEntity={setCustomer} />
      </Section>
      <Section
        title={"Precios"}
        description={"Configuración de precios aplicables al cliente"}
      >
        <Prices prices={customer?.prices} setEntity={setCustomer} />
      </Section>
      <Section title="Ordenes" description={"Ordenes del Cliente"}>
        <div className="p-4">
          <Documents
            documents={orders}
            pagination={orderPagination}
            setPagination={setOrderPagination}
            pageCount={pageCount}
            columns={columns}
            screenSize={screenSize}
            loading={ordersLoading}
            selectedKeys={selectedKeys}
            setSelectedKeys={setSelectedKeys}
          />
        </div>
      </Section>
      <Section title={"Acciones"}>
        <EntityActions
          entity={customer}
          setEntity={setCustomer}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          isLoading={updating}
        />
      </Section>
    </Entity>
  );
}
