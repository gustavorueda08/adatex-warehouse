"use client";

import classNames from "classnames";

export default function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder = "",
  required = false,
  disabled = false,
  error = null,
  className = "",
  inputClassName = "",
  rows = 4,
}) {
  const inputId = `field-${name}`;

  const baseInputClasses = classNames(
    "bg-zinc-800 text-white text-sm rounded-lg block w-full p-2.5",
    "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent",
    "transition-colors",
    {
      "border-2 border-red-500": error,
      "border border-zinc-700": !error,
      "hover:bg-zinc-700": !disabled && !error,
      "bg-zinc-900 cursor-not-allowed opacity-60": disabled,
    },
    inputClassName
  );

  return (
    <div className={classNames("flex flex-col gap-2", className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {type === "textarea" ? (
        <textarea
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          className={baseInputClasses}
        />
      ) : (
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={baseInputClasses}
        />
      )}

      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
