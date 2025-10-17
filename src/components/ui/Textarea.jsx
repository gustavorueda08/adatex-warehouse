import classNames from "classnames";
import React from "react";

export default function Textarea({
  value = "",
  setValue = () => {},
  placeholder = "",
  className = "",
}) {
  return (
    <textarea
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      className={classNames(
        className,
        "w-full min-h-32 bg-zinc-900 rounded-md focus:border-none active:border-none px-4 py-2"
      )}
    />
  );
}
