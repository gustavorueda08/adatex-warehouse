"use client";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import classNames from "classnames";

export default function Searchbar({
  search,
  setSearch,
  placeHolder = "Buscar",
  className = "",
  ref = null,
}) {
  return (
    <div
      ref={ref}
      className={classNames(
        `flex items-center max-w-lg lg:min-w-xs mx-auto border-none`,
        className
      )}
    >
      <div className="relative w-full">
        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
          <MagnifyingGlassIcon className="w-5 h-5" />
        </div>
        <input
          type="text"
          id="simple-search"
          className=" bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm rounded-lg  block w-full ps-10 p-2.5 focus:outline-none focus:ring-0 focus:border-transparent"
          placeholder={placeHolder}
          required
          value={search ?? search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </div>
  );
}
