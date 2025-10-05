import classNames from "classnames";
import React, { useState, useId } from "react";
import { CheckIcon } from "@heroicons/react/24/solid";

export default function Checkbox({
  variant = "zinc",
  className = "",
  children,
  checked,
  onCheck,
  size = "md",
  disabled = false,
  id,
  defaultChecked = false,
}) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const generatedId = useId();

  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : internalChecked;

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const iconSizeClasses = {
    sm: "w-2.5 h-2.5",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  const checkboxId = id || `checkbox-${generatedId}`;

  const handleChange = (newChecked) => {
    if (!isControlled) {
      setInternalChecked(newChecked);
    }
    onCheck?.(newChecked);
  };

  return (
    <div className={classNames("flex items-center gap-2", className)}>
      <label
        htmlFor={checkboxId}
        className={classNames(
          sizeClasses[size],
          "relative inline-flex items-center justify-center rounded border-2 transition-all duration-150 flex-shrink-0",
          {
            // Red variant
            "border-red-700 bg-red-500 hover:bg-red-400 active:bg-red-600":
              variant === "red" && !disabled,
            "border-red-900 bg-red-800 opacity-50":
              variant === "red" && disabled,

            // Zinc variant
            "border-zinc-700 bg-zinc-500 hover:bg-zinc-400 active:bg-zinc-600":
              variant === "zinc" && !disabled,
            "border-zinc-900 bg-zinc-800 opacity-50":
              variant === "zinc" && disabled,

            // Emerald variant
            "border-emerald-700 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600":
              variant === "emerald" && !disabled,
            "border-emerald-900 bg-emerald-800 opacity-50":
              variant === "emerald" && disabled,

            // Cyan variant
            "border-cyan-700 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600":
              variant === "cyan" && !disabled,
            "border-cyan-900 bg-cyan-800 opacity-50":
              variant === "cyan" && disabled,

            // Yellow variant
            "border-yellow-500 bg-yellow-300 hover:bg-yellow-200 active:bg-yellow-400":
              variant === "yellow" && !disabled,
            "border-yellow-800 bg-yellow-600 opacity-50":
              variant === "yellow" && disabled,

            "cursor-pointer": !disabled,
            "cursor-not-allowed": disabled,
          }
        )}
      >
        <input
          id={checkboxId}
          type="checkbox"
          checked={isChecked}
          onChange={(e) => handleChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        {isChecked && (
          <CheckIcon
            className={classNames(iconSizeClasses[size], {
              "text-white": variant !== "yellow",
              "text-yellow-900": variant === "yellow",
            })}
          />
        )}
      </label>
      {children && (
        <label
          htmlFor={checkboxId}
          className={classNames("select-sm text-sm", {
            "cursor-pointer": !disabled,
            "cursor-not-allowed opacity-50": disabled,
          })}
        >
          {children}
        </label>
      )}
    </div>
  );
}
