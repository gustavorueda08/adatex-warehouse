import { proxyGet } from "@/lib/api/strapiProxy";

export const GET = (req) => proxyGet(req, "/api/warehouses");
