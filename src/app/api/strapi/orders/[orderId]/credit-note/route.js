import { proxyPost } from "@/lib/api/strapiProxy";

export async function POST(request, { params }) {
  const { orderId } = await params;
  return proxyPost(request, `/api/orders/${orderId}/credit-note`, {
    requireDataWrapper: false,
    successStatus: 200,
  });
}
