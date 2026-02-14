import React, { useState, useCallback, useRef } from "react";
import { Card, CardHeader, CardFooter, Button, CardBody } from "@heroui/react";
import {
  DocumentArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

/**
 * Componente para carga masiva de lista de empaque desde archivo Excel
 * Proporciona una interfaz drag & drop con validación y vista previa
 *
 * @param {Function} onFileLoaded - Callback (data, removeCallback) cuando el archivo se carga exitosamente
 * @param {Boolean} isReadOnly - Si el componente está en modo solo lectura
 * @param {Object} context - Contexto opcional que se retorna al callback
 */
export default function BulkPackingListUploader({
  onFileLoaded,
  isReadOnly = false,
  context = {},
  requiredColumns = null,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedFile, setLoadedFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const fileInputRef = useRef(null);

  // Columnas requeridas en el Excel (Default o Props)
  const columnsToValidate = requiredColumns || [
    { key: "ID", label: "ID", description: "ID del producto" },
    { key: "NOMBRE", label: "NOMBRE", description: "Nombre del producto" },
    { key: "CANTIDAD", label: "CANTIDAD", description: "Cantidad a recibir" },
    { key: "LOTE", label: "LOTE", description: "Número de lote" },
    { key: "NUMERO", label: "NUMERO", description: "Número de item" },
  ];

  // Validar que el archivo tenga las columnas requeridas
  const validateColumns = (data) => {
    if (!data || data.length === 0) {
      return { valid: false, message: "El archivo está vacío" };
    }

    const firstRow = data[0];
    const fileColumns = Object.keys(firstRow);

    // Verificar columnas requeridas (al menos ID o NOMBRE, y CANTIDAD)
    const hasId = fileColumns.some((col) => ["ID", "id"].includes(col));
    const hasName = fileColumns.some((col) =>
      ["NOMBRE", "nombre", "Nombre"].includes(col),
    );
    const hasQuantity = fileColumns.some((col) =>
      ["CANTIDAD", "cantidad", "Cantidad"].includes(col),
    );

    if (!hasQuantity) {
      return {
        valid: false,
        message: 'Falta la columna requerida "CANTIDAD"',
      };
    }

    if (!hasId && !hasName) {
      return {
        valid: false,
        message: 'Se requiere al menos una columna "ID" o "NOMBRE"',
      };
    }

    return { valid: true };
  };

  // Procesar archivo
  const processFile = useCallback(
    (file) => {
      if (!file) return;

      // Validar tipo de archivo
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];

      if (!validTypes.includes(file.type)) {
        toast.error("Formato de archivo no válido. Use .xlsx, .xls o .csv");
        return;
      }

      setIsLoading(true);

      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Validar columnas
          const validation = validateColumns(jsonData);
          if (!validation.valid) {
            toast.error(validation.message);
            setIsLoading(false);
            return;
          }

          // Guardar información del archivo
          setLoadedFile({
            name: file.name,
            size: file.size,
            itemCount: jsonData.length,
            date: new Date(),
          });

          // Guardar preview (primeros 5 items)
          setPreviewData(jsonData.slice(0, 5));

          // Llamar al callback con función para remover
          if (onFileLoaded) {
            await onFileLoaded(jsonData, handleRemoveFile, context);
          }

          toast.success(`${jsonData.length} items cargados exitosamente`);
        } catch (error) {
          console.error("Error procesando archivo:", error);
          toast.error("Error al procesar el archivo. Verifique el formato.");
        } finally {
          setIsLoading(false);
        }
      };

      reader.onerror = () => {
        toast.error("Error al leer el archivo");
        setIsLoading(false);
      };

      reader.readAsArrayBuffer(file);
    },
    [onFileLoaded, context],
  );

  // Handlers para drag & drop
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile],
  );

  // Handler para click en input
  const handleFileInputChange = useCallback(
    (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile],
  );

  // Remover archivo cargado
  const handleRemoveFile = useCallback(() => {
    setLoadedFile(null);
    setPreviewData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Click para abrir selector de archivos
  const handleClickUpload = useCallback(() => {
    if (!isReadOnly && !isLoading) {
      fileInputRef.current?.click();
    }
  }, [isReadOnly, isLoading]);

  return (
    <Card className="m-2 mt-4">
      {/* Información de columnas requeridas */}
      <div className="m-2 p-4">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <DocumentArrowUpIcon className="w-5 h-5 text-cyan-400" />
          Formato requerido
        </h4>
        <div className="flex flex-wrap gap-2">
          {columnsToValidate.map((col) => (
            <div
              key={col.key}
              className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-600/20 border border-cyan-500/30 rounded-full"
              title={col.description}
            >
              <span className="text-xs font-mono text-cyan-300 font-semibold">
                {col.label}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Formatos soportados: .xlsx, .xls, .csv
        </p>
      </div>

      {/* Área de carga o vista del archivo cargado */}
      {!loadedFile ? (
        <>
          {/* Input oculto */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isReadOnly || isLoading}
          />

          {/* Zona drag & drop */}
          <div
            onClick={handleClickUpload}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
                relative border-2 border-dashed rounded-lg p-8 m-2 text-center cursor-pointer
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
                <div className="text-xs text-gray-500">.xlsx, .xls, .csv</div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Información del archivo cargado */}
          <div className="mb-4 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <CheckCircleIcon className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {loadedFile.name}
                  </p>
                  <p className="text-sm text-emerald-300 mt-1">
                    {loadedFile.itemCount} items procesados correctamente
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

          {/* Vista previa de datos */}
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
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-800">
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
              {loadedFile.itemCount > 5 && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  ... y {loadedFile.itemCount - 5} filas más
                </p>
              )}
            </div>
          )}
        </>
      )}
      {isReadOnly && (
        <CardFooter>
          <div className="text-sm text-yellow-400 flex items-center gap-2">
            <XCircleIcon className="w-5 h-5" />
            <span>
              No se puede cargar archivos cuando el documento está completado
            </span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
