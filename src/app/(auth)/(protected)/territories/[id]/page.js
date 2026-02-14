"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { addToast } from "@heroui/react";
import { useTerritories } from "@/lib/hooks/useTerritories";
import Entity from "@/components/entities/Entity";
import EntityActions from "@/components/entities/EntityActions";
import Section from "@/components/ui/Section"; // Still needed if we wrap actions in a Section or just a div

export default function TerritoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const territoryId = params.id;

  const { territories, updateTerritory, deleteTerritory, updating, refetch } =
    useTerritories({
      filters: { id: { $eq: territoryId } },
      pagination: { page: 1, pageSize: 1 },
    });

  const [territory, setTerritory] = useState(null);

  useEffect(() => {
    if (territories.length > 0) {
      setTerritory(territories[0]);
    }
  }, [territories]);

  const headerFields = useMemo(() => {
    return [
      {
        key: "city",
        label: "Ciudad",
        type: "input",
        value: territory?.city,
        onChange: (city) => {
          setTerritory({ ...territory, city });
        },
      },
      {
        key: "state",
        label: "Departamento",
        type: "input",
        value: territory?.state,
        onChange: (state) => {
          setTerritory({ ...territory, state });
        },
      },
      {
        key: "country",
        label: "País",
        type: "input",
        value: territory?.country,
        onChange: (country) => {
          setTerritory({ ...territory, country });
        },
      },
      {
        key: "code",
        label: "Código DANE",
        type: "input",
        value: territory?.code,
        onChange: (code) => {
          setTerritory({ ...territory, code });
        },
      },
      {
        key: "stateCode",
        label: "Código Depto",
        type: "input",
        value: territory?.stateCode,
        onChange: (stateCode) => {
          setTerritory({ ...territory, stateCode });
        },
      },
      {
        key: "countryCode",
        label: "Código País",
        type: "input",
        value: territory?.countryCode,
        onChange: (countryCode) => {
          setTerritory({ ...territory, countryCode });
        },
      },
    ];
  }, [territory]);

  const handleUpdate = async () => {
    const payload = {
      data: {
        city: territory.city,
        state: territory.state,
        country: territory.country,
        code: territory.code,
        stateCode: territory.stateCode,
        countryCode: territory.countryCode,
      },
    };

    await updateTerritory(territory.documentId, payload.data);
    await refetch();
    addToast({
      title: "Territorio actualizado",
      description: "El territorio ha sido actualizado correctamente.",
      type: "success",
    });
  };

  const handleDelete = async () => {
    const res = await deleteTerritory(territoryId);
    if (res.error) {
      addToast({
        title: "Error",
        description: "No se pudo eliminar el territorio.",
        type: "error",
      });
      return;
    }
    addToast({
      title: "Territorio eliminado",
      description: "El territorio ha sido eliminado correctamente.",
      type: "success",
    });
    router.push("/territories");
  };

  return (
    <Entity
      title="Territorio"
      entity={territory}
      backPath="/territories"
      headerFields={headerFields}
    >
      <Section title={"Acciones"}>
        <EntityActions
          entity={territory}
          setEntity={setTerritory}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          isLoading={updating}
        />
      </Section>
    </Entity>
  );
}
