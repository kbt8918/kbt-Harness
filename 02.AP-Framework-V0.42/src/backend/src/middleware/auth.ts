// auth.ts — JWT 인증 + 역할 검증 미들웨어 (F-011, F-012)
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { fail } from "../http";
import { logAccess } from "./accessLog";
import type { AuthUser, Role } from "../types";

// Express Request에 user 첨부
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
}

// 인증 필수: Bearer 토큰 검증 후 req.user 세팅
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    logAccess(req, 401, "denied", null);
    return fail(res, "UNAUTHORIZED", "인증이 필요합니다");
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthUser & { iat?: number; exp?: number };
    req.user = { id: payload.id, role: payload.role, name: payload.name };
    next();
  } catch {
    logAccess(req, 401, "denied", null);
    return fail(res, "UNAUTHORIZED", "토큰이 유효하지 않거나 만료되었습니다");
  }
}

// 역할 제한: requireAuth 다음에 사용
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      logAccess(req, 401, "denied", null);
      return fail(res, "UNAUTHORIZED", "인증이 필요합니다");
    }
    if (!roles.includes(req.user.role)) {
      logAccess(req, 403, "denied", req.user.id);
      return fail(res, "FORBIDDEN", "접근 권한이 없습니다");
    }
    next();
  };
}
