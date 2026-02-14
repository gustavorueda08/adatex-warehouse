"use client";

import { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Skeleton,
} from "@heroui/react";
import { ArrowUpIcon, TransferIcon, ChartIcon } from "@/components/ui/Icons";
import { useDashboard } from "@/lib/hooks/useDashboard";
import ActivityChart from "@/components/dashboard/ActivityChart";
import { useUser } from "@/lib/hooks/useUser";

export default function Dashboard() {
  const { user } = useUser();
  const sellerId = useMemo(() => {
    if (user?.type === "seller" && user?.seller?.id) {
      return user.seller.id;
    }
    return null;
  }, [user]);

  const { dashboard, loading } = useDashboard(
    {
      ...(sellerId ? { sellerId } : {}),
    },
    { enabled: true },
  );

  const dashboardData =
    Array.isArray(dashboard) && dashboard.length > 0
      ? dashboard[0]
      : dashboard || {};
  const stats = dashboardData.stats || {};
  const recentSales = dashboardData.recentSales || [];
  const topProducts = dashboardData.topProducts || [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-default-900">Dashboard</h1>
        <p className="text-default-500 mt-1">
          Bienvenido a tu panel de control
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Sales */}
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <p className="text-sm font-medium text-default-500">
              Ventas Totales
            </p>
            <div className="h-4 w-4 text-default-500">
              <ChartIcon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardBody className="py-2 overflow-hidden">
            {loading ? (
              <Skeleton className="h-8 w-24 rounded-lg" />
            ) : (
              <div className="text-2xl font-bold text-default-900">
                {stats?.totalSales?.value || 0}
              </div>
            )}
          </CardBody>
          <CardFooter>
            {loading ? (
              <Skeleton className="h-4 w-32 rounded-lg" />
            ) : (
              <p className="text-xs text-default-400 flex items-center gap-1">
                <span
                  className={
                    stats?.totalSales?.trend === "up"
                      ? "text-success"
                      : "text-danger"
                  }
                >
                  {stats?.totalSales?.change}
                </span>
                respecto al mes anterior
              </p>
            )}
          </CardFooter>
        </Card>

        {/* Inventory */}
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <p className="text-sm font-medium text-default-500">Inventario</p>
            <div className="h-4 w-4 text-default-500">
              <TransferIcon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardBody className="py-2 overflow-hidden">
            {loading ? (
              <Skeleton className="h-8 w-24 rounded-lg" />
            ) : (
              <div className="text-2xl font-bold text-default-900">
                {stats?.inventory?.value || 0}
              </div>
            )}
          </CardBody>
          <CardFooter>
            {loading ? (
              <Skeleton className="h-4 w-32 rounded-lg" />
            ) : (
              <p className="text-xs text-default-400 flex items-center gap-1">
                <span
                  className={
                    stats?.inventory?.trend === "up"
                      ? "text-success"
                      : "text-danger"
                  }
                >
                  {stats?.inventory?.change}
                </span>
                productos activos
              </p>
            )}
          </CardFooter>
        </Card>

        {/* Pending Orders */}
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <p className="text-sm font-medium text-default-500">
              Órdenes Pendientes
            </p>
            <div className="h-4 w-4 text-default-500">
              <ArrowUpIcon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardBody className="py-2 overflow-hidden">
            {loading ? (
              <Skeleton className="h-8 w-24 rounded-lg" />
            ) : (
              <div className="text-2xl font-bold text-default-900">
                {stats?.pendingOrders?.value || 0}
              </div>
            )}
          </CardBody>
          <CardFooter>
            {loading ? (
              <Skeleton className="h-4 w-32 rounded-lg" />
            ) : (
              <p className="text-xs text-default-400 flex items-center gap-1">
                <span
                  className={
                    stats?.pendingOrders?.trend === "up"
                      ? "text-success"
                      : "text-danger"
                  }
                >
                  {stats?.pendingOrders?.change}
                </span>
                por procesar
              </p>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Sales */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-col items-start px-6 pt-6">
            <h4 className="text-large font-bold">Ventas Recientes</h4>
            <p className="text-small text-default-500">
              Has realizado {recentSales.length} ventas este período
            </p>
          </CardHeader>
          <CardBody className="px-6 py-4 overflow-hidden">
            <div className="space-y-4">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Skeleton className="rounded-full w-9 h-9" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24 rounded-lg" />
                          <Skeleton className="h-3 w-16 rounded-lg" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-12 rounded-lg" />
                    </div>
                  ))
                : recentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                          {sale.customer.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-default-900">
                            {sale.customer}
                          </p>
                          <p className="text-xs text-default-400">
                            {sale.date}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-default-900">
                        {sale.amount}
                      </div>
                    </div>
                  ))}
            </div>
          </CardBody>
        </Card>

        {/* Top Products */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-col items-start px-6 pt-6">
            <h4 className="text-large font-bold">Productos Top</h4>
            <p className="text-small text-default-500">
              Productos más vendidos del mes
            </p>
          </CardHeader>
          <CardBody className="px-6 py-4 overflow-hidden">
            <div className="space-y-4">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-32 rounded-lg" />
                        <Skeleton className="h-4 w-12 rounded-lg" />
                      </div>
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                  ))
                : topProducts.map((product, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-default-700">{product.name}</span>
                        <span className="text-default-900 font-medium">
                          {product.revenue}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-default-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                            style={{
                              width: `${
                                (product.sales / (topProducts[0]?.sales || 1)) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-default-400 w-12 text-right">
                          {product.sales}
                        </span>
                      </div>
                    </div>
                  ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card className="w-full">
        <CardHeader className="flex flex-col items-start px-6 pt-6">
          <h4 className="text-large font-bold">Actividad de Ventas</h4>
          <p className="text-small text-default-500">
            Resumen de ventas por periodo
          </p>
        </CardHeader>
        <CardBody className="px-6 py-4 overflow-hidden">
          {loading ? (
            <Skeleton className="h-[300px] w-full rounded-lg" />
          ) : (
            <ActivityChart data={dashboardData.salesChart} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
