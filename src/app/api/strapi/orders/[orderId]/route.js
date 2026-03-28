import { proxyPut, proxyDelete } from "@/lib/api/strapiProxy";

export async function PUT(request, { params }) {
  const { orderId } = await params;
  return proxyPut(request, `/api/orders/${orderId}`);
}

export async function DELETE(request, { params }) {
  const { orderId } = await params;
  return proxyDelete(request, `/api/orders/${orderId}`, orderId);
}
