// http.ts — 공통 응답 포맷 + 에러 (API스펙 1.1 / 1.2)
import type { Response } from "express";

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNPROCESSABLE"
  | "TOO_MANY_REQUESTS"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  UPSTREAM_ERROR: 502,
  INTERNAL_ERROR: 500,
};

// 라우트에서 throw하면 errorHandler가 표준 에러 응답으로 변환
export class ApiError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ status: "success", data });
}

export function fail(res: Response, code: ErrorCode, message: string) {
  return res.status(STATUS[code]).json({ status: "error", error: { code, message } });
}

export { STATUS };
