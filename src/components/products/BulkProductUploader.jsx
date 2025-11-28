import React, { useCallback, useRef, useState } from "react";
import Card, {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  CheckCircleIcon,
  DocumentArrowUpIcon,
  TrashIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

const REQUIRED_COLUMNS = [
  {
    label: "CODIGO",
    variants: ["codigo", "code", "código"],
    description: "Código interno del producto",
  },
  {
    label: "NOMBRE",
    variants: ["nombre", "name"],
    description: "Nombre del producto",
  },
  {
    label: "UNIDAD",
    variants: ["unidad", "unit"],
    description: "Unidad de medida (ej: und, kg, mts)",
  },
];

const OPTIONAL_COLUMNS = [
  { label: "UNIDADES_POR_PAQUETE", description: "Paquetes o unidades por caja" },
  { label: "BARCODE", description: "Código de barras o SKU" },
  { label: "DESCRIPCION", description: "Descripción corta" },
  { label: "ACTIVO", description: "true/false o sí/no" },
];

/**
 * Cargador masivo de productos desde Excel/CSV.
 * Reutiliza el flujo de BulkPackingListUploader pero con validaciones
 * y textos orientados al catálogo de productos.
 */
export default function BulkProductUploader({
  onFileLoaded,
  onClear = () => {},
  isReadOnly = false,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedFile, setLoadedFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const fileInputRef = useRef(null);

  const normalizeColumn = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const validateColumns = useCallback(
    (rows) => {
      if (!rows || rows.length === 0) {
        return { valid: false, message: "El archivo está vacío" };
      }

      const headers = Object.keys(rows[0]).map(normalizeColumn);
      const missing = REQUIRED_COLUMNS.filter(
        (column) => !column.variants.some((variant) => headers.includes(variant))
      );

      if (missing.length > 0) {
        return {
          valid: false,
          message: `Falta la columna requerida "${missing[0].label}"`,
        };
      }

      return { valid: true };
    },
    []
  );

  const handleRemoveFile = useCallback(() => {
    setLoadedFile(null);
    setPreviewData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClear();
  }, [onClear]);

  const processFile = useCallback(
    (file) => {
      if (!file) return;

      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];

      const hasValidMime = validTypes.includes(file.type);
      const hasValidExtension = [".xlsx", ".xls", ".csv"].some((ext) =>
        file.name?.toLowerCase().endsWith(ext)
      );

      if (!hasValidMime && !hasValidExtension) {
        toast.error("Formato no soportado. Usa .xlsx, .xls o .csv");
        return;
      }

      setIsLoading(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(new Uint8Array(e.target.result), {
            type: "array",
          });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          const validation = validateColumns(jsonData);
          if (!validation.valid) {
            toast.error(validation.message);
            setIsLoading(false);
            return;
          }

          setLoadedFile({
            name: file.name,
            size: file.size,
            itemCount: jsonData.length,
            date: new Date(),
          });
          setPreviewData(jsonData.slice(0, 5));

          if (onFileLoaded) {
            onFileLoaded(jsonData, handleRemoveFile);
          }

          toast.success(`${jsonData.length} productos listos para revisar`);
        } catch (error) {
          console.error("Error procesando archivo de productos:", error);
          toast.error("No se pudo procesar el archivo. Revisa el formato.");
        } finally {
          setIsLoading(false);
        }
      };

      reader.onerror = () => {
        toast.error("No se pudo leer el archivo");
        setIsLoading(false);
      };

      reader.readAsArrayBuffer(file);
    },
    [handleRemoveFile, onFileLoaded, validateColumns]
  );

  const handleDragEnter = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      const files = event.dataTransfer.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile]
  );

  const handleFileInputChange = useCallback(
    (event) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile]
  );

  const handleClickUpload = useCallback(() => {
    if (!isReadOnly && !isLoading) {
      fileInputRef.current?.click();
    }
  }, [isReadOnly, isLoading]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Carga masiva de productos</CardTitle>
        <CardDescription>
          Sube un Excel/CSV con el catálogo completo o parcial para revisarlo y
          prepararlo antes de enviarlo.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-4 p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <DocumentArrowUpIcon className="w-5 h-5 text-cyan-400" />
            Columnas esperadas
          </h4>
          <div className="flex flex-wrap gap-2">
            {REQUIRED_COLUMNS.map((col) => (
              <div
                key={col.label}
                className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-600/20 border border-cyan-500/30 rounded-full"
                title={col.description}
              >
                <span className="text-xs font-mono text-cyan-300 font-semibold">
                  {col.label}
                </span>
              </div>
            ))}
            {OPTIONAL_COLUMNS.map((col) => (
              <div
                key={col.label}
                className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-700/60 border border-neutral-600 rounded-full"
                title={col.description}
              >
                <span className="text-xs font-mono text-gray-200">
                  {col.label}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Formatos soportados: .xlsx, .xls, .csv
          </p>
        </div>

        {!loadedFile ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInputChange}
              className="hidden"
              disabled={isReadOnly || isLoading}
            />

            <div
              onClick={handleClickUpload}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-all duration-200
                ${
                  isDragging
                    ? "border-cyan-500 bg-cyan-500/10"
                    : "border-neutral-600 bg-neutral-800/50 hover:border-neutral-500 hover:bg-neutral-800"
                }
                ${isReadOnly || isLoading ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
                  <p className="text-white font-medium">Procesando archivo...</p>
                  <p className="text-sm text-gray-400">
                    Esto puede tomar unos segundos
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <DocumentArrowUpIcon
                    className={`w-16 h-16 ${
                      isDragging ? "text-cyan-400" : "text-gray-400"
                    }`}
                  />
                  <div>
                    <p className="text-white font-medium">
                      {isDragging
                        ? "Suelta el archivo aquí"
                        : "Arrastra tu archivo aquí"}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      o haz clic para seleccionar
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    .xlsx, .xls, .csv
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <CheckCircleIcon className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {loadedFile.name}
                    </p>
                    <p className="text-sm text-emerald-300 mt-1">
                      {loadedFile.itemCount} productos procesados
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {(loadedFile.size / 1024).toFixed(2)} KB •{" "}
                      {loadedFile.date.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="red"
                  size="sm"
                  onClick={handleRemoveFile}
                  disabled={isReadOnly}
                  className="flex-shrink-0"
                >
                  <TrashIcon className="w-4 h-4 mr-1" />
                  Remover
                </Button>
              </div>
            </div>

            {previewData.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">
                  Vista previa (primeras {previewData.length} filas):
                </h4>
                <div className="overflow-x-auto rounded-lg border border-neutral-700">
                  <table className="min-w-full divide-y divide-neutral-700">
                    <thead className="bg-neutral-800">
                      <tr>
                        {Object.keys(previewData[0]).map((key) => (
                          <th
                            key={key}
                            className="px-4 py-2 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-neutral-900 divide-y divide-neutral-700">
                      {previewData.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-neutral-800">
                          {Object.values(row).map((value, colIdx) => (
                            <td
                              key={colIdx}
                              className="px-4 py-2 text-sm text-gray-300 whitespace-nowrap"
                            >
                              {value || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {loadedFile.itemCount > previewData.length && (
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    ... y {loadedFile.itemCount - previewData.length} filas más
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>

      {isReadOnly && (
        <CardFooter>
          <div className="text-sm text-yellow-400 flex items-center gap-2">
            <XCircleIcon className="w-5 h-5" />
            <span>
              No se puede cargar archivos mientras el producto está bloqueado
            </span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
