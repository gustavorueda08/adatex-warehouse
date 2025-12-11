"use client";

import { useState, useEffect, Fragment } from "react";
import { Popover, Transition } from "@headlessui/react";
import {
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
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

// Componente SortableItem
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
      className={`flex items-center justify-between p-2 rounded-lg transition-colors group ${
        isDragging ? "bg-zinc-700 shadow-xl opacity-90" : ""
      } ${isVisible && !isDragging ? "bg-zinc-800/50" : ""} ${
        !isVisible && !isDragging ? "bg-transparent opacity-60" : ""
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-move p-1 text-gray-600 hover:text-gray-300 touch-none"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
          </svg>
        </div>

        <button
          onClick={() => onToggle(column.key)}
          className={`p-1 rounded hover:bg-zinc-700 ${
            isVisible ? "text-emerald-400" : "text-gray-500"
          }`}
          title={isVisible ? "Ocultar" : "Mostrar"}
        >
          {isVisible ? (
            <EyeIcon className="w-4 h-4" />
          ) : (
            <EyeSlashIcon className="w-4 h-4" />
          )}
        </button>
        <span
          className={`text-sm select-none ${
            isVisible ? "text-gray-200" : "text-gray-500"
          }`}
        >
          {column.label}
        </span>
      </div>
    </div>
  );
}

export default function ColumnCustomizer({
  allColumns,
  visibleColumnKeys,
  onChange,
}) {
  const [internalItems, setInternalItems] = useState([]);

  // Inicializar items
  useEffect(() => {
    // Si tenemos items internos ya modificados, NO sobreescribir con props cada vez,
    // a menos que cambie allColumns drásticamente.
    // Pero necesitamos sincronizar si visibleColumnKeys cambia externamente?
    // Asumiremos que internalItems es la fuente de verdad para el ORDEN visual
    // y visibleColumnKeys para la visibilidad.

    if (internalItems.length === 0 && allColumns.length > 0) {
      // Primera carga: ordenar según visibleColumnKeys + resto
      const visibleCols = visibleColumnKeys
        .map((key) => allColumns.find((col) => col.key === key))
        .filter(Boolean);

      const hiddenCols = allColumns.filter(
        (col) => !visibleColumnKeys.includes(col.key)
      );
      setInternalItems([...visibleCols, ...hiddenCols]);
    } else if (allColumns.length !== internalItems.length) {
       // Resincronización simple si cambia el número de columnas
       setInternalItems(allColumns);
    }
  }, [allColumns, visibleColumnKeys]); // Simplificado para evitar reseteos on change

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 5, // Evita clicks accidentales
        }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = internalItems.findIndex((i) => i.key === active.id);
      const newIndex = internalItems.findIndex((i) => i.key === over.id);
      
      const newOrder = arrayMove(internalItems, oldIndex, newIndex);
      setInternalItems(newOrder);

      // Notificar cambio de orden de las columnas VISIBLES
      // Mantener el orden relativo de las visibles
      const newVisibleKeys = newOrder
         .filter(col => visibleColumnKeys.includes(col.key))
         .map(col => col.key);
      
      onChange(newVisibleKeys);
    }
  };

  const toggleColumn = (columnKey) => {
      let newKeys;
      if (visibleColumnKeys.includes(columnKey)) {
          newKeys = visibleColumnKeys.filter(k => k !== columnKey);
      } else {
          // Al mostrar, ¿donde la ponemos?
          // La añadimos al final de las visibles para mantener consistencia con el array filtrado
          // O mejor, reconstruimos las visibles basandonos en el orden visual actual (internalItems)
          
          // Encontrar índice visual
          const visualOrderKeys = internalItems.map(i => i.key);
          
          // Crear nuevo set de visibles
          const nextVisibleSet = new Set([...visibleColumnKeys, columnKey]);
          
          // Reordenar newKeys basado en visualOrderKeys
          newKeys = visualOrderKeys.filter(k => nextVisibleSet.has(k));
      }
      onChange(newKeys);
  };

  const handleReset = () => {
      // Restaurar orden original de allColumns y hacer todas visibles
      const originalOrderKeys = allColumns.map(c => c.key);
      setInternalItems(allColumns);
      onChange(originalOrderKeys);
  };

  return (
    <Popover className="relative">
      <Popover.Button as={Fragment}>
        <Button variant="zinc" className="flex items-center gap-2">
          <Cog6ToothIcon className="w-5 h-5" />
          <span className="hidden md:inline">Columnas</span>
        </Button>
      </Popover.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Popover.Panel className="absolute right-0 z-10 mt-2 w-72 origin-top-right rounded-md bg-zinc-900 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none border border-zinc-700">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">
                Personalizar Columnas
              </h3>
               <button 
                onClick={handleReset}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                title="Restaurar valores por defecto"
               >
                   <ArrowPathIcon className="w-3 h-3"/> Reset
               </button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={internalItems.map((i) => i.key)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {internalItems.map((column) => (
                    <SortableItem
                      key={column.key}
                      id={column.key}
                      column={column}
                      isVisible={visibleColumnKeys.includes(column.key)}
                      onToggle={toggleColumn}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            
             <div className="pt-2 border-t border-zinc-800">
              <span className="text-xs text-gray-500">
                Arrastra para reordenar
              </span>
            </div>
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}
