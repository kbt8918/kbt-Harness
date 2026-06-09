// app.ts — Express 앱 구성 (server.ts와 Vercel 핸들러가 공유)
import express from "express";
import cors from "cors";
import { readFileSync } from "fs";
import { join } from "path";
import { config } from "./config";
import { ok } from "./http";
import { notFound, errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import mappingRoutes from "./routes/mapping";

// 관리자 웹 UI (public/admin.html) — 로컬(src 기준)·Vercel(dist/번들 기준) 양쪽 경로 탐색
function loadAdminHtml(): string {
  const candidates = [
    join(__dirname, "..", "public", "admin.html"),       // dist/src → ../public (빌드 산출물 위치)
    join(__dirname, "..", "..", "public", "admin.html"), // dist/src/app.js → ../../public
    join(process.cwd(), "public", "admin.html"),
    join(process.cwd(), "src", "backend", "public", "admin.html"),
  ];
  for (const p of candidates) {
    try { return readFileSync(p, "utf-8"); } catch { /* 다음 후보 */ }
  }
  return "";
}
const ADMIN_HTML = loadAdminHtml();

export function createApp() {
  const app = express();

  // CORS — same-origin(관리자 UI ↔ 자기 백엔드) 및 허용 목록만 통과.
  // 요청 host와 Origin host가 같으면 same-origin이므로 무조건 허용한다.
  app.use((req, res, next) => {
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true); // 서버-서버/curl 등 Origin 없음
        let sameOrigin = false;
        try { sameOrigin = new URL(origin).host === req.headers.host; } catch { /* noop */ }
        if (sameOrigin || config.corsOrigins.includes(origin)) return cb(null, true);
        return cb(null, false); // 비허용: 에러 throw 대신 CORS 헤더만 생략(500 방지)
      },
      credentials: true,
    })(req, res, next);
  });
  app.use(express.json({ limit: "1mb" }));

  // 루트 / — 관리자 웹 UI (백엔드가 직접 서빙). API와 same-origin이라 CORS 불필요.
  app.get("/", (_req, res) => {
    if (ADMIN_HTML) return res.status(200).type("html").send(ADMIN_HTML);
    return res.status(200).type("html").send("<h1>안심연결 백엔드 API</h1><p>관리자 UI를 불러오지 못했습니다. <a href='/api/health'>/api/health</a></p>");
  });

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
