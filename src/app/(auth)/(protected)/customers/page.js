"use client";

import EntityListPage from "@/components/entities/EntityListPage";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { customersListConfig } from "@/lib/config/customersConfig";

export default function CustomersPage() {
  return <EntityListPage useHook={useCustomers} config={customersListConfig} />;
}
