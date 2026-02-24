"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { addToast, Button } from "@heroui/react";
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
import RoleGuard from "@/components/auth/RoleGuard";

function NewCustomerPageInner() {
  const router = useRouter();
  const { createCustomer, creating } = useCustomers(
    {},
    {
      enabled: false,
      onCreate: (newCustomer) => {
        addToast({
          title: "Cliente creado",
          description: "El cliente se ha creado exitosamente",
          color: "success",
        });
        router.push(`/customers/${newCustomer.id}`);
      },
      onError: (error) => {
        addToast({
          title: "Error al crear el cliente",
          description: error.message,
          color: "danger",
        });
      },
    },
  );
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
        required: true,
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
        required: true,
      },
      {
        label: "Identificación",
        type: "input",
        value: customer?.identification,
        onChange: (identification) => {
          setCustomer({ ...customer, identification });
        },
        required: true,
      },
      {
        label: "Email",
        type: "input",
        value: customer?.email,
        onChange: (email) => {
          setCustomer({ ...customer, email });
        },
        required: true,
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
        required: true,
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
        required: true,
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
        required: true,
      },
    ];
  }, [customer]);
  const handleCreate = async () => {
    try {
      const data = {
        name: customer.name,
        lastName: customer.lastName,
        identificationType: customer.identificationType,
        identification: customer.identification,
        email: customer.email,
        phone: customer.phone,
        companyName: customer.companyName,
        address: customer.address,
        territory: customer.territory?.id || customer.territory,
        seller: customer.seller?.id || customer.seller,
      };
      await createCustomer(data);
    } catch (error) {
      addToast({
        title: "Error",
        description: "No se pudo crear el cliente.",
        type: "error",
      });
    }
  };

  const isValid = useMemo(() => {
    return (
      customer?.name?.trim().length > 0 &&
      customer?.identification?.trim().length > 0 &&
      customer?.email?.trim().length > 0 &&
      customer?.address?.trim().length > 0 &&
      customer?.territory &&
      customer?.seller
    );
  }, [customer]);

  return (
    <Entity
      title="Cliente"
      entity={customer}
      backPath="/customers"
      headerFields={headerFields}
    >
      <div className="flex lg:justify-end">
        <Button
          color="success"
          className="w-full lg:w-auto"
          isDisabled={!isValid || creating}
          isLoading={creating}
          onPress={handleCreate}
        >
          Crear Cliente
        </Button>
      </div>
    </Entity>
  );
}


export default function NewCustomerPage(params) {
  return (
    <RoleGuard forbiddenRoles={["seller"]} fallbackRoute="/">
      <NewCustomerPageInner {...params} />
    </RoleGuard>
  );
}
