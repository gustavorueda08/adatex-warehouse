"use client";

import { ArrowPathIcon } from "@heroicons/react/24/solid";
import React, { useState } from "react";
import * as XLSX from "xlsx";
export default function FileInput({ onFileLoaded = () => {} }) {
  const [loading, setLoading] = useState(false);
  const [filename, setFilename] = useState("");

  const handleFileUpload = (event) => {
    setLoading(true);
    onFileLoaded(null);
    setFilename("");
    try {
      const file = event.target.files[0];
      setFilename(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        onFileLoaded(jsonData, () => setFilename(""));
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative bg-zinc-800 border border-zinc-700 flex flex-row align-middle p-0 m-0 rounded-md hover:bg-zinc-600 transition-colors">
      <input
        type="file"
        id="file-input"
        className="inset-0 opacity-0 cursor-pointer absolute"
        onChange={handleFileUpload}
      />
      <div className="self-center border-r border-r-zinc-700 flex bg-zinc-700 rounded-l-md hover:bg-zinc-800 ">
        {loading && (
          <ArrowPathIcon className="w-5 h-5 self-center transition-all animate-spin" />
        )}
        <p className="p-2 h-full">
          {filename !== "" ? "Archivo" : "Subir archivo"}
        </p>
      </div>
      {filename !== "" && <p className="self-center px-4">{filename}</p>}
    </div>
  );
}
