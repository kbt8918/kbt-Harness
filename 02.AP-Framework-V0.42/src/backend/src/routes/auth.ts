// auth.ts — API-001 로그인 / API-002 로그아웃 (F-011)
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { supabase } from "../supabase";
import { ok, ApiError } from "../http";
import { asyncHandler } from "../utils";
import { signToken, requireAuth } from "../middleware/auth";
import { logAccess } from "../middleware/accessLog";
import type { UserRow } from "../types";

const router = Router();

const loginSchema = z.object({
  loginId: z.string().min(1),
  password: z.string().min(1),
});

// API-001 POST /api/auth/login
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError("UNPROCESSABLE", "loginId와 password는 필수입니다");
    const { loginId, password } = parsed.data;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("login_id", loginId)
      .maybeSingle<UserRow>();
    if (error) throw new ApiError("INTERNAL_ERROR", error.message);

    if (!data || !(await bcrypt.compare(password, data.password_hash))) {
      logAccess(req, 401, "denied", data?.id ?? null);
      throw new ApiError("UNAUTHORIZED", "아이디 또는 비밀번호가 일치하지 않습니다");
    }

    const token = signToken({ id: data.id, role: data.role, name: data.name });
    logAccess(req, 200, "allowed", data.id);
    return ok(res, { token, user: { id: data.id, role: data.role, name: data.name } });
  }),
);

// API-002 POST /api/auth/logout — JWT는 stateless이므로 클라이언트 토큰 폐기를 안내(감사 로그만 기록)
router.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    logAccess(req, 200, "allowed", req.user!.id);
    return ok(res, { loggedOut: true });
  }),
);

export default router;
