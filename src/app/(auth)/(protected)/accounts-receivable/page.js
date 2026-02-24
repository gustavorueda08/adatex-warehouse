import React from "react";
import RoleGuard from "@/components/auth/RoleGuard";

function AccountsReceivablePageInner() {
  return <div>AccountsReceivablePage</div>;
}


export default function AccountsReceivablePage(params) {
  return (
    <RoleGuard forbiddenRoles={["seller"]} fallbackRoute="/">
      <AccountsReceivablePageInner {...params} />
    </RoleGuard>
  );
}
