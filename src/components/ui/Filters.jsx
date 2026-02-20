"use client";

import {
  Button,
  DateRangePicker,
  Link,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  MagnifyingGlassIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { I18nProvider, useDateFormatter } from "@react-aria/i18n";
import DebouncedInput from "./DebounceInput";
import { parseDate } from "@internationalized/date";
import { ORDER_STATES, orderStatesArray } from "@/lib/utils/orderStates";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import { XCircleIcon } from "@heroicons/react/24/solid";

export default function Filters({
  search,
  setSearch,
  dateRange = { start: null, end: null },
  setDateRange,
  selectedStates,
  setSelectedStates,
  pathname,
  extraStates = [],
}) {
  const screenSize = useScreenSize();
  const states = [
    {
      key: "draft",
      label: "Pendiente",
    },
    {
      key: "completed",
      label: "Completada",
    },
    {
      key: "confirmed",
      label: "Confirmada",
    },
    ...extraStates,
  ];
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4 items-center">
      <DebouncedInput
        placeholder="Buscar"
        startContent={<MagnifyingGlassIcon className="w-5 h-5" />}
        initialValue={search}
        onDebouncedChange={setSearch}
        size={screenSize === "lg" ? "md" : "sm"}
        className="md:col-span-2 lg:col-span-1"
      />
      <div className="flex flex-row items-center gap-2">
        <I18nProvider locale="es-CL">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            size={screenSize === "lg" ? "md" : "sm"}
            className="flex-1"
          />
        </I18nProvider>
        {dateRange?.start && dateRange?.end && (
          <Button
            variant="ghost"
            isIconOnly
            size={screenSize === "lg" ? "md" : "sm"}
            onPress={() => setDateRange({ start: null, end: null })}
            title="Limpiar fechas"
            className="shrink-0"
          >
            <XCircleIcon className="w-6 h-6" />
          </Button>
        )}
      </div>
      <Select
        selectionMode="multiple"
        selectedKeys={selectedStates}
        onSelectionChange={setSelectedStates}
        placeholder="Filtrar por estado"
        isClearable
        size={screenSize === "lg" ? "md" : "sm"}
        className="!max-w-xs"
      >
        {states.map((state) => (
          <SelectItem key={state.key}>{state.label}</SelectItem>
        ))}
      </Select>
      <Button
        color="success"
        className="text-white md:col-span-2 lg:col-span-1 lg:max-w-36 lg:justify-self-end"
        as={Link}
        href={pathname}
        size={screenSize === "lg" ? "md" : "sm"}
      >
        <PlusCircleIcon className="w-4 h-4 lg:w-6 lg:h-6 text-white" />
        Crear
      </Button>
    </div>
  );
}
