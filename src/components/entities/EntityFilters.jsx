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
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { I18nProvider } from "@react-aria/i18n";
import DebouncedInput from "@/components/ui/DebounceInput";
import { useScreenSize } from "@/lib/hooks/useScreenSize";

export default function EntityFilters({
  search,
  setSearch,
  dateRange,
  setDateRange,
  pathname,
  filters = [],
  children,
}) {
  const screenSize = useScreenSize();

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

      {/* Conditional DatePicker */}
      {dateRange && setDateRange ? (
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
      ) : /* Spacer if no date picker, or just empty? Filters.jsx used grid. 
           If no date picker, we might want to let search take more space or just leave empty.
           For now, let's leave it empty to respect grid layout or just not render.
           If we don't render, the grid cells shift. 
           Let's conditionally render additional filters here if provided.
        */
      null}

      {/* Render extra filters if any */}
      {filters.map((filter) => (
        <Select
          key={filter.key}
          selectionMode={filter.selectionMode || "multiple"}
          selectedKeys={filter.selectedKeys}
          onSelectionChange={filter.onSelectionChange}
          placeholder={filter.placeholder}
          isClearable
          size={screenSize === "lg" ? "md" : "sm"}
          className="!max-w-xs"
        >
          {filter.options.map((option) => (
            <SelectItem key={option.key}>{option.label}</SelectItem>
          ))}
        </Select>
      ))}
      <div className="col-span-2 gap-2 flex flex-col md:flex-row">
        {children}
      </div>
      <div className="col-start-1 md:col-start-2 lg:col-start-4 flex justify-end">
        <Button
          color="success"
          className="text-white w-full md:w-auto"
          as={Link}
          href={pathname}
          size={screenSize === "lg" ? "md" : "sm"}
        >
          <PlusCircleIcon className="w-4 h-4 lg:w-6 lg:h-6 text-white" />
          Crear
        </Button>
      </div>
    </div>
  );
}
