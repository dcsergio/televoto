import app from "../server/index.ts";

export default function handler(req: unknown, res: unknown) {
  const nodeReq = req as { url?: string };
  const url = nodeReq.url;

  if (url && !url.startsWith("/api/")) {
    const normalizedUrl = url.startsWith("/") ? url : `/${url}`;
    nodeReq.url = `/api${normalizedUrl}`;
  }

  return app(req as never, res as never);
}
