import classNames from "classnames";
import React from "react";

export default function Bagde({
  variant = "zinc",
  className = "",
  children,
  size = "sm",
}) {
  return (
    <span
      className={classNames(
        "rounded-xl self-center py-1 px-2 text-zinc-50 text-sm flex flex-row justify-center items-center",
        className,
        {
          "bg-zinc-900": variant === "zinc",
          "bg-emerald-800": variant === "emerald",
          "bg-red-800": variant === "red",
          "bg-cyan-800": variant === "cyan",
          "bg-yellow-400": variant === "yellow",
        },
        {
          "text-xs": size === "xs",
          "text-sm": size === "sm",
          "text-lg": size === "lg",
          "text-xl": size === "xl",
        }
      )}
    >
      {children}
    </span>
  );
}
