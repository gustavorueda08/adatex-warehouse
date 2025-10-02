"use client";

import classNames from "classnames";
import { memo } from "react";

const Input = memo(function Input({
  ref,
  input,
  setInput,
  placeholder = "Buscar",
  className = "",
  onEnter = null,
}) {
  return (
    <div
      ref={ref}
      className={classNames(
        "flex items-center md:min-w-20 border-none",
        className
      )}
    >
      <div className="relative w-full">
        <input
          type="text"
          id="simple-search"
          className="bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm rounded-md block w-full p-2.5 focus:outline-none focus:ring-0 focus:border-transparent"
          placeholder={placeholder}
          required
          value={input || ""}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) onEnter(e);
          }}
        />
      </div>
    </div>
  );
});

export default Input;
