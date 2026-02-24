"use client";

import { useRouter } from "next/navigation";
import EntityForm from "@/components/entities/EntityForm";
import toast from "react-hot-toast";
import { useTerritories } from "@/lib/hooks/useTerritories";
import Entity from "@/components/entities/Entity";
import { useMemo, useState } from "react";
import { addToast, Button } from "@heroui/react";
import RoleGuard from "@/components/auth/RoleGuard";

function NewTerritoryPageInner() {
  const router = useRouter();
  const { createTerritory, creating } = useTerritories(
    {},
    {
      enabled: false,
      onCreate: (createdTerritory) => {
        addToast({
          title: "Territorio creado exitosamente",
          color: "success",
        });
        router.push(`/territories`);
      },
      onError: (error) => {
        addToast({
          title: "Error al crear el territorio",
          description:
            "El código de ciudad ya existe o hubo un error en el servidor",
          color: "danger",
        });
      },
    },
  );
  const [document, setDocument] = useState({
    country: "Colombia",
    countryCode: "CO",
  });
  const headerFields = [
    {
      key: "city",
      label: "Ciudad",
      type: "input",
      value: document?.city,
      onChange: (city) => setDocument({ ...document, city }),
      required: true,
    },
    {
      key: "code",
      label: "Código de Ciudad",
      type: "input",
      value: document?.code,
      onChange: (code) => setDocument({ ...document, code }),
      required: true,
    },
    {
      key: "state",
      label: "Departamento",
      type: "input",
      value: document?.state,
      onChange: (state) => setDocument({ ...document, state }),
      required: true,
    },
    {
      key: "stateCode",
      label: "Código de Departamento",
      type: "input",
      value: document?.stateCode,
      onChange: (stateCode) => setDocument({ ...document, stateCode }),
      required: true,
    },
    {
      key: "country",
      label: "País",
      type: "input",
      value: document?.country,
      onChange: (country) => setDocument({ ...document, country }),
      disabled: true,
      required: true,
    },
    {
      key: "countryCode",
      label: "Código de País",
      type: "input",
      value: document?.countryCode,
      onChange: (countryCode) => setDocument({ ...document, countryCode }),
      disabled: true,
      required: true,
    },
  ];

  const isValid = useMemo(() => {
    return (
      document.city &&
      document.code &&
      document.state &&
      document.stateCode &&
      document.country &&
      document.countryCode
    );
  }, [document]);

  return (
    <Entity
      entity={document}
      setEntity={setDocument}
      title="Nuevo Territorio"
      description="Crea un nuevo territorio para asignar a clientes"
      headerFields={headerFields}
    >
      <div className="flex lg:justify-end">
        <Button
          color="success"
          onPress={() => createTerritory(document)}
          isDisabled={!isValid || creating}
          isLoading={creating}
          className="w-full lg:w-auto"
        >
          Crear Territorio
        </Button>
      </div>
    </Entity>
  );
}


export default function NewTerritoryPage(params) {
  return (
    <RoleGuard forbiddenRoles={["seller"]} fallbackRoute="/">
      <NewTerritoryPageInner {...params} />
    </RoleGuard>
  );
}
