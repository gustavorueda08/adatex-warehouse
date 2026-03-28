import { proxyGet } from "@/lib/api/strapiProxy";

export async function GET(request, { params }) {
  const { customerId } = await params;
  return proxyGet(request, `/api/customers/${customerId}/invoiceable-items`);
}
