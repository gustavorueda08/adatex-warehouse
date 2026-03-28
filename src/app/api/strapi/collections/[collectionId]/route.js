import { proxyPut, proxyDelete } from "@/lib/api/strapiProxy";

export async function PUT(request, { params }) {
  const { collectionId } = await params;
  return proxyPut(request, `/api/collections/${collectionId}`);
}

export async function DELETE(request, { params }) {
  const { collectionId } = await params;
  return proxyDelete(request, `/api/collections/${collectionId}`, collectionId);
}
