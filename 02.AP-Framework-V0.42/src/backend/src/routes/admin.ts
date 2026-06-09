// admin.ts — API-010 회원조회 / API-011 SMS / API-012 카카오 (F-008, F-009, F-010)
import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase";
import { ok, ApiError } from "../http";
import { asyncHandler, maskPhone, isValidKoreanPhone } from "../utils";
import { requireAuth, requireRole } from "../middleware/auth";
import type { UserRow, MappingRow } from "../types";

const router = Router();

// 모든 관리자 라우트는 인증 + admin 역할 필요 (F-012)
router.use(requireAuth, requireRole("admin"));

// API-010 GET /api/admin/members — 회원 조회 (마스킹)
router.get(
  "/members",
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string | undefined)?.trim();
    const page = Math.max(1, Number(req.query.page ?? 1));
    const size = Math.min(100, Math.max(1, Number(req.query.size ?? 20)));
    const from = (page - 1) * size;
    const to = from + size - 1;

    let query = supabase.from("users").select("id, name, role, phone", { count: "exact" }).order("created_at", { ascending: false });
    if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,login_id.ilike.%${q}%`);
    const { data, error, count } = await query.range(from, to);
    if (error) throw new ApiError("INTERNAL_ERROR", error.message);

    const users = (data ?? []) as Pick<UserRow, "id" | "name" | "role" | "phone">[];

    // 각 회원의 매핑 부모 목록 (가족 기준: 자신이 family_id, 부모 기준: parent_id)
    const ids = users.map((u) => u.id);
    let mappings: MappingRow[] = [];
    if (ids.length) {
      const { data: mp } = await supabase
        .from("parent_family_mappings")
        .select("id, parent_id, family_id, created_at")
        .or(`family_id.in.(${ids.join(",")}),parent_id.in.(${ids.join(",")})`);
      mappings = (mp ?? []) as MappingRow[];
    }

    const members = users.map((u) => {
      const mappedParents = mappings.filter((m) => m.family_id === u.id).map((m) => m.parent_id);
      const mappedFamilies = mappings.filter((m) => m.parent_id === u.id).map((m) => m.family_id);
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        phone: maskPhone(u.phone),
        mappedParents,
        mappedFamilies,
      };
    });

    return ok(res, { members, total: count ?? members.length, page, size });
  }),
);

// 발송 공통: 수신자 조회 + 번호검증 + 이력기록 (모의 발송)
async function dispatch(
  recipientIds: string[],
  channel: "sms" | "kakao",
  sentBy: string,
  payload: { content?: string; templateCode?: string },
) {
  const { data, error } = await supabase.from("users").select("id, phone").in("id", recipientIds);
  if (error) throw new ApiError("INTERNAL_ERROR", error.message);
  const found = (data ?? []) as { id: string; phone: string | null }[];

  const rows: {
    recipient_id: string;
    channel: "sms" | "kakao";
    template_code: string | null;
    content: string | null;
    status: "success" | "failed";
    fail_reason: string | null;
    sent_by: string;
  }[] = [];

  const results: { id: string; ok: boolean; reason?: string }[] = [];
  for (const id of recipientIds) {
    const u = found.find((x) => x.id === id);
    let status: "success" | "failed" = "success";
    let fail_reason: string | null = null;
    if (!u) {
      status = "failed";
      fail_reason = "수신자 없음";
    } else if (!u.phone || !isValidKoreanPhone(u.phone)) {
      status = "failed";
      fail_reason = "번호 형식 오류";
    }
    // 모의 발송: 외부 사업자 API 연동 시 이 지점에서 호출. 현재는 검증 통과 시 성공 처리.
    rows.push({
      recipient_id: id,
      channel,
      template_code: payload.templateCode ?? null,
      content: payload.content ?? null,
      status,
      fail_reason,
      sent_by: sentBy,
    });
    results.push({ id, ok: status === "success", ...(fail_reason ? { reason: fail_reason } : {}) });
  }

  // 유효한 recipient_id만 이력 기록 (FK 위반 방지)
  const insertable = rows.filter((r) => found.some((u) => u.id === r.recipient_id));
  if (insertable.length) {
    const { error: insErr } = await supabase.from("message_dispatches").insert(insertable);
    if (insErr) throw new ApiError("INTERNAL_ERROR", insErr.message);
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;
  return { sent, failed, results };
}

// API-011 POST /api/admin/sms — SMS 발송 (F-009)
const smsSchema = z.object({
  recipientIds: z.array(z.string().uuid()).min(1),
  message: z.string().min(1),
});
router.post(
  "/sms",
  asyncHandler(async (req, res) => {
    const parsed = smsSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError("UNPROCESSABLE", "recipientIds와 message는 필수입니다");
    const { recipientIds, message } = parsed.data;
    const result = await dispatch(recipientIds, "sms", req.user!.id, { content: message });
    return ok(res, result);
  }),
);

// API-012 POST /api/admin/kakao — 카카오 알림톡 발송 (F-010)
const kakaoSchema = z.object({
  recipientIds: z.array(z.string().uuid()).min(1),
  templateCode: z.string().min(1),
  variables: z.record(z.string()).optional(),
});
router.post(
  "/kakao",
  asyncHandler(async (req, res) => {
    const parsed = kakaoSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError("UNPROCESSABLE", "recipientIds와 templateCode는 필수입니다");
    const { recipientIds, templateCode, variables } = parsed.data;
    const content = variables ? JSON.stringify(variables) : null;
    const result = await dispatch(recipientIds, "kakao", req.user!.id, { templateCode, content: content ?? undefined });
    return ok(res, { sent: result.sent, failed: result.failed });
  }),
);

// (보너스) GET /api/admin/dispatches — 발송 내역 조회 (프론트 발송내역 화면 연동용)
router.get(
  "/dispatches",
  asyncHandler(async (req, res) => {
    const channel = req.query.channel as string | undefined;
    let query = supabase
      .from("message_dispatches")
      .select("id, recipient_id, channel, content, status, fail_reason, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (channel === "sms" || channel === "kakao") query = query.eq("channel", channel);
    const { data, error } = await query;
    if (error) throw new ApiError("INTERNAL_ERROR", error.message);
    return ok(res, { dispatches: data ?? [] });
  }),
);

export default router;
