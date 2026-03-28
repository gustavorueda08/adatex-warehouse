import { proxyGet, proxyPost } from "@/lib/api/strapiProxy";

export const GET  = (req) => proxyGet(req,  "/api/items");
export const POST = (req) => proxyPost(req, "/api/items");
