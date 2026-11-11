import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// A build can run as one web+API service, with no separate hosting/proxy needed.
// The path works both from src/app.ts and the bundled dist/index.mjs.
const webDir = fileURLToPath(new URL("../../ai-wellness-stone/web-dist/", import.meta.url));
if (existsSync(path.join(webDir, "index.html"))) {
  app.use(express.static(webDir));
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(path.join(webDir, "index.html"));
  });
}

export default app;
