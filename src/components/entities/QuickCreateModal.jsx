"use client";

import { Dialog, DialogPanel, DialogBackdrop } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import EntityForm from "./EntityForm";

export default function QuickCreateModal({
  isOpen,
  onClose,
  config,
  initialData = null,
  title,
}) {
  // Intercept onSubmit to handle success and close modal
  const handleSubmit = async (data) => {
    if (config.onSubmit) {
      const result = await config.onSubmit(data);
      // If result is returned (e.g. the created entity), pass it to onSuccess
      if (config.onSuccess) {
        config.onSuccess(result);
      }
      onClose();
      return result;
    }
  };

  // Create a modified config that uses our intercepted submit
  const modalConfig = {
    ...config,
    onSubmit: handleSubmit,
    // Ensure we don't show the full page title/description if we want a cleaner modal look
    // but EntityForm renders them. We can override if needed.
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[9999]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-900/75 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-zinc-900 px-4 pb-4 pt-5 text-left shadow-xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-4xl sm:p-6 sm:data-[closed]:translate-y-0 sm:data-[closed]:scale-95 border border-zinc-800"
          >
            <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
              <button
                type="button"
                className="rounded-md bg-zinc-900 text-gray-400 hover:text-gray-200 focus:outline-none"
                onClick={onClose}
              >
                <span className="sr-only">Cerrar</span>
                <XMarkIcon className="w-6 h-6" aria-hidden="true" />
              </button>
            </div>

            {/* Render EntityForm inside the modal */}
            <div className="mt-2">
              <EntityForm
                config={modalConfig}
                initialData={initialData}
                backPath="#" // Disable back button behavior
                isModal={true} // Optional prop to adjust styles if needed
              />
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
