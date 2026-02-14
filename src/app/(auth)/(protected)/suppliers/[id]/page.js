"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { addToast } from "@heroui/react";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import Entity from "@/components/entities/Entity";
import Section from "@/components/ui/Section";
import Taxes from "@/components/entities/Taxes";
import Prices from "@/components/entities/Prices";
import Documents from "@/components/documents/Documents";
import EntityActions from "@/components/entities/EntityActions";
import { useOrders } from "@/lib/hooks/useOrders";
import { useScreenSize } from "@/lib/hooks/useScreenSize";

export default function SupplierDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supplierId = params.id;
  const screenSize = useScreenSize();

  const { suppliers, updateSupplier, deleteSupplier, updating, refetch } =
    useSuppliers({
      filters: { id: { $eq: supplierId } },
      pagination: { page: 1, pageSize: 1 },
      populate: ["taxes", "prices", "prices.product"],
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
    filters: { supplier: { $eq: supplierId } },
    pagination: orderPagination,
    populate: [
      "supplier",
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

  const [supplier, setSupplier] = useState(null);

  const headerFields = useMemo(() => {
    return [
      {
        key: "name",
        label: "Nombre | Razón Social",
        type: "input",
        value: supplier?.name,
        onChange: (name) => {
          setSupplier({ ...supplier, name });
        },
      },
      {
        key: "lastname",
        label: "Apellidos",
        type: "input",
        value: supplier?.lastname,
        onChange: (lastname) => {
          setSupplier({ ...supplier, lastname });
        },
      },
      {
        key: "identificationType",
        label: "Tipo de Identificación",
        type: "select",
        options: [
          { key: "CC", label: "CC" },
          { key: "NIT", label: "NIT" },
          { key: "ID", label: "ID" },
        ],
        value: supplier?.identificationType,
        onChange: (identificationType) => {
          setSupplier({ ...supplier, identificationType });
        },
      },
      {
        key: "identification",
        label: "Identificación",
        type: "input",
        value: supplier?.identification,
        onChange: (identification) => {
          setSupplier({ ...supplier, identification });
        },
      },
      {
        key: "email",
        label: "Email",
        type: "input",
        value: supplier?.email,
        onChange: (email) => {
          setSupplier({ ...supplier, email });
        },
      },
      {
        key: "phone",
        label: "Teléfono",
        type: "input",
        value: supplier?.phone,
        onChange: (phone) => {
          setSupplier({ ...supplier, phone });
        },
      },
      {
        key: "country",
        label: "País",
        type: "input",
        value: supplier?.country,
        onChange: (country) => {
          setSupplier({ ...supplier, country });
        },
      },
      {
        key: "city",
        label: "Ciudad",
        type: "input",
        value: supplier?.city,
        onChange: (city) => {
          setSupplier({ ...supplier, city });
        },
      },
      {
        key: "address",
        label: "Dirección",
        type: "textarea",
        value: supplier?.address,
        fullWidth: true,
        onChange: (address) => {
          setSupplier({ ...supplier, address });
        },
      },
    ];
  }, [supplier]);

  useEffect(() => {
    if (suppliers.length > 0) {
      setSupplier(suppliers[0]);
    }
  }, [suppliers]);

  const [selectedKeys, setSelectedKeys] = useState(new Set());

  const handleUpdate = async () => {
    const payload = {
      data: {
        name: supplier.name,
        lastname: supplier.lastname,
        identificationType: supplier.identificationType,
        identification: supplier.identification,
        email: supplier.email,
        phone: supplier.phone,
        country: supplier.country,
        city: supplier.city,
        address: supplier.address,
        taxes: supplier.taxes?.map((t) => t.id) || [],
        prices:
          supplier.prices
            ?.filter((p) => p.product) // Filter out empty rows
            .map((p) => {
              const priceData = {
                product: p.product.id || p.product,
                unitPrice: p.unitPrice,
                ivaIncluded: p.ivaIncluded,
                invoicePercentage: p.invoicePercentage,
              };
              if (p.id && typeof p.id === "number") {
                priceData.id = p.id;
              }
              return priceData;
            }) || [],
      },
    };
    await updateSupplier(supplierId, payload.data);
    await refetch();
    addToast({
      title: "Proveedor actualizado",
      description: "El proveedor ha sido actualizado correctamente.",
      type: "success",
    });
  };

  const handleDelete = async () => {
    const res = await deleteSupplier(supplierId);
    if (res.error) {
      addToast({
        title: "Error",
        description: "No se pudo eliminar el proveedor.",
        type: "error",
      });
      return;
    }
    addToast({
      title: "Proveedor eliminado",
      description: "El proveedor ha sido eliminado correctamente.",
      type: "success",
    });
    router.push("/suppliers");
  };

  return (
    <Entity
      title="Proveedor"
      entity={supplier}
      backPath="/suppliers"
      headerFields={headerFields}
    >
      <Section
        title="Impuestos"
        description={"Configuración de impuestos aplicables al proveedor"}
      >
        <Taxes taxes={supplier?.taxes} setEntity={setSupplier} />
      </Section>
      <Section
        title={"Precios"}
        description={"Configuración de precios aplicables al proveedor"}
      >
        <Prices prices={supplier?.prices} setEntity={setSupplier} />
      </Section>
      <Section title="Ordenes" description={"Ordenes de Compra"}>
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
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          isLoading={updating}
        />
      </Section>
    </Entity>
  );
}
