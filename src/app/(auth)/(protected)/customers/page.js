"use client";

import EntityListPage from "@/components/entities/EntityListPage";
import { customersListConfig } from "@/lib/config/entityConfigs";
import { useCustomers } from "@/lib/hooks/useCustomers";

export default function CustomersPage() {
  return <EntityListPage useHook={useCustomers} config={customersListConfig} />;
}
