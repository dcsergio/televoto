type NodeResponseLike = {
  status: (code: number) => NodeResponseLike;
  json: (body: unknown) => void;
};

export default async function handler(req: unknown, res: unknown) {
  const nodeReq = req as { url?: string };
  const nodeRes = res as NodeResponseLike;
  const url = nodeReq.url;

  if (url && !url.startsWith("/api/")) {
    const normalizedUrl = url.startsWith("/") ? url : `/${url}`;
    nodeReq.url = `/api${normalizedUrl}`;
  }

  try {
    const { default: app } = await import("../server/index.ts");
    return app(req as never, res as never);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server bootstrap failed";
    nodeRes.status(500).json({ error: message });
  }
}
