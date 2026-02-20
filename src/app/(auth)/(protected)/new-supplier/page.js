"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addToast, Button } from "@heroui/react";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import Entity from "@/components/entities/Entity";

export default function NewSupplierPage() {
  const router = useRouter();
  const { createSupplier, creating } = useSuppliers(
    {},
    {
      enabled: false,
      onCreate: (newSupplier) => {
        addToast({
          title: "Proveedor creado",
          description: "El proveedor se ha creado exitosamente",
          color: "success",
        });
        router.push(`/suppliers/${newSupplier.id}`);
      },
      onError: (error) => {
        addToast({
          title: "Error al crear el proveedor",
          description: error.message,
          color: "danger",
        });
      },
    },
  );
  const [supplier, setSupplier] = useState({});
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
        required: true,
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
        required: true,
      },
      {
        key: "identification",
        label: "Identificación",
        type: "input",
        value: supplier?.identification,
        onChange: (identification) => {
          setSupplier({ ...supplier, identification });
        },
        required: true,
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
  const handleCreate = async () => {
    try {
      const data = {
        name: supplier.name,
        lastname: supplier.lastname || "",
        identificationType: supplier.identificationType,
        identification: supplier.identification,
        email: supplier.email,
        phone: supplier.phone,
        country: supplier.country,
        city: supplier.city,
        address: supplier.address,
      };
      console.log(data, "DATOS");

      await createSupplier(data);
    } catch (error) {
      addToast({
        title: "Error",
        description: "No se pudo crear el proveedor.",
        type: "error",
      });
    }
  };

  const isValid = useMemo(() => {
    return (
      supplier?.name?.trim().length > 0 &&
      supplier?.identificationType &&
      supplier?.identification?.trim().length > 0
    );
  }, [supplier]);

  return (
    <Entity
      title="Proveedor"
      entity={supplier}
      backPath="/suppliers"
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
          Crear Proveedor
        </Button>
      </div>
    </Entity>
  );
}
