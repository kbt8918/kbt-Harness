// accessLog.ts — 접근 감사 로그 (F-012). access_logs 테이블에 비동기 기록.
import type { Request } from "express";
import { supabase } from "../supabase";

export function logAccess(req: Request, statusCode: number, result: "allowed" | "denied", actorId: string | null) {
  // fire-and-forget: 로깅 실패가 요청 흐름을 막지 않도록 await하지 않는다.
  void supabase
    .from("access_logs")
    .insert({
      actor_id: actorId,
      method: req.method,
      path: req.originalUrl.split("?")[0].slice(0, 255),
      status_code: statusCode,
      result,
    })
    .then(({ error }) => {
      if (error && process.env.NODE_ENV !== "production") {
        console.warn("[accessLog] 기록 실패:", error.message);
      }
    });
}
