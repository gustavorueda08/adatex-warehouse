import { Input } from "@heroui/react";
import { useEffect, useState, useRef } from "react";

const formatValue = (value, type) => {
  if (value === "" || value === null || value === undefined) return "";
  const formatted = new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

  if (type === "currency") {
    return `$ ${formatted}`;
  }
  return formatted;
};

const parseValue = (value) => {
  if (!value || value === "") return "";
  // Remove currency symbol, thousands separators, and normalize decimal separator
  // Assuming 'es-ES' uses '.' for thousands and ',' for decimals
  const cleanValue = value
    .toString()
    .replace(/[$\s]/g, "") // Remove symbol and spaces
    .replace(/\./g, "") // Remove thousands separator
    .replace(/,/g, "."); // Replace decimal separator with dot

  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? "" : parsed;
};

export default function DebouncedInput({
  initialValue,
  onDebouncedChange,
  debounce = 500,
  type = "text",
  disabled,
  ...props
}) {
  const [value, setValue] = useState("");
  const isFormatted = type === "currency" || type === "number";

  const onDebouncedChangeRef = useRef(onDebouncedChange);
  const isUserChange = useRef(false);

  useEffect(() => {
    onDebouncedChangeRef.current = onDebouncedChange;
  }, [onDebouncedChange]);

  useEffect(() => {
    if (isFormatted) {
      setValue(formatValue(initialValue, type));
    } else {
      setValue(initialValue || "");
    }
    isUserChange.current = false;
  }, [initialValue, type, isFormatted]);

  useEffect(() => {
    if (!isUserChange.current) return;

    const timeout = setTimeout(() => {
      let valueToSend = value;
      if (isFormatted) {
        valueToSend = parseValue(value);
      }
      onDebouncedChangeRef.current(valueToSend);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value, debounce, type, isFormatted]);

  const handleChange = (val) => {
    setValue(val);
    isUserChange.current = true;
  };

  const handleBlur = () => {
    if (isFormatted) {
      const numeric = parseValue(value);
      setValue(formatValue(numeric, type));
    }
  };

  return (
    <Input
      {...props}
      disabled={disabled}
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      type={isFormatted ? "text" : type}
      inputMode={isFormatted ? "decimal" : undefined}
      classNames={{
        innerWrapper: "min-w-[200px]",
      }}
    />
  );
}
