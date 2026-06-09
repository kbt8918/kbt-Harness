// alert.ts — API-006 긴급 알림 발송 + 최근 알림 조회 (F-002, F-005 폴링)
import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase";
import { ok, ApiError } from "../http";
import { asyncHandler } from "../utils";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// API-006 POST /api/alert/emergency — 부모님 1-터치 긴급 알림
const sendSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
router.post(
  "/emergency",
  requireRole("parent"),
  asyncHandler(async (req, res) => {
    const parsed = sendSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw new ApiError("UNPROCESSABLE", "요청 형식이 올바르지 않습니다");
    const { latitude, longitude } = parsed.data;

    // 디바운스: 최근 10초 내 동일 부모 알림이 있으면 중복 처리(409)
    const since = new Date(Date.now() - 10_000).toISOString();
    const { data: recent } = await supabase
      .from("emergency_alerts")
      .select("id")
      .eq("parent_id", req.user!.id)
      .gte("sent_at", since)
      .maybeSingle();
    if (recent) throw new ApiError("CONFLICT", "잠시 후 다시 시도해주세요 (중복 발송 방지)");

    const { data, error } = await supabase
      .from("emergency_alerts")
      .insert({ parent_id: req.user!.id, latitude: latitude ?? null, longitude: longitude ?? null, status: "sent" })
      .select("id")
      .single();
    if (error) throw new ApiError("INTERNAL_ERROR", error.message);

    const { count } = await supabase
      .from("parent_family_mappings")
      .select("*", { count: "exact", head: true })
      .eq("parent_id", req.user!.id);
    return ok(res, { alertId: data!.id, notifiedFamily: count ?? 0 });
  }),
);

// GET /api/alert/recent — 가족이 매핑된 부모님들의 최근 긴급 알림 조회 (폴링, F-005)
router.get(
  "/recent",
  asyncHandler(async (req, res) => {
    const me = req.user!;
    // 내가 가족으로 매핑된 부모 id 목록
    const { data: maps } = await supabase
      .from("parent_family_mappings")
      .select("parent_id")
      .eq("family_id", me.id);
    const parentIds = (maps ?? []).map((m: { parent_id: string }) => m.parent_id);
    if (parentIds.length === 0) return ok(res, { alerts: [] });

    const sinceMin = Number(req.query.sinceMinutes ?? 30);
    const since = new Date(Date.now() - sinceMin * 60_000).toISOString();
    const { data, error } = await supabase
      .from("emergency_alerts")
      .select("id, parent_id, latitude, longitude, sent_at")
      .in("parent_id", parentIds)
      .gte("sent_at", since)
      .order("sent_at", { ascending: false });
    if (error) throw new ApiError("INTERNAL_ERROR", error.message);
    return ok(res, { alerts: data ?? [] });
  }),
);

export default router;
