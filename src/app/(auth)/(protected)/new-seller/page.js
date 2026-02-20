"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addToast, Button } from "@heroui/react";
import { useSellers } from "@/lib/hooks/useSellers";
import Entity from "@/components/entities/Entity";

export default function NewSellerPage() {
  const router = useRouter();
  const { createSeller, creating } = useSellers(
    {},
    {
      enabled: false,
      onCreate: (newSeller) => {
        addToast({
          title: "Vendedor creado",
          description: "El vendedor se ha creado exitosamente",
          color: "success",
        });
        router.push(`/sellers/${newSeller.id}`);
      },
      onError: (error) => {
        addToast({
          title: "Error al crear el vendedor",
          description: error.message,
          color: "danger",
        });
      },
    },
  );
  const [seller, setSeller] = useState(null);
  const headerFields = useMemo(() => {
    return [
      {
        key: "name",
        label: "Nombre",
        type: "input",
        value: seller?.name,
        onChange: (name) => {
          setSeller({ ...seller, name });
        },
        required: true,
      },
      {
        key: "email",
        label: "Email",
        type: "input",
        value: seller?.email,
        onChange: (email) => {
          setSeller({ ...seller, email });
        },
      },
      {
        key: "phone",
        label: "Teléfono",
        type: "input",
        value: seller?.phone,
        onChange: (phone) => {
          setSeller({ ...seller, phone });
        },
      },
      {
        key: "nit",
        label: "NIT",
        type: "input",
        value: seller?.nit,
        onChange: (nit) => {
          setSeller({ ...seller, nit });
        },
      },
      {
        key: "address",
        label: "Dirección",
        type: "textarea",
        value: seller?.address,
        fullWidth: true,
        onChange: (address) => {
          setSeller({ ...seller, address });
        },
      },
    ];
  }, [seller]);
  const handleCreate = async () => {
    try {
      const data = {
        name: seller.name,
        email: seller.email,
        phone: seller.phone,
        nit: seller.nit,
        address: seller.address,
      };
      await createSeller(data);
    } catch (error) {
      addToast({
        title: "Error",
        description: "No se pudo crear el vendedor.",
        type: "error",
      });
    }
  };

  const isValid = useMemo(() => {
    return seller?.name?.trim().length > 0;
  }, [seller]);

  return (
    <Entity
      title="Vendedor"
      entity={seller}
      backPath="/sellers"
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
          Crear Vendedor
        </Button>
      </div>
    </Entity>
  );
}
