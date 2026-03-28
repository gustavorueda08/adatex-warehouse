import { proxyPut, proxyDelete } from "@/lib/api/strapiProxy";

export async function PUT(request, { params }) {
  const { supplierId } = await params;
  return proxyPut(request, `/api/suppliers/${supplierId}`);
}

export async function DELETE(request, { params }) {
  const { supplierId } = await params;
  return proxyDelete(request, `/api/suppliers/${supplierId}`, supplierId);
}
