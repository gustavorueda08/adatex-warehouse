"use client";

import Card, {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatCardSkeleton,
  ListCardSkeleton,
  TopProductsSkeleton,
} from "@/components/ui/Card";
import { ArrowUpIcon, TransferIcon, ChartIcon } from "@/components/ui/icons";
import { useDashboard } from "@/lib/hooks/useDashboard";
import MonthlyActivity from "@/components/dashboard/MonthlyActivity";

export default function Dashboard() {
  const { dashboard, loading } = useDashboard({}, { enabled: true });
  console.log(dashboard, "dashboard data");

  // dashboard es un array según el formato de useStrapi
  // Si el array está vacío o no hay datos, usar valores por defecto
  const dashboardData =
    Array.isArray(dashboard) && dashboard.length > 0
      ? dashboard[0]
      : dashboard || {};
  const stats = dashboardData.stats || {};
  const recentSales = dashboardData.recentSales || [];
  const topProducts = dashboardData.topProducts || [];
  const monthlyActivity = false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Bienvenido a tu panel de control</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Sales */}
        <Card>
          {loading ? (
            <StatCardSkeleton />
          ) : (
            <>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Ventas Totales
                </CardTitle>
                <div className="h-4 w-4 text-gray-400">
                  <ChartIcon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {stats?.totalSales?.value}
                </div>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <span
                    className={
                      stats?.totalSales?.trend === "up"
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  >
                    {stats?.totalSales?.change}
                  </span>
                  respecto al mes anterior
                </p>
              </CardContent>
            </>
          )}
        </Card>

        {/* Inventory */}
        <Card>
          {loading ? (
            <StatCardSkeleton />
          ) : (
            <>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Inventario
                </CardTitle>
                <div className="h-4 w-4 text-gray-400">
                  <TransferIcon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {stats?.inventory?.value}
                </div>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <span
                    className={
                      stats?.inventory?.trend === "up"
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  >
                    {stats?.inventory?.change}
                  </span>
                  productos activos
                </p>
              </CardContent>
            </>
          )}
        </Card>

        {/* Pending Orders */}
        <Card>
          {loading ? (
            <StatCardSkeleton />
          ) : (
            <>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Órdenes Pendientes
                </CardTitle>
                <div className="h-4 w-4 text-gray-400">
                  <ArrowUpIcon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {stats?.pendingOrders?.value}
                </div>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <span
                    className={
                      stats?.pendingOrders?.trend === "up"
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  >
                    {stats?.pendingOrders?.change}
                  </span>
                  por procesar
                </p>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Sales */}
        <Card className="lg:col-span-4">
          {loading ? (
            <ListCardSkeleton items={5} />
          ) : (
            <>
              <CardHeader>
                <CardTitle>Ventas Recientes</CardTitle>
                <CardDescription>
                  Has realizado {recentSales.length} ventas este período
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                          {sale.customer.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {sale.customer}
                          </p>
                          <p className="text-xs text-gray-400">{sale.date}</p>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-white">
                        {sale.amount}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </>
          )}
        </Card>

        {/* Top Products */}
        <Card className="lg:col-span-3">
          {loading ? (
            <TopProductsSkeleton items={4} />
          ) : (
            <>
              <CardHeader>
                <CardTitle>Productos Top</CardTitle>
                <CardDescription>
                  Productos más vendidos del mes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">{product.name}</span>
                        <span className="text-white font-medium">
                          {product.revenue}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                            style={{
                              width: `${
                                (product.sales / topProducts[0].sales) * 100
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-12 text-right">
                          {product.sales}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Activity Chart */}
      <Card loading={loading}>
        {!loading && (
          <>
            <CardHeader>
              <CardTitle>Actividad del Mes</CardTitle>
              <CardDescription>
                Resumen de ventas, compras y movimientos de inventario
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyActivity ? (
                <MonthlyActivity />
              ) : (
                <p>Graficos proximamente</p>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
