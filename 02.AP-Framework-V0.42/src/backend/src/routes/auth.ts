// auth.ts — API-001 로그인 / API-002 로그아웃 (F-011) + Google OAuth
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { supabase } from "../supabase";
import { config } from "../config";
import { ok, ApiError } from "../http";
import { asyncHandler } from "../utils";
import { signToken, requireAuth } from "../middleware/auth";
import { logAccess } from "../middleware/accessLog";
import type { UserRow, Role } from "../types";

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

// ── Google 소셜 로그인 (F-011) ──
// 프론트가 OAuth code + redirectUri(등록된 /auth/callback) + role(신규 가입 유형)을 전달.
// 백엔드가 code→토큰 교환→프로필 조회→users upsert→자체 JWT 발급.
const googleSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
  role: z.enum(["parent", "family"]).optional(), // 신규 가입 시 유형(기본 family)
});

router.post(
  "/google",
  asyncHandler(async (req, res) => {
    const parsed = googleSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError("UNPROCESSABLE", "code와 redirectUri는 필수입니다");
    const { code, redirectUri, role } = parsed.data;
    if (!config.googleClientId || !config.googleClientSecret) {
      throw new ApiError("INTERNAL_ERROR", "Google OAuth가 구성되지 않았습니다");
    }

    // 1) code → access_token 교환
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string; error_description?: string };
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new ApiError("UNAUTHORIZED", "Google 인증에 실패했습니다: " + (tokenJson.error_description || tokenJson.error || "토큰 교환 실패"));
    }

    // 2) 프로필 조회
    const profRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const prof = (await profRes.json()) as { email?: string; name?: string; id?: string };
    if (!profRes.ok || !prof.email) throw new ApiError("UNAUTHORIZED", "Google 프로필 조회에 실패했습니다");

    const loginId = prof.email.toLowerCase();
    const name = prof.name || prof.email.split("@")[0];

    // 3) 기존 사용자 조회 (이메일=login_id)
    const { data: existing } = await supabase
      .from("users")
      .select("id, role, name")
      .eq("login_id", loginId)
      .maybeSingle<Pick<UserRow, "id" | "role" | "name">>();

    let user: { id: string; role: Role; name: string };
    if (existing) {
      user = { id: existing.id, role: existing.role, name: existing.name };
    } else {
      // 신규 가입: OAuth 사용자는 비밀번호 로그인 불가용 랜덤 해시
      const randomHash = await bcrypt.hash("google-oauth:" + (prof.id || loginId) + ":" + Date.now(), 10);
      const newRole: Role = role || "family";
      const { data: created, error: insErr } = await supabase
        .from("users")
        .insert({ login_id: loginId, password_hash: randomHash, name, role: newRole, phone: null })
        .select("id, role, name")
        .single();
      if (insErr) throw new ApiError("INTERNAL_ERROR", "회원 생성 실패: " + insErr.message);
      user = { id: created!.id, role: created!.role, name: created!.name };
    }

    const token = signToken(user);
    logAccess(req, 200, "allowed", user.id);
    return ok(res, { token, user, isNew: !existing });
  }),
);

export default router;
