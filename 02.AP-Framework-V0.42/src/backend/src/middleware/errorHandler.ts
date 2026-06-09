// errorHandler.ts — 라우트에서 throw된 ApiError/일반 에러를 표준 응답으로 변환
import type { Request, Response, NextFunction } from "express";
import { ApiError, fail } from "../http";

// 404 핸들러 (라우트 미매칭)
export function notFound(_req: Request, res: Response) {
  return fail(res, "NOT_FOUND", "요청한 리소스를 찾을 수 없습니다");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return fail(res, err.code, err.message);
  }
  console.error("[errorHandler] 예기치 못한 오류:", err);
  return fail(res, "INTERNAL_ERROR", "서버 내부 오류가 발생했습니다");
}
