import { proxyPut, proxyDelete } from "@/lib/api/strapiProxy";

export async function PUT(request, { params }) {
  const { sellerId } = await params;
  return proxyPut(request, `/api/sellers/${sellerId}`);
}

export async function DELETE(request, { params }) {
  const { sellerId } = await params;
  return proxyDelete(request, `/api/sellers/${sellerId}`, sellerId);
}
