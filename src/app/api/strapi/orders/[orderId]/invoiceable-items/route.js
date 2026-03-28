import { proxyGet } from "@/lib/api/strapiProxy";

export async function GET(request, { params }) {
  const { orderId } = await params;
  return proxyGet(request, `/api/orders/${orderId}/invoiceable-items`);
}
