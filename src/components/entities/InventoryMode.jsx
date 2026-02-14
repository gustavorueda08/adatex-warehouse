import { Card, CardBody, CardHeader } from "@heroui/card";
import { DatePicker, DateRangePicker } from "@heroui/react";
import { Tabs, Tab } from "@heroui/tabs";
import { getLocalTimeZone, today, CalendarDate } from "@internationalized/date";
import { I18nProvider } from "@react-aria/i18n";
import React, { useMemo } from "react";

export default function InventoryMode({
  inventoryMode,
  onSelectionChange,
  dateRange,
  setDateRange,
  selectedDate,
  setSelectedDate,
}) {
  const minDate = useMemo(() => {
    const now = today(getLocalTimeZone());
    return new CalendarDate(now.year, now.month, 1);
  }, []);

  return (
    <Card className="">
      <CardHeader className="pb-0 pt-2">
        <h2 className="text-xl font-bold">Modo de Inventario</h2>
      </CardHeader>
      <CardBody>
        <Tabs
          aria-label="Options"
          selectedKey={inventoryMode}
          onSelectionChange={onSelectionChange}
        >
          <Tab key="standard" title="Estandar"></Tab>
          <Tab key="historical" title="Historico">
            <I18nProvider locale="es-CL">
              <DatePicker
                label="Fecha de Corte"
                value={selectedDate}
                onChange={setSelectedDate}
                className="max-w-xs"
                showMonthAndYearPickers
                maxValue={today(getLocalTimeZone())}
              />
            </I18nProvider>
          </Tab>
          <Tab key="projection" title="Proyección">
            <I18nProvider locale="es-CL">
              <DateRangePicker
                label="Rango de Proyección"
                value={dateRange}
                onChange={setDateRange}
                className="max-w-xs"
                showMonthAndYearPickers
                minValue={minDate}
              />
            </I18nProvider>
          </Tab>
        </Tabs>
      </CardBody>
    </Card>
  );
}
