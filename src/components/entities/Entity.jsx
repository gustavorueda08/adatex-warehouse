import React, { useEffect, useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import {
  Autocomplete,
  AutocompleteItem,
  Chip,
  DatePicker,
  Divider,
  Input,
  Select,
  SelectItem,
  Textarea,
} from "@heroui/react";
import { getChipVariant } from "@/lib/utils/getChipVariant";
import { useScreenSize } from "@/lib/hooks/useScreenSize";
import { useEntityList } from "@/lib/hooks/useEntityList";
import { useInfiniteScroll } from "@heroui/use-infinite-scroll";
import { I18nProvider } from "@react-aria/i18n";
import DebouncedInput from "../ui/DebounceInput";
import classNames from "classnames";

function EntityHeaderField({ field = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState(field.selectedOptionLabel || "");
  const listType = useMemo(
    () => field.listType || "customers",
    [field.listType],
  );
  const filters = useMemo(() => field.filters || {}, [field.filters]);
  const populate = useMemo(() => field.populate || [], [field.populate]);
  const selectedOption = field.selectedOption;
  const { options, isLoading, hasMore, onLoadMore, search, setSearch } =
    useEntityList({
      listType,
      filters,
      populate,
      selectedOption,
      enabled: field.type === "select" || field.type === "async-select",
    });
  const [, scrollerRef] = useInfiniteScroll({
    hasMore,
    isEnabled: isOpen,
    shouldUseLoader: false,
    onLoadMore,
  });

  useEffect(() => {
    if (!isFocused && field.selectedOptionLabel) {
      setInputValue(field.selectedOptionLabel);
    }
  }, [field.selectedOptionLabel, isFocused]);

  const onSelectionChange = (key) => {
    if (!key) return;
    const selectedItem = options.find((item) => item.id == key || item == key);
    if (field?.onChange && selectedItem) {
      field.onChange(selectedItem);
      // Update input value to match selected item's label
      const label = field.render
        ? field.render(selectedItem)
        : selectedItem.name || selectedItem.id;
      setInputValue(label);
    }
    setIsFocused(false);
  };

  const onInputChange = (value) => {
    setInputValue(value);
    if (isFocused) {
      setSearch(value);
    }
  };

  return (
    <div
      className={classNames({
        "col-span-full w-full": field.type === "divider",
        "flex flex-col gap-1 mt-3 md:mt-0 md:flex-1 w-full":
          field.type !== "divider",
        "col-span-full w-full": field.fullWidth === true,
      })}
    >
      {field.type === "select" && (
        <Select
          className="w-full"
          label={field.label || "Seleccione una opción"}
          placeholder={field.placeholder || "Seleccione una opción"}
          selectedKeys={[field.value]}
          onSelectionChange={(keys) => {
            field.onChange(keys.currentKey);
          }}
          aria-label={field.label || "Seleccione una opción"}
          isReadOnly={field.disabled}
          isDisabled={field.disabled}
        >
          {field.options.map((option) => (
            <SelectItem key={option.key}>{option.label}</SelectItem>
          ))}
        </Select>
      )}
      {field.type === "async-select" && (
        <Autocomplete
          className="w-full"
          isLoading={isLoading}
          isDisabled={field.disabled}
          items={options}
          label={field.label || "Seleccione una opción"}
          placeholder={field.placeholder || "Seleccione una opción"}
          scrollRef={scrollerRef}
          selectionMode="single"
          onOpenChange={setIsOpen}
          onSelectionChange={onSelectionChange}
          onInputChange={onInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            if (field.selectedOptionLabel) {
              setInputValue(field.selectedOptionLabel);
            }
          }}
          inputValue={inputValue}
          selectedKey={
            field.selectedOption?.id ? String(field.selectedOption.id) : null
          }
          aria-label={field.label || "Seleccione una opción"}
        >
          {(item) => (
            <AutocompleteItem
              key={item.id || item}
              textValue={field.render ? field.render(item) : item.name}
              aria-label={field.label || "Seleccione una opción"}
              className="w-full"
            >
              {field.render
                ? field.render(item)
                : typeof item === "object"
                  ? item.id
                  : item}
            </AutocompleteItem>
          )}
        </Autocomplete>
      )}
      {field.type === "divider" && <Divider className="mt-3 md:mt-0" />}
      {field.type === "date-picker" && (
        <I18nProvider locale="es-CL">
          <DatePicker
            placeholder={field.placeholder || "Seleccione una fecha"}
            value={field.value}
            onChange={field.onChange}
            aria-label={field.label || "Seleccione una fecha"}
            isReadOnly={field.disabled}
            label={field.label}
          />
        </I18nProvider>
      )}
      {field.type === "input" && (
        <DebouncedInput
          label={field.label}
          placeholder={field.placeholder}
          initialValue={field.value}
          onDebouncedChange={field.onChange}
          aria-label={field.label}
          isReadOnly={field.disabled}
        />
      )}
      {field.type === "textarea" && (
        <Textarea
          label={field.label}
          placeholder={field.placeholder}
          value={field.value || ""}
          onValueChange={field.onChange}
          variant="faded"
          isReadOnly={field.disabled}
        />
      )}
    </div>
  );
}

// Header de entidad
function EntityHeader(props) {
  const { entity, title, children } = props;
  const screenSize = useScreenSize();

  return (
    <Card>
      <CardHeader className="gap-2 pb-0 md:pb-3 md:pt-4 flex flex-col items-start">
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-xl md:text-3xl">{title}</h1>
          {entity?.state && (
            <Chip color={getChipVariant(entity)} size={screenSize}>
              {entity.state}
            </Chip>
          )}
        </div>
        {(entity?.code || entity?.identification) && (
          <h2 className="lg:text-xl text-sm text-zinc-400">
            {entity.code || ""}
          </h2>
        )}
      </CardHeader>
      <CardBody className="grid grid-cols-1 md:grid-cols-2 md:gap-4">
        {children}
      </CardBody>
    </Card>
  );
}

export default function Entity(props) {
  const {
    children,
    headerFields = [],
    entity,
    setEntity,
    title = "Entidad",
  } = props;
  return (
    <div className="space-y-6 pb-8 w-full flex flex-col">
      <EntityHeader entity={entity} title={title}>
        {headerFields.map((field, index) => (
          <EntityHeaderField
            key={`${index}-header-field`}
            field={field}
            setEntity={setEntity}
          />
        ))}
      </EntityHeader>
      {children}
    </div>
  );
}
