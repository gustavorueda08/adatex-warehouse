"use client";

import { Card } from "@heroui/card";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import classNames from "classnames";
import { useState } from "react";

export default function Section({
  title,
  description,
  className,
  children,
  icon,
  color = "default",
  defaultOpen = true,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const colorClass = {
    default: "text-default-500",
    primary: "text-primary-500",
    secondary: "text-secondary-500",
    success: "text-success-500",
    warning: "text-warning-500",
    error: "text-error-500",
  };

  return (
    <Card className={classNames("flex flex-col overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex items-center gap-2 px-4 pt-4 pb-3 w-full text-left"
      >
        {icon && <div className={colorClass[color]}>{icon}</div>}
        <div className="flex flex-col flex-1">
          <h2 className="font-bold text-lg md:text-2xl m-0 p-0">{title}</h2>
          {description && (
            <p className="text-gray-500 m-0 p-0 text-sm">{description}</p>
          )}
        </div>
        <ChevronDownIcon
          className={classNames(
            "w-5 h-5 text-default-400 transition-transform duration-300 shrink-0",
            isOpen ? "rotate-180" : "rotate-0",
          )}
        />
      </button>
      <div
        className={classNames(
          "grid transition-all duration-300",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </Card>
  );
}
