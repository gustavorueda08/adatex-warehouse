import React from "react";
import Checkbox from "@/components/ui/Checkbox";
import format from "@/lib/utils/format";

export default function PartialInvoiceExpandedItems({
  row,
  onUpdateItem,
  onToggleAll,
}) {
  const allSelected =
    row.items.length > 0 && row.items.every((i) => i.toInvoice);

  return (
    <div className="bg-neutral-800/50 rounded-lg p-3 -mx-2 border border-neutral-700/50">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-400 uppercase bg-neutral-800/80">
          <tr>
            <th className="px-3 py-2 w-8">
              <Checkbox
                checked={allSelected}
                variant="cyan"
                onCheck={(val) => onToggleAll(val)}
              />
            </th>
            <th className="px-3 py-2">Barcode</th>
            <th className="px-3 py-2">Orden</th>
            <th className="px-3 py-2">Disponible</th>
          </tr>
        </thead>
        <tbody>
          {row.items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-neutral-700/50 last:border-0 hover:bg-neutral-700/30"
            >
              <td className="px-3 py-2">
                <Checkbox
                  checked={item.toInvoice}
                  variant="cyan"
                  onCheck={(val) => onUpdateItem(item.id, "toInvoice", val)}
                />
              </td>
              <td className="px-3 py-2">
                <span className="text-gray-300">{item.barcode}</span>
              </td>
              <td className="px-3 py-2 text-gray-400 text-xs">
                {item.sourceOrder?.code}
              </td>
              <td className="px-3 py-2 text-gray-400">
                {format(item.currentQuantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
