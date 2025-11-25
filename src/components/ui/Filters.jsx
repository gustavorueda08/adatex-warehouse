"use client";

import DatePicker from "./DatePicker";
import Searchbar from "./Searchbar";
import DropdownSelector from "./DropdownSelector";
import { orderStatesArray } from "@/lib/utils/orderStates";
import { useState, memo } from "react";
import Link from "next/link";
import Button from "./Button";

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
    showDatePicker = true,
    showDropdownSelector = true,
  } = props;

  const [loading, setLoading] = useState(false);

  return (
    <div className="py-4 flex flex-col lg:flex-row justify-between align-middle min-h-[76px]">
      <div className="flex flex-col lg:flex-row gap-2 min-h-[42px]">
        <Searchbar
          placeHolder={placeHolder}
          search={search}
          setSearch={setSearch}
          className="w-full lg:w-auto lg:min-w-[250px]"
          autoWidth={false}
        />
        {showDatePicker && (
          <DatePicker
            mode="range"
            value={range}
            onChange={setRange}
            placeholder="Selecciona un rango"
            className="w-full lg:w-auto lg:min-w-[250px]"
          />
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-2 align-middle w-full lg:w-auto mt-2 lg:mt-0 min-h-[42px]">
        {showDropdownSelector && (
          <DropdownSelector
            options={options}
            setSelectedOptions={setSelectedOptions}
            className="w-full md:min-w-[180px]"
          />
        )}
        <Link href={linkPath}>
          <Button
            variant="emerald"
            className="min-w-[100px]"
            loading={loading}
            onClick={() => setLoading(true)}
            fullWidth
          >
            Crear
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default memo(Filters);
