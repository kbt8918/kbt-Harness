// utils.ts — 공통 헬퍼
import type { Request, Response, NextFunction } from "express";

// 전화번호 마스킹: 010-1234-5678 → 010-****-5678 (API-010, users 마스킹 정책)
export function maskPhone(phone: string | null): string | null {
  if (!phone) return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return phone;
  const head = digits.slice(0, 3);
  const tail = digits.slice(-4);
  return `${head}-****-${tail}`;
}

// 한국 휴대폰 형식 검증 (010-0000-0000 / 01000000000 등 허용)
export function isValidKoreanPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return /^01[016789]\d{7,8}$/.test(digits);
}

// async 라우트 핸들러의 예외를 errorHandler로 전달
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
