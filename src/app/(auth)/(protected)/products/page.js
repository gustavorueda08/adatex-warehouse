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

export default function ProductsPage() {
  const [bulkProducts, setBulkProducts] = useState([]);
  const [resetBulkUpload, setResetBulkUpload] = useState(null);
  const [sendingBulk, setSendingBulk] = useState(false);

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

  const config = useProductListConfig({
    bulkProps: {
      onFileLoaded: handleBulkUploadLoaded,
      onClear: handleBulkUploadCleared,
      bulkProducts,
      resetBulkUpload,
      handleSendBulkList,
      sendingBulk,
    },
  });

  return (
    <div className="space-y-6">
      <EntityListPage useHook={useProducts} config={config} />
    </div>
  );
}
