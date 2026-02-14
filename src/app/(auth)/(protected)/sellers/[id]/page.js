"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { addToast } from "@heroui/react";
import { useSellers } from "@/lib/hooks/useSellers";
import { useOrders } from "@/lib/hooks/useOrders";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import Entity from "@/components/entities/Entity";
import Section from "@/components/ui/Section";
import Documents from "@/components/documents/Documents";
import EntityActions from "@/components/entities/EntityActions";

export default function SellerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sellerId = params.id;
  const screenSize = useScreenSize();

  const { sellers, updateSeller, deleteSeller, updating, refetch } = useSellers(
    {
      filters: { id: { $eq: sellerId } },
      pagination: { page: 1, pageSize: 1 },
    },
  );

  const [seller, setSeller] = useState(null);

  useEffect(() => {
    if (sellers.length > 0) {
      setSeller(sellers[0]);
    }
  }, [sellers]);

  // Orders logic
  const [orderPagination, setOrderPagination] = useState({
    page: 1,
    pageSize: 10,
  });

  const {
    orders,
    pagination: { pageCount },
    loading: ordersLoading,
  } = useOrders({
    filters: {
      type: { $eq: "sale" },
      customer: {
        seller: {
          id: { $eq: sellerId },
        },
      },
    },
    pagination: orderPagination,
    populate: ["customer", "orderProducts", "orderProducts.items"],
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
      { label: "Cliente", key: "customer" },
      { label: "Estado", key: "state" },
      { label: "Items", key: "items" },
      { label: "Creado", key: "createdAt" },
      { label: "", key: "more" },
    ];
  }, [screenSize]);

  const headerFields = useMemo(() => {
    return [
      {
        key: "name",
        label: "Nombre",
        type: "input",
        value: seller?.name,
        onChange: (name) => setSeller({ ...seller, name }),
      },
      {
        key: "email",
        label: "Email",
        type: "input",
        value: seller?.email,
        onChange: (email) => setSeller({ ...seller, email }),
      },
      {
        key: "phone",
        label: "Teléfono",
        type: "input",
        value: seller?.phone,
        onChange: (phone) => setSeller({ ...seller, phone }),
      },
      {
        key: "nit",
        label: "NIT",
        type: "input",
        value: seller?.nit,
        onChange: (nit) => setSeller({ ...seller, nit }),
      },
      {
        key: "address",
        label: "Dirección",
        type: "textarea",
        value: seller?.address,
        onChange: (address) => setSeller({ ...seller, address }),
      },
    ];
  }, [seller]);

  const handleUpdate = async () => {
    const payload = {
      data: {
        name: seller.name,
        email: seller.email,
        phone: seller.phone,
        nit: seller.nit,
        address: seller.address,
      },
    };

    await updateSeller(sellerId, payload.data);
    await refetch();
    addToast({
      title: "Vendedor actualizado",
      description: "El vendedor ha sido actualizado correctamente.",
      type: "success",
    });
  };

  const handleDelete = async () => {
    const res = await deleteSeller(sellerId);
    if (res.error) {
      addToast({
        title: "Error",
        description: "No se pudo eliminar el vendedor.",
        type: "error",
      });
      return;
    }
    addToast({
      title: "Vendedor eliminado",
      description: "El vendedor ha sido eliminado correctamente.",
      type: "success",
    });
    router.push("/sellers");
  };

  const [selectedKeys, setSelectedKeys] = useState(new Set());

  return (
    <Entity
      title="Vendedor"
      entity={seller}
      backPath="/sellers"
      headerFields={headerFields}
    >
      <Section title="Ventas" description="Ordenes asociadas a este vendedor">
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
      <Section title="Acciones">
        <EntityActions
          entity={seller}
          setEntity={setSeller}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          isLoading={updating}
        />
      </Section>
    </Entity>
  );
}
