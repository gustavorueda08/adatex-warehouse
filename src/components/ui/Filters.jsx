"use client";

import DatePicker from "./DatePicker";
import Searchbar from "./Searchbar";
import DropdownSelector from "./DropdownSelector";
import { orderStatesArray } from "@/lib/utils/orderStates";
import { useState, memo } from "react";
import Link from "next/link";

function Filters(props) {
  const {
    placeHolder = "Buscar",
    search = null,
    setSearch = null,
    range = { from: null, to: null },
    setRange = null,
    options = [],
    setSelectedOptions = null,
    linkPath = "/new-purchase",
  } = props;

  return (
    <div className="py-4 flex flex-col md:flex-row justify-between align-middle min-h-[76px]">
      <div className="flex flex-col md:flex-row gap-2 min-h-[42px]">
        <Searchbar
          placeHolder={placeHolder}
          search={search}
          setSearch={setSearch}
          className="w-full md:w-auto md:min-w-[250px]"
        />
        <DatePicker
          mode="range"
          value={range}
          onChange={setRange}
          placeholder="Selecciona un rango"
          className="w-full md:w-auto md:min-w-[250px]"
        />
      </div>

      <div className="flex flex-col md:flex-row gap-2 align-middle w-full md:w-auto mt-2 md:mt-0 min-h-[42px]">
        <DropdownSelector
          options={options}
          setSelectedOptions={setSelectedOptions}
          className="w-full md:min-w-[180px]"
        />
        <Link href={linkPath}>
          <button
            type="button"
            className="text-sm px-5 py-2.5 min-w-30 rounded bg-emerald-700 text-white hover:bg-emerald-800 transition-colors w-full md:w-auto"
          >
            Crear
          </button>
        </Link>
      </div>
    </div>
  );
}

export default memo(Filters);
