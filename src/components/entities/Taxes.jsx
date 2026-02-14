import { useEntityList } from "@/lib/hooks/useEntityList";
import { Chip, Select, SelectItem } from "@heroui/react";
import { useInfiniteScroll } from "@heroui/use-infinite-scroll";
import React, { useState } from "react";

const Tax = ({ tax }) => {
  return (
    <div className="flex items-center gap-2">
      <Chip color="secondary">{tax.name}</Chip>
    </div>
  );
};

export default function Taxes({ taxes = [], setEntity, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const { options, onLoadMore, hasMore, isLoading } = useEntityList({
    listType: "taxes",
    limit: 10,
    filters: (search) => ({
      name: {
        $containsi: search,
      },
    }),
    selectedOption: taxes,
  });
  const [, scrollerRef] = useInfiniteScroll({
    hasMore,
    isEnabled: isOpen,
    shouldUseLoader: false,
    onLoadMore,
  });
  const handleSelectionChange = (keys) => {
    const selectedIds = new Set(keys);
    const selectedTaxes = options.filter(
      (tax) => selectedIds.has(String(tax.id)) || selectedIds.has(tax.id),
    );
    setEntity((prev) => ({ ...prev, taxes: selectedTaxes }));
  };

  return (
    <div className="flex p-4">
      <Select
        className="w-full"
        isLoading={isLoading}
        isDisabled={disabled}
        items={options}
        label={"Impuestos"}
        placeholder={"Seleccione los impuestos"}
        scrollRef={scrollerRef}
        selectionMode="multiple"
        selectedKeys={new Set(taxes?.map((t) => String(t.id)) || [])}
        onOpenChange={setIsOpen}
        onSelectionChange={handleSelectionChange}
        renderValue={(items) => (
          <div className="flex flex-wrap items-center gap-2">
            {items.map((item) => (
              <Tax key={item.key} tax={item.data} />
            ))}
          </div>
        )}
        isMultiline
      >
        {(item) => (
          <SelectItem
            key={item.id || item}
            aria-label={"Impuestos"}
            className="w-full"
          >
            {item.name}
          </SelectItem>
        )}
      </Select>
    </div>
  );
}
