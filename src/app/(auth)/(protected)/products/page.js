"use client";

import { useState } from "react";
import { useProducts } from "@/lib/hooks/useProducts";
import EntityListPage from "@/components/entities/EntityListPage";
import { useProductListConfig } from "@/lib/config/productConfigs";
import BulkProductUploader from "@/components/products/BulkProductUploader";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

import ExportItemsModal from "@/components/products/ExportItemsModal";
import { exportItemsToExcel } from "@/lib/utils/exportItemsToExcel";

export default function ProductsPage() {
  const [bulkProducts, setBulkProducts] = useState([]);
  const [resetBulkUpload, setResetBulkUpload] = useState(null);
  const [sendingBulk, setSendingBulk] = useState(false);
  
  // State for Export Modal
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFilters, setExportFilters] = useState(null);

  const handleBulkUploadLoaded = (data, removeCallback) => {
    setBulkProducts(data || []);
    setResetBulkUpload(() => removeCallback);
  };

  const handleBulkUploadCleared = () => {
    setBulkProducts([]);
    setResetBulkUpload(null);
  };

  const handleSendBulkList = async () => {
    if (!bulkProducts.length) {
      toast.error("Primero carga un archivo de productos");
      return;
    }

    setSendingBulk(true);
    try {
      console.log("Lista masiva de productos lista para envío:", bulkProducts);
      toast.success(
        "Lista preparada para enviar. Conecta aquí tu petición masiva."
      );
    } catch (error) {
      console.error("Error preparando el envío masivo:", error);
      toast.error("No se pudo preparar el envío masivo");
    } finally {
      setSendingBulk(false);
    }
  };

  // Callback passed to config to open modal
  const handleOpenExportModal = (filters) => {
      setExportFilters(filters);
      setExportModalOpen(true);
  };

  // Callback when user confirms export in modal
  const handleExportConfirm = async (columns) => {
      await exportItemsToExcel({
          filters: exportFilters,
          columns: columns,
          toast: toast,
      });
  };

  const config = useProductListConfig({
    bulkProps: {
      onFileLoaded: handleBulkUploadLoaded,
      onClear: handleBulkUploadCleared,
      bulkProducts,
      resetBulkUpload,
      handleSendBulkList,
      sendingBulk,
    },
    onExportItems: handleOpenExportModal, // Pass to config
  });

  return (
    <div className="space-y-6">
      <EntityListPage useHook={useProducts} config={config} />
      <ExportItemsModal 
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExportConfirm}
      />
    </div>
  );
}
