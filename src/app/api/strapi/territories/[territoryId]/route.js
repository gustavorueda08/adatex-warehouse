import { proxyPut, proxyDelete } from "@/lib/api/strapiProxy";

export async function PUT(request, { params }) {
  const { territoryId } = await params;
  return proxyPut(request, `/api/territories/${territoryId}`);
}

export async function DELETE(request, { params }) {
  const { territoryId } = await params;
  return proxyDelete(request, `/api/territories/${territoryId}`, territoryId);
}
