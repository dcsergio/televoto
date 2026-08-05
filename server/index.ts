import "./config/env.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRouter } from "./routes/auth.routes.js";
import { eventsRouter } from "./routes/events.routes.js";
import { candidatesRouter } from "./routes/candidates.routes.js";
import { judgeTokensRouter } from "./routes/judge-tokens.routes.js";
import { votesRouter } from "./routes/votes.routes.js";
import { rankingsRouter } from "./routes/rankings.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: false }));
app.use(express.json());

app.use(authRouter);
app.use(eventsRouter);
app.use(candidatesRouter);
app.use(judgeTokensRouter);
app.use(votesRouter);
app.use(rankingsRouter);

const shouldServeClient = env.nodeEnv === "production" || env.serveClient;
const clientDistPath = path.resolve(__dirname, "..", "dist");
const clientIndexPath = path.join(clientDistPath, "index.html");

if (shouldServeClient && fs.existsSync(clientIndexPath)) {
  app.use(express.static(clientDistPath));

  const sendClientApp = (_req: express.Request, res: express.Response) => {
    res.sendFile(clientIndexPath);
  };

  app.get("/", sendClientApp);
  app.get("/admin", sendClientApp);
  app.get("/manager", sendClientApp);
  app.get("/hof", sendClientApp);
}

app.use(errorHandler);

const PORT = env.port;

const isDirectExecution = process.argv[1] ? pathToFileURL(process.argv[1]).href === import.meta.url : false;

if (isDirectExecution) {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

export default app;
