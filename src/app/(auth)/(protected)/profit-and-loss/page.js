import React from "react";
import RoleGuard from "@/components/auth/RoleGuard";

function ProfitAndLossPageInner() {
  return <div>ProfitAndLossPage</div>;
}


export default function ProfitAndLossPage(params) {
  return (
    <RoleGuard forbiddenRoles={["seller"]} fallbackRoute="/">
      <ProfitAndLossPageInner {...params} />
    </RoleGuard>
  );
}
