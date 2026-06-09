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

  // 루트 / — API 서버 안내 랜딩 (브라우저 직접 접근 시 404 대신 정보 페이지)
  app.get("/", (_req, res) => {
    res.status(200).type("html").send(`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>안심연결 백엔드 API</title>
<style>
  :root{--blue:#2563eb;--green:#16a34a;--g900:#111827;--g600:#4b5563;--g100:#f3f4f6;--g300:#d1d5db}
  *{box-sizing:border-box} body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#f9fafb;color:var(--g900);line-height:1.6}
  .wrap{max-width:760px;margin:0 auto;padding:48px 24px}
  .badge{display:inline-flex;align-items:center;gap:6px;background:#dcfce7;color:var(--green);font-size:13px;font-weight:700;padding:5px 12px;border-radius:9999px}
  h1{font-size:28px;margin:18px 0 6px} .sub{color:var(--g600);margin:0 0 28px}
  .card{background:#fff;border:1px solid var(--g300);border-radius:14px;padding:8px 4px;overflow:hidden}
  table{width:100%;border-collapse:collapse} th,td{text-align:left;padding:11px 16px;font-size:14px}
  th{color:var(--g600);font-size:12px;font-weight:700;background:var(--g100)}
  tr+tr td{border-top:1px solid var(--g100)}
  code{background:var(--g100);padding:2px 7px;border-radius:6px;font-size:13px}
  .m{display:inline-block;min-width:46px;font-weight:700;font-size:12px;color:var(--blue)}
  .foot{margin-top:24px;color:var(--g600);font-size:13px}
  a{color:var(--blue)}
</style></head>
<body><div class="wrap">
  <span class="badge">● 정상 작동 중</span>
  <h1>안심연결 백엔드 API</h1>
  <p class="sub">부모님 위치 확인 서비스 · 관리자 API 서버 (Express + Supabase)</p>
  <div class="card"><table>
    <tr><th>Method</th><th>Endpoint</th><th>설명</th></tr>
    <tr><td><span class="m">GET</span></td><td><code><a href="/api/health">/api/health</a></code></td><td>헬스체크</td></tr>
    <tr><td><span class="m">POST</span></td><td><code>/api/auth/login</code></td><td>로그인 (JWT 발급)</td></tr>
    <tr><td><span class="m">GET</span></td><td><code>/api/admin/members</code></td><td>회원 조회 (관리자)</td></tr>
    <tr><td><span class="m">POST</span></td><td><code>/api/admin/sms</code></td><td>SMS 발송 (관리자)</td></tr>
    <tr><td><span class="m">POST</span></td><td><code>/api/admin/kakao</code></td><td>카카오 알림톡 (관리자)</td></tr>
    <tr><td><span class="m">GET·POST·DEL</span></td><td><code>/api/mapping</code></td><td>부모-가족 매핑</td></tr>
  </table></div>
  <p class="foot">이 페이지는 API 서버입니다. 서비스 화면은 <a href="https://kbt-harness-ansim.vercel.app">안심연결 프론트엔드</a>에서 이용하세요.</p>
</div></body></html>`);
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
