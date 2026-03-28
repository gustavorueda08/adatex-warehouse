import { proxyPut, proxyDelete } from "@/lib/api/strapiProxy";

export async function PUT(request, { params }) {
  const { productId } = await params;
  return proxyPut(request, `/api/products/${productId}`);
}

export async function DELETE(request, { params }) {
  const { productId } = await params;
  return proxyDelete(request, `/api/products/${productId}`);
}
