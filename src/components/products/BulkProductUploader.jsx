import React, { useCallback, useRef, useState } from "react";
import {
  Chip,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Tooltip,
} from "@heroui/react";
import {
  CheckCircleIcon,
  DocumentArrowUpIcon,
  TrashIcon,
  XCircleIcon,
  CloudArrowUpIcon,
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
  {
    label: "UNIDADES_POR_PAQUETE",
    description: "Paquetes o unidades por caja",
  },
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
  onSync = () => {},
  isReadOnly = false,
  isSyncing = false,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedFile, setLoadedFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [fileData, setFileData] = useState([]); // Store full data for sync
  const fileInputRef = useRef(null);

  const normalizeColumn = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const validateColumns = useCallback((rows) => {
    if (!rows || rows.length === 0) {
      return { valid: false, message: "El archivo está vacío" };
    }

    const headers = Object.keys(rows[0]).map(normalizeColumn);
    const missing = REQUIRED_COLUMNS.filter(
      (column) => !column.variants.some((variant) => headers.includes(variant)),
    );

    if (missing.length > 0) {
      return {
        valid: false,
        message: `Falta la columna requerida "${missing[0].label}"`,
      };
    }

    return { valid: true };
  }, []);

  const handleRemoveFile = useCallback(() => {
    setLoadedFile(null);
    setPreviewData([]);
    setFileData([]);
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
        file.name?.toLowerCase().endsWith(ext),
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
          setFileData(jsonData);

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
    [handleRemoveFile, onFileLoaded, validateColumns],
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
    [processFile],
  );

  const handleFileInputChange = useCallback(
    (event) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile],
  );

  const handleClickUpload = useCallback(() => {
    if (!isReadOnly && !isLoading && !isSyncing) {
      fileInputRef.current?.click();
    }
  }, [isReadOnly, isLoading, isSyncing]);

  const handleSync = () => {
    if (fileData.length > 0 && onSync) {
      onSync(fileData);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col items-start px-6 pt-6 pb-0">
        <h4 className="text-xl font-bold">Carga masiva de productos</h4>
        <p className="text-small text-default-500">
          Sube un Excel/CSV con el catálogo completo o parcial para revisarlo y
          prepararlo antes de enviarlo.
        </p>
      </CardHeader>

      <CardBody className="px-6 py-4">
        <div className="mb-4 p-4 bg-default-100 dark:bg-default-50/10 rounded-lg border border-default-200 dark:border-default-100">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <DocumentArrowUpIcon className="w-5 h-5 text-primary" />
            Columnas esperadas
          </h4>
          <div className="flex flex-wrap gap-2">
            {REQUIRED_COLUMNS.map((col) => (
              <Tooltip key={col.label} content={col.description}>
                <Chip
                  size="sm"
                  color="success"
                  variant="flat"
                  className="cursor-help"
                >
                  <span className="font-mono font-semibold">{col.label}</span>
                </Chip>
              </Tooltip>
            ))}
            {OPTIONAL_COLUMNS.map((col) => (
              <Tooltip key={col.label} content={col.description}>
                <Chip size="sm" variant="flat" className="cursor-help">
                  <span className="font-mono text-default-600 dark:text-default-400">
                    {col.label}
                  </span>
                </Chip>
              </Tooltip>
            ))}
          </div>
          <p className="text-xs text-default-400 mt-2">
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
              disabled={isReadOnly || isLoading || isSyncing}
            />

            <div
              onClick={handleClickUpload}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                transition-all duration-200 flex flex-col items-center justify-center gap-4
                ${
                  isDragging
                    ? "border-primary bg-primary-50 dark:bg-primary-900/20"
                    : "border-default-300 hover:border-default-400 hover:bg-default-100 dark:hover:bg-default-50/5"
                }
                ${isReadOnly || isLoading || isSyncing ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                  <p className="font-medium">Procesando archivo...</p>
                  <p className="text-sm text-default-400">
                    Esto puede tomar unos segundos
                  </p>
                </div>
              ) : (
                <>
                  <DocumentArrowUpIcon
                    className={`w-16 h-16 ${
                      isDragging ? "text-primary" : "text-default-400"
                    }`}
                  />
                  <div>
                    <p className="font-medium text-lg">
                      {isDragging
                        ? "Suelta el archivo aquí"
                        : "Arrastra tu archivo aquí"}
                    </p>
                    <p className="text-sm text-default-400 mt-1">
                      o haz clic para seleccionar
                    </p>
                  </div>
                  <div className="text-xs text-default-500">
                    .xlsx, .xls, .csv
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-8 h-8 text-success-500" />
                <div>
                  <p className="font-medium text-success-700 dark:text-success-300">
                    {loadedFile.name}
                  </p>
                  <p className="text-xs text-success-600 dark:text-success-400">
                    {loadedFile.itemCount} productos •{" "}
                    {(loadedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  color="primary"
                  onClick={handleSync}
                  isLoading={isSyncing}
                  startContent={
                    !isSyncing && <CloudArrowUpIcon className="w-4 h-4" />
                  }
                >
                  {isSyncing ? "Sincronizando..." : "Sincronizar"}
                </Button>
                <Button
                  isIconOnly
                  color="danger"
                  variant="flat"
                  onClick={handleRemoveFile}
                  isDisabled={isSyncing}
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {previewData.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">
                  Vista previa (primeras {previewData.length} filas):
                </h4>
                <div className="border border-default-200 dark:border-default-100 rounded-lg overflow-hidden">
                  <Table aria-label="Vista previa de productos" removeWrapper>
                    <TableHeader>
                      {Object.keys(previewData[0]).map((key) => (
                        <TableColumn key={key}>{key}</TableColumn>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {Object.values(row).map((value, colIdx) => (
                            <TableCell key={colIdx}>{value || "-"}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {loadedFile.itemCount > previewData.length && (
                  <p className="text-xs text-default-400 mt-2 text-center">
                    ... y {loadedFile.itemCount - previewData.length} filas más
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardBody>

      {isReadOnly && (
        <CardFooter className="px-6 pb-6 pt-0">
          <div className="text-sm text-warning flex items-center gap-2">
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
