"use client";

import DatePicker from "./DatePicker";
import Searchbar from "./Searchbar";
import DropdownSelector from "./DropdownSelector";
import { orderStatesArray } from "@/lib/utils/orderStates";
import { useState } from "react";
import Link from "next/link";

export default function Filters(props) {
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
    <div className="py-4 flex flex-row justify-between align-middle">
      <div className="flex flex-row gap-2">
        <Searchbar
          placeHolder={placeHolder}
          search={search}
          setSearch={setSearch}
        />
        <DatePicker
          value={range}
          onChange={setRange}
          placeholder="Selecciona un rango"
        />
      </div>

      <div></div>

      <div className="flex flex-row gap-2 align-middle">
        <DropdownSelector
          options={options}
          setSelectedOptions={setSelectedOptions}
        />

        <Link href={linkPath}>
          <button
            type="button"
            className="text-sm px-5 py-2.5 min-w-30 rounded bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
          >
            Crear
          </button>
        </Link>
      </div>
    </div>
  );
}
