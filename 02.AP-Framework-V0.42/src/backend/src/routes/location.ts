// location.ts — API-003 위치 전송 / API-004 최신 위치 조회 (F-001, F-004)
import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase";
import { ok, ApiError } from "../http";
import { asyncHandler } from "../utils";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// API-003 POST /api/location — 부모님이 자기 위치 전송
const sendSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  timestamp: z.string().optional(),
});
router.post(
  "/",
  requireRole("parent"),
  asyncHandler(async (req, res) => {
    const parsed = sendSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError("UNPROCESSABLE", "위치 좌표 형식이 올바르지 않습니다");
    const { latitude, longitude, accuracy, timestamp } = parsed.data;
    const captured_at = timestamp ?? new Date().toISOString();

    const { error } = await supabase.from("location_logs").insert({
      parent_id: req.user!.id, latitude, longitude, accuracy: accuracy ?? null, captured_at,
    });
    if (error) throw new ApiError("INTERNAL_ERROR", error.message);

    // 매핑된 가족 수(브로드캐스트 대상)
    const { count } = await supabase
      .from("parent_family_mappings")
      .select("*", { count: "exact", head: true })
      .eq("parent_id", req.user!.id);
    return ok(res, { saved: true, broadcastTo: count ?? 0 });
  }),
);

// API-004 GET /api/location/:parentId — 매핑된 가족이 부모님 최신 위치 조회
router.get(
  "/:parentId",
  asyncHandler(async (req, res) => {
    const { parentId } = req.params;
    const me = req.user!;

    // 권한: 본인(부모) 또는 매핑된 가족만 (F-012)
    if (me.role !== "admin" && me.id !== parentId) {
      const { data: mapped } = await supabase
        .from("parent_family_mappings")
        .select("id")
        .eq("parent_id", parentId)
        .eq("family_id", me.id)
        .maybeSingle();
      if (!mapped) throw new ApiError("FORBIDDEN", "매핑되지 않은 부모님입니다");
    }

    const { data, error } = await supabase
      .from("location_logs")
      .select("latitude, longitude, accuracy, captured_at")
      .eq("parent_id", parentId)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new ApiError("INTERNAL_ERROR", error.message);
    if (!data) throw new ApiError("NOT_FOUND", "위치 확인 불가");

    return ok(res, {
      parentId,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      accuracy: data.accuracy != null ? Number(data.accuracy) : null,
      updatedAt: data.captured_at,
    });
  }),
);

export default router;
