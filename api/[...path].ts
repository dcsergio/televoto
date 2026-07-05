import app from "../server/index.js";

export default function handler(req: unknown, res: unknown) {
  return app(req as never, res as never);
}
