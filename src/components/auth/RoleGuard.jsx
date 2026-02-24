"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks/useUser";
import { Spinner } from "@heroui/react";

export default function RoleGuard({
  children,
  forbiddenRoles = [],
  fallbackRoute = "/",
}) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && forbiddenRoles.includes(user.type)) {
      router.replace(fallbackRoute);
    }
  }, [user, loading, forbiddenRoles, fallbackRoute, router]);

  // While loading the user, or if the user is forbidden, do not render the page content
  if (loading || (user && forbiddenRoles.includes(user.type))) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return children;
}
