import React, { useMemo } from "react";
import DebouncedInput from "../ui/DebounceInput";
import { Select, SelectItem } from "@heroui/react";

export default function PaymentTerms({
  entity,
  setEntity,
  termOptions = [],
  disabled = false,
}) {
  const options = useMemo(() => {
    if (termOptions.length > 0) {
      return termOptions.map((term) => ({
        key: term.id || term.key,
        label: term.name,
      }));
    }
    return [
      { key: 0, label: "Sin plazo" },
      { key: 15, label: "15 días" },
      { key: 30, label: "30 días" },
      { key: 45, label: "45 días" },
      { key: 60, label: "60 días" },
      { key: 90, label: "90 días" },
      { key: 120, label: "120 días" },
    ];
  }, [termOptions]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <Select
        label="Plazo de Pago"
        options={options}
        onSelectionChange={(keys) =>
          setEntity({ ...entity, paymentTerms: Number(keys.currentKey) })
        }
        selectedKeys={[String(entity?.paymentTerms)]}
        isDisabled={disabled}
      >
        {options.map((option) => (
          <SelectItem key={option.key}>{option.label}</SelectItem>
        ))}
      </Select>
      <DebouncedInput
        label="Cupo de Crédito"
        initialValue={entity?.creditLimit}
        onDebouncedChange={(value) =>
          setEntity({ ...entity, creditLimit: value })
        }
        type="currency"
        disabled={disabled}
      />
    </div>
  );
}
