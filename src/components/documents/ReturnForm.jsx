"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment-timezone";
import { useUser } from "@/lib/hooks/useUser";
import { useRouter } from "next/navigation";
import Card, {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ReturnItemSelector from "@/components/documents/ReturnItemSelector";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import Input from "@/components/ui/Input";
import {
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

export default function ReturnForm({ config, onFormStateChange }) {
  const router = useRouter();
  const { user } = useUser();

  const [formState, setFormState] = useState(() => ({
    dateCreated: moment().tz("America/Bogota").toDate(),
    selectedItems: [],
    ...config.initialState,
  }));

  useEffect(() => {
    if (onFormStateChange) {
      onFormStateChange(formState);
    }
  }, [formState, onFormStateChange]);

  const updateField = useCallback((field, value) => {
    setFormState((current) => ({ ...current, [field]: value }));
  }, []);

  const handleItemToggle = useCallback((item, checked) => {
    setFormState((current) => {
      const exists = current.selectedItems?.some(
        (selected) => selected.itemId === item.id,
      );

      if (checked) {
        if (exists) return current;

        const originalQuantity =
          item.quantity || item.currentQuantity || item.originalQuantity || 0;

        const newSelectedItem = {
          itemId: item.id,
          productId: item.productId || item.product?.id,
          productName: item.productName || item.product?.name,
          originalQuantity,
          returnQuantity: originalQuantity,
          lotNumber: item.lotNumber || item.lot,
          itemNumber: item.itemNumber || item.barcode,
          warehouse: item.warehouse || null,
        };

        return {
          ...current,
          selectedItems: [...(current.selectedItems || []), newSelectedItem],
        };
      }

      if (!exists) return current;

      return {
        ...current,
        selectedItems: current.selectedItems.filter(
          (selected) => selected.itemId !== item.id,
        ),
      };
    });
  }, []);

  const handleQuantityChange = useCallback((itemId, newQuantity) => {
    setFormState((current) => ({
      ...current,
      selectedItems: current.selectedItems.map((item) =>
        item.itemId === itemId
          ? {
              ...item,
              returnQuantity: Number(newQuantity) || 0,
            }
          : item,
      ),
    }));
  }, []);

  const isFormValid = useMemo(() => {
    if (typeof config.validateForm === "function") {
      return config.validateForm(formState);
    }

    const hasOrder = Boolean(formState.selectedOrder);
    const hasDestination = Boolean(formState.selectedWarehouse);
    const hasItems = (formState.selectedItems || []).length > 0;
    const allItemsValid = (formState.selectedItems || []).every(
      (item) => Number(item.returnQuantity) > 0,
    );

    return hasOrder && hasDestination && hasItems && allItemsValid;
  }, [config, formState]);

  const selectedItemsStats = useMemo(() => {
    const items = formState.selectedItems || [];
    const totalUnits =
      Math.round(
        items.reduce((acc, item) => acc + Number(item.returnQuantity || 0), 0) *
          100,
      ) / 100;

    return {
      count: items.length,
      totalUnits,
    };
  }, [formState.selectedItems]);

  const handleSubmit = useCallback(async () => {
    if (!config.prepareSubmitData || !config.onSubmit) return;

    const data = config.prepareSubmitData(formState, user);
    await config.onSubmit(data);
  }, [config, formState, user]);

  const orderProducts = formState.selectedOrder?.orderProducts || [];

  return (
    <div className="space-y-6 pb-8">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">{config.title}</h1>
              <p className="text-gray-400 text-sm mt-1">
                Selecciona la orden y los items que quieres devolver
              </p>
            </div>
            <Badge variant="yellow">Devolución</Badge>
          </div>

          <div className="space-y-4">
            {config.headerFields?.map((fieldGroup, groupIndex) => (
              <div
                key={groupIndex}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {fieldGroup.map((field) => (
                  <div key={field.key} className={field.className || ""}>
                    <h2 className="font-medium mb-2">{field.label}</h2>
                    {renderField(field, formState, updateField)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <ArrowUturnLeftIcon className="w-6 h-6 text-yellow-400" />
              <div>
                <CardTitle>Items a devolver</CardTitle>
                <CardDescription>
                  Marca los productos y ajusta las cantidades a devolver
                </CardDescription>
              </div>
            </div>

            <Badge variant={selectedItemsStats.count > 0 ? "emerald" : "zinc"}>
              {selectedItemsStats.count} item
              {selectedItemsStats.count === 1 ? "" : "s"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ReturnItemSelector
            orderProducts={orderProducts}
            selectedItems={formState.selectedItems}
            onItemToggle={handleItemToggle}
            onQuantityChange={handleQuantityChange}
            disabled={config.loading}
          />
        </CardContent>
      </Card>

      {selectedItemsStats.count > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
            <CardDescription>
              Confirma los items seleccionados para la devolución
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-700 rounded-md p-4">
                <p className="text-sm text-zinc-400">Items seleccionados</p>
                <p className="text-2xl font-semibold">
                  {selectedItemsStats.count}
                </p>
              </div>
              <div className="bg-zinc-700 rounded-md p-4">
                <p className="text-sm text-zinc-400">Unidades a devolver</p>
                <p className="text-2xl font-semibold">
                  {selectedItemsStats.totalUnits.toLocaleString()}
                </p>
              </div>
              <div className="bg-zinc-700 rounded-md p-4">
                <p className="text-sm text-zinc-400">Motivo</p>
                <p className="text-lg font-semibold">
                  {formState.returnReason ? "Seleccionado" : "Pendiente"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ArrowUturnLeftIcon className="w-6 h-6 text-yellow-400" />
            <div>
              <CardTitle>Crear devolución</CardTitle>
              <CardDescription>
                Revisa los datos antes de confirmar la devolución
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-6">
            <ValidationItem
              label="Orden de venta seleccionada"
              valid={Boolean(formState.selectedOrder)}
            />
            <ValidationItem
              label="Bodega destino seleccionada"
              valid={Boolean(formState.selectedWarehouse)}
            />
            <ValidationItem
              label="Items seleccionados"
              valid={formState.selectedItems?.length > 0}
            />
            <ValidationItem
              label="Cantidades válidas"
              valid={(formState.selectedItems || []).every(
                (item) => Number(item.returnQuantity) > 0,
              )}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col md:flex-row gap-3">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex-1 md:flex-initial"
          >
            Cancelar
          </Button>
          <Button
            variant="emerald"
            onClick={handleSubmit}
            disabled={!isFormValid}
            loading={config.loading}
            className="flex-1 md:flex-initial"
          >
            {config.loading ? "Creando..." : "Crear devolución"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function renderField(field, formState, updateField) {
  const value = formState[field.key];

  switch (field.type) {
    case "select": {
      const options =
        typeof field.options === "function"
          ? field.options(formState)
          : field.options || [];

      return (
        <Select
          value={value}
          options={options}
          searchable={field.searchable}
          onChange={(nextValue) => {
            updateField(field.key, nextValue);
            field.onChange?.(nextValue, formState, updateField);
          }}
          size={field.size || "md"}
          placeholder={field.placeholder}
        />
      );
    }
    case "date":
      return (
        <DatePicker
          mode="single"
          value={value}
          onChange={(date) => updateField(field.key, date)}
        />
      );
    case "input":
      return (
        <Input
          input={value}
          setInput={(next) => updateField(field.key, next)}
          placeholder={field.placeholder}
        />
      );
    case "custom":
      return field.render?.({ value, formState, updateField }) || null;
    default:
      return null;
  }
}

function ValidationItem({ label, valid }) {
  return (
    <div className="flex items-center gap-3">
      {valid ? (
        <CheckCircleIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
      ) : (
        <XCircleIcon className="w-5 h-5 text-gray-600 flex-shrink-0" />
      )}
      <span className={`text-sm ${valid ? "text-white" : "text-gray-500"}`}>
        {label}
      </span>
    </div>
  );
}
