import { proxyGet, proxyPost } from "@/lib/api/strapiProxy";

export const GET = (req) => proxyGet(req, "/api/siigo/cost-centers");

export async function POST(request) {
  return proxyPost(request, "/api/siigo/cost-centers", {
    requireDataWrapper: false,
    successStatus: 200,
  });
}
