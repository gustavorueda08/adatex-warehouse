import React from "react";
import RoleGuard from "@/components/auth/RoleGuard";

function SettingsPageInner() {
  return <div>SettingsPage</div>;
}


export default function SettingsPage(params) {
  return (
    <RoleGuard forbiddenRoles={["seller"]} fallbackRoute="/">
      <SettingsPageInner {...params} />
    </RoleGuard>
  );
}
