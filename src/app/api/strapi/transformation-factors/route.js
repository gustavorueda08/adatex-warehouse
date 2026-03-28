import { proxyGet, proxyPost } from "@/lib/api/strapiProxy";

export const GET  = (req) => proxyGet(req,  "/api/transformation-factors");
export const POST = (req) => proxyPost(req, "/api/transformation-factors");
