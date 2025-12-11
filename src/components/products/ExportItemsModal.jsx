"use client";

import { useState, Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Button from "@/components/ui/Button";
import { AVAILABLE_ITEM_COLUMNS } from "@/lib/utils/exportItemsToExcel";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

function SortableItem({ id, column, isVisible, onToggle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: "relative",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 rounded-lg transition-colors border border-zinc-700/50 mb-2 ${
        isDragging ? "bg-zinc-700 shadow-xl opacity-90" : "bg-zinc-800"
      } ${!isVisible ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3 flex-1">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-move p-1 text-zinc-500 hover:text-zinc-300 touch-none"
        >
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
           </svg>
        </div>

        <button
          onClick={() => onToggle(column.key)}
          className={`p-1 rounded hover:bg-zinc-700 ${
            isVisible ? "text-emerald-400" : "text-zinc-500"
          }`}
          title={isVisible ? "Ocultar" : "Mostrar"}
        >
          {isVisible ? (
            <EyeIcon className="w-5 h-5" />
          ) : (
            <EyeSlashIcon className="w-5 h-5" />
          )}
        </button>
        <span
          className={`font-medium select-none ${
            isVisible ? "text-zinc-200" : "text-zinc-500"
          }`}
        >
          {column.label}
        </span>
      </div>
    </div>
  );
}

export default function ExportItemsModal({ isOpen, onClose, onExport }) {
  // Manage ordered list of columns internally
  // We start with all available columns
  const [items, setItems] = useState(AVAILABLE_ITEM_COLUMNS);
  const [visibleKeys, setVisibleKeys] = useState(
    AVAILABLE_ITEM_COLUMNS.map((c) => c.key)
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.key === active.id);
      const newIndex = items.findIndex((i) => i.key === over.id);
      setItems(arrayMove(items, oldIndex, newIndex));
    }
  };

  const toggleColumn = (key) => {
    if (visibleKeys.includes(key)) {
      setVisibleKeys(visibleKeys.filter((k) => k !== key));
    } else {
      setVisibleKeys([...visibleKeys, key]);
    }
  };

  const handleExport = () => {
    // Construct the final columns array based on:
    // 1. Order in 'items'
    // 2. Inclusion in 'visibleKeys'
    const finalColumns = items.filter((col) => visibleKeys.includes(col.key));
    onExport(finalColumns);
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[9999]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-white mb-4"
                >
                  Personalizar Exportación
                </Dialog.Title>
                <div className="mt-2 text-sm text-zinc-400 mb-4">
                  Selecciona y ordena las columnas que deseas incluir en el reporte Excel.
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={items.map((i) => i.key)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                      {items.map((col) => (
                        <SortableItem
                          key={col.key}
                          id={col.key}
                          column={col}
                          isVisible={visibleKeys.includes(col.key)}
                          onToggle={toggleColumn}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                <div className="mt-6 flex justify-end gap-3 border-t border-zinc-800 pt-4">
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button variant="emerald" onClick={handleExport} disabled={visibleKeys.length === 0}>
                    Exportar Excel
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
