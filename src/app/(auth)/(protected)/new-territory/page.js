"use client";

import { useRouter } from "next/navigation";
import EntityForm from "@/components/entities/EntityForm";
import toast from "react-hot-toast";
import { useTerritories } from "@/lib/hooks/useTerritories";

export default function NewTerritoryPage() {
  const router = useRouter();
  const { createTerritory, creating } = useTerritories(
    {},
    {
      enabled: false,
      onCreate: (createdTerritory) => {
        toast.success("Territorio creado exitosamente");
        router.push(`/territories`);
      },
    },
  );

  const config = {
    title: "Nuevo Territorio",
    description: "Crea un nuevo territorio para asignar a clientes",
    entityType: "territory",
    onSubmit: createTerritory,
    loading: creating,
    fields: [
      {
        name: "code",
        label: "Código",
        type: "text",
        required: true,
        placeholder: "Ej: 76001",
      },
      {
        name: "city",
        label: "Ciudad",
        type: "text",
        placeholder: "Ej: Cali",
      },
      {
        name: "state",
        label: "Departamento / Estado",
        type: "text",
        placeholder: "Ej: Valle del Cauca",
      },
      {
        name: "stateCode",
        label: "Código de Departamento",
        type: "text",
        placeholder: "Ej: 76",
      },
      {
        name: "country",
        label: "País",
        type: "text",
        defaultValue: "Colombia",
        placeholder: "Ej: Colombia",
      },
      {
        name: "countryCode",
        label: "Código de País",
        type: "text",
        defaultValue: "Co",
        placeholder: "Ej: Co",
      },
    ],
  };

  return <EntityForm config={config} backPath="/territories" />;
}
