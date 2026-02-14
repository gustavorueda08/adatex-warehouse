import { Textarea } from "@heroui/react";
import React from "react";

export default function Comments({ comments, setDocument, disabled }) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <Textarea
        placeholder="Comentarios"
        value={comments}
        isDisabled={disabled}
        onChange={(e) =>
          setDocument((prev) => ({ ...prev, notes: e.target.value }))
        }
      />
    </div>
  );
}
