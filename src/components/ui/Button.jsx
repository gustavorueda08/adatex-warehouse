"use client";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import classNames from "classnames";

export default function Button({
  children,
  variant = "zinc",
  onClick = () => {},
  loading = false,
  disabled = false,
  bold = false,
  fullWidth = false,
  className = "",
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={classNames(
        "transition-colors duration-200 ease-in-out self-center py-2 px-3 rounded-lg min-w-20 border-none focus:border-none focus:outline-none flex flex-row gap-2 justify-center",
        {
          // Estados normales
          "bg-red-600 hover:bg-red-500 active:bg-red-700":
            variant === "red" && !isDisabled,
          "bg-zinc-400 hover:bg-zinc-700 active:bg-zinc-900":
            variant === "zinc" && !isDisabled,
          "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700":
            variant === "emerald" && !isDisabled,

          // Estados deshabilitados
          "bg-red-400 cursor-not-allowed opacity-60":
            variant === "red" && isDisabled,
          "bg-zinc-300 cursor-not-allowed opacity-60":
            variant === "zinc" && isDisabled,
          "bg-emerald-400 cursor-not-allowed opacity-60":
            variant === "emerald" && isDisabled,

          "font-bold": bold,
          "w-full": fullWidth,
        },
        className
      )}
      onClick={isDisabled ? undefined : onClick}
    >
      {loading && (
        <ArrowPathIcon className="w-5 h-5 self-center transition-all animate-spin" />
      )}
      {children}
    </button>
  );
}
