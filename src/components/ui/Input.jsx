"use client";

import { ArrowPathIcon } from "@heroicons/react/24/solid";
import classNames from "classnames";
import { memo, useState } from "react";

const Input = memo(function Input({
  ref,
  input,
  setInput,
  placeholder = "Buscar",
  loadingPlaceholder = "Buscando...",
  className = "",
  onEnter = () => {},
  disabled = false,
  loading = false,
  required = true,
  type = "text",
  step,
  min,
  max,
}) {
  const [bounce, setBounce] = useState(false);
  const [internalInput, setInternalInput] = useState("");

  return (
    <div
      ref={ref}
      className={classNames(
        "flex items-center md:min-w-20 border-none",
        className
      )}
    >
      <div className="relative w-full flex flex-row gap-1.5">
        {loading && (
          <ArrowPathIcon className="w-5 h-5 self-center transition-all animate-spin" />
        )}
        <input
          readOnly={disabled}
          type={type}
          id="simple-search"
          className={classNames(
            "bg-zinc-900 hover:bg-zinc-700 transition-colors text-sm rounded-md block w-full p-2 sm:p-2.5 focus:outline-none focus:ring-0 focus:border-transparent",
            {
              "bg-zinc-900 hover:bg-zinc-800 cursor-not-allowed": disabled,
              "animate-pulse": bounce,
            }
          )}
          placeholder={loading ? loadingPlaceholder : placeholder}
          required={required}
          step={step}
          min={min}
          max={max}
          value={setInput ? input || "" : internalInput}
          onChange={(e) =>
            setInput
              ? setInput(e.target.value)
              : setInternalInput(e.target.value)
          }
          onClick={() => {
            if (disabled) {
              setBounce(true);
              setTimeout(() => setBounce(false), 1000);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) onEnter(e.target.value);
          }}
        />
      </div>
    </div>
  );
});

export default Input;
