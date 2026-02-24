"use client";
import React, { useMemo, useState } from "react";
import Entity from "@/components/entities/Entity";
import { useCollections } from "@/lib/hooks/useCollections";
import SearchableSelect from "@/components/ui/SearchableSelect";
import Section from "@/components/ui/Section";
import { addToast, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import RoleGuard from "@/components/auth/RoleGuard";

function NewCollectionPageInner() {
  const router = useRouter();
  const { createCollection, creating } = useCollections(
    {},
    {
      enabled: false,
      onCreate: () => {
        addToast({
          title: "Colección creada",
          description: "La colección se ha creado exitosamente",
          color: "success",
        });
        router.push("/collections");
      },
      onError: (error) => {
        addToast({
          title: "Error al crear la colección",
          description: error.message,
          color: "danger",
        });
      },
    },
  );
  const [collection, setCollection] = useState({
    name: "",
    description: "",
    products: [],
  });
  const headerFields = [
    {
      key: "name",
      label: "Nombre",
      type: "input",
      value: collection.name,
      onChange: (name) => setCollection({ ...collection, name }),
      required: true,
    },
    {
      key: "line",
      label: "Linea",
      listType: "lines",
      type: "async-select",
      selectedOption: collection?.line,
      onChange: (line) => setCollection({ ...collection, line }),
      render: (line) => line.name,
      required: true,
    },
    {
      key: "description",
      label: "Descripción",
      type: "textarea",
      value: collection.description,
      fullWidth: true,
      onChange: (description) => setCollection({ ...collection, description }),
    },
  ];
  const isValid = useMemo(() => {
    return collection.name.trim().length > 0 && collection.line;
  }, [collection]);
  const handleCreate = async () => {
    try {
      const data = {
        name: collection.name,
        description: collection.description,
        line: collection.line.id,
        products: (collection.products || []).map((p) =>
          typeof p === "object" ? p.id : p,
        ),
      };
      await createCollection(data);
    } catch (error) {
      console.error(error);
    }
  };
  return (
    <Entity title="Nueva Colección" headerFields={headerFields}>
      <Section
        className="flex flex-col gap-4"
        title="Productos"
        description={"Selecciona los productos asociados a esta colección"}
      >
        <div className="p-3">
          <SearchableSelect
            label="Productos"
            listType="products"
            selectionMode="multiple"
            value={collection.products || []}
            onChange={(products) => setCollection({ ...collection, products })}
            renderItem={(item) => item.name}
          />
        </div>
      </Section>
      <div className="flex lg:justify-end">
        <Button
          color="success"
          className="w-full lg:w-auto"
          isDisabled={!isValid || creating}
          isLoading={creating}
          onPress={handleCreate}
        >
          Crear Colección
        </Button>
      </div>
    </Entity>
  );
}


export default function NewCollectionPage(params) {
  return (
    <RoleGuard forbiddenRoles={["seller"]} fallbackRoute="/">
      <NewCollectionPageInner {...params} />
    </RoleGuard>
  );
}
