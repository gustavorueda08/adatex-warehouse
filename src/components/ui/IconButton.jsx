"use client";
import classNames from "classnames";
import React from "react";

export default function IconButton({
  children,
  variant = "zinc",
  onClick = () => {},
  ...props
}) {
  return (
    <button
      {...props}
      className={classNames(
        "transition-colors duration-200 ease-in-out self-center",
        {
          "text-red-600 hover:text-red-500 active:text-red-700":
            variant === "red",
          "text-zinc-400 hover:text-zinc-700 active:text-zinc-900":
            variant === "zinc",
          "text-emerald-600 hover:text-emerald-500 active:text-emerald-700":
            variant === "emerald",
        }
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
