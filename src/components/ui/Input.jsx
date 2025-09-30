"use client";
export default function Input({
  ref,
  input,
  setInput,
  placeHolder = "Buscar",
  className = "",
  onEnter = null,
}) {
  return (
    <div
      ref={ref}
      className={`flex items-center  lg:min-w-xs  border-none ${className}`}
    >
      <div className="relative w-full">
        <input
          type="text"
          id="simple-search"
          className=" bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm rounded-md  block w-full p-2.5 focus:outline-none focus:ring-0 focus:border-transparent"
          placeholder={placeHolder}
          required
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) onEnter(e);
          }}
        />
      </div>
    </div>
  );
}
