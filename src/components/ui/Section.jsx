import { Card } from "@heroui/card";
import classNames from "classnames";
import React from "react";

export default function Section({
  title,
  description,
  className,
  children,
  icon,
  color = "default",
}) {
  const colorClass = {
    default: "text-default-500",
    primary: "text-primary-500",
    secondary: "text-secondary-500",
    success: "text-success-500",
    warning: "text-warning-500",
    error: "text-error-500",
  };
  return (
    <Card className={classNames("flex flex-col", className)}>
      <div className="flex items-center gap-2 px-4 pt-4">
        {icon && <div className={colorClass[color]}>{icon}</div>}
        <div className="flex flex-col">
          <h2 className="font-bold text-lg md:text-2xl m-0 p-0">{title}</h2>
          {description && (
            <p className="text-gray-500 m-0 p-0 text-sm">{description}</p>
          )}
        </div>
      </div>
      <div>{children}</div>
    </Card>
  );
}
