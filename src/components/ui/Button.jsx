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
          "bg-zinc-600 hover:bg-zinc-500 active:bg-zinc-700":
            variant === "zinc" && !isDisabled,
          "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700":
            variant === "emerald" && !isDisabled,
          "bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700":
            variant === "cyan" && !isDisabled,
          "bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500":
            variant === "yellow" && !isDisabled,
          "bg-purple-600 hover:bg-purple-500 active:bg-purple-700":
            variant === "purple" && !isDisabled,
          // Estados deshabilitados
          "bg-red-800 cursor-not-allowed": variant === "red" && isDisabled,
          "bg-zinc-800 cursor-not-allowed": variant === "zinc" && isDisabled,
          "bg-emerald-800 cursor-not-allowed":
            variant === "emerald" && isDisabled,
          "bg-cyan-800 cursor-not-allowed": variant === "cyan" && isDisabled,
          "bg-yellow-600 cursor-not-allowed":
            variant === "yellow" && isDisabled,
          "bg-purple-800 cursor-not-allowed":
            variant === "purple" && isDisabled,
          // Bold
          "font-bold": bold,
          // Ancho Full
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
