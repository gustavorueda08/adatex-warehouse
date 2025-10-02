import classNames from "classnames";
import React, { useState } from "react";
import * as XLSX from "xlsx";

export default function DragAndDrop({
  onDataLoaded = () => {},
  setData = () => {},
  onLoadingStart = () => {},
  setLoading = () => {},
  disabled = false,
}) {
  const [dragActive, setDragActive] = useState(false);

  // Manejo de eventos de arrastre
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Manejo de soltar archivos
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e);
  };

  const [fileName, setFileName] = useState("");

  const handleFileUpload = (event) => {
    if (onLoadingStart) {
      onLoadingStart();
    }
    setLoading(true);
    const file = event.target.files[0];
    setFileName("");
    setFileName(file.name);
    onDataLoaded([]);
    setData([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      onDataLoaded(jsonData);
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div
      className={classNames(
        "p-6 border-dashed border-zinc-700 border-2 rounded-lg bg-zinc-800 hover:bg-zinc-600 hover:border-zinc-500 transition-colors"
      )}
    >
      <form
        className={`relative w-full h-48 flex flex-col justify-center items-center`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={handleFileUpload}
          disabled={disabled}
        />
        {fileName !== "" ? (
          <div className="mt-4">
            <p variant="small" className="font-semibold mb-2">
              Archivo seleccionado: {fileName}
            </p>
          </div>
        ) : (
          <p variant="small" className="text-zinc-300 text-center">
            {dragActive
              ? "Suelta tus archivos aquí"
              : "Arrastra y suelta tus archivos aquí o haz clic para seleccionarlos"}
          </p>
        )}
      </form>
    </div>
  );
}
