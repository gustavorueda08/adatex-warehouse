"use client";

import { Checkbox } from "flowbite-react";
import { useState, useEffect, useRef } from "react";

export default function DropdownSelector({
  options = [],
  setSelectedOptions: setExternalSelectedOptions = null,
  title = "Estado",
}) {
  const [open, setOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState(
    new Set(options.map((o) => o.key))
  );
  const ref = useRef(null);
  console.log(options);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={ref} className="relative max-w-30">
      <button
        data-dropdown-toggle="dropdownDelay"
        data-dropdown-delay="500"
        data-dropdown-trigger="hover"
        className="text-white bg-zinc-700  focus:outline-none  font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center w-full"
        type="button"
        onClick={() => setOpen(!open)}
      >
        {title}{" "}
        <svg
          className="w-2.5 h-2.5 ms-3"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 10 6"
        >
          <path
            stroke="currentColor"
            strokeWidth="round"
            strokeLinejoin="round"
            d="m1 1 4 4 4-4"
          />
        </svg>
      </button>

      {/* <!-- Dropdown menu --> */}
      <div
        className={`z-10 ${
          open ? "flex" : "hidden"
        } bg-zinc-800 rounded-lg absolute -left-10 -right-10 mt-3`}
      >
        <ul className="py-2 flex justify-between flex-col w-full">
          <li
            className="flex flex-row justify-between align-middle z-20 hover:bg-zinc-700 py-2 px-3"
            onClick={() => {
              const allSelected = selectedOptions.size === options.length;
              const next = allSelected
                ? new Set() // deseleccionar todo
                : new Set(options.map((o) => o.key)); // seleccionar todo (Set de keys)

              setSelectedOptions(next);
              // si quieres notificar al padre:
              setExternalSelectedOptions?.(next);
            }}
          >
            <span className="self-center">Seleccionar Todos</span>
            <Checkbox
              className="self-center"
              checked={selectedOptions.size === options.length}
              onChange={() => {}} // evita warning de React (controlado)
            />
          </li>
          {options.map((option) => {
            const isSelected = selectedOptions.has(option.key);
            return (
              <li
                key={option.key}
                className="flex flex-row justify-between align-middle z-20 hover:bg-zinc-700 py-2 px-3"
                onClick={() => {
                  const newSelected = new Set(selectedOptions);
                  isSelected
                    ? newSelected.delete(option.key)
                    : newSelected.add(option.key);
                  setSelectedOptions(newSelected);
                  if (setExternalSelectedOptions) {
                    setExternalSelectedOptions(newSelected);
                  }
                }}
              >
                <span className="self-center">{option.label}</span>
                <Checkbox
                  className="self-center"
                  checked={isSelected}
                  onChange={() => {}}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
