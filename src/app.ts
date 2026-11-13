import "dotenv/config";
import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import routes from "./routes/index";
import { errorHandler } from "./middlewares/error.middleware";

const app: Application = express();

/**
 * CORS allow-list, driven entirely by CLIENT_URL so no host is hardcoded.
 * CLIENT_URL accepts one origin or a comma-separated list, e.g.
 *   CLIENT_URL="https://retemali.id,https://www.retemali.id"
 * In development the usual localhost Next.js origins are added automatically so
 * the app keeps working without extra config.
 */
const DEV_ORIGINS: readonly string[] = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function parseOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter((origin) => origin.length > 0);
}

const allowedOrigins: string[] = Array.from(
  new Set([
    ...parseOrigins(process.env.CLIENT_URL),
    ...(process.env.NODE_ENV === "production" ? [] : DEV_ORIGINS),
  ]),
);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api", routes);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    message: "Taman Baca Rete Mali Backend Server is running",
    env: process.env.NODE_ENV ?? "development",
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: "error",
    message: "Route tidak ditemukan",
  });
});

app.use(errorHandler);

export default app;
