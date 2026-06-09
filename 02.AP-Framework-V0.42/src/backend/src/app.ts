// app.ts — Express 앱 구성 (server.ts와 Vercel 핸들러가 공유)
import express from "express";
import cors from "cors";
import { config } from "./config";
import { ok } from "./http";
import { notFound, errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import mappingRoutes from "./routes/mapping";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: (origin, cb) => {
        // 동일 출처/서버-서버 호출(origin 없음) 또는 허용 목록만 통과
        if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
        return cb(new Error("CORS: 허용되지 않은 출처"));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  // 헬스체크
  app.get("/api/health", (_req, res) => ok(res, { status: "ok", service: "ansim-connect-backend", time: new Date().toISOString() }));

  // 라우트 (API스펙 base: /api)
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/mapping", mappingRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
