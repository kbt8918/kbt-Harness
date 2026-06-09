// member.ts — API-007 부모님 전화번호 조회 (F-006 바로 전화)
import { Router } from "express";
import { supabase } from "../supabase";
import { ok, ApiError } from "../http";
import { asyncHandler } from "../utils";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// API-007 GET /api/member/:parentId/phone — 매핑된 가족이 바로 전화용 번호 조회
router.get(
  "/:parentId/phone",
  asyncHandler(async (req, res) => {
    const { parentId } = req.params;
    const me = req.user!;

    // 권한: 매핑된 가족 또는 관리자 (F-012)
    if (me.role !== "admin") {
      const { data: mapped } = await supabase
        .from("parent_family_mappings")
        .select("id")
        .eq("parent_id", parentId)
        .eq("family_id", me.id)
        .maybeSingle();
      if (!mapped) throw new ApiError("FORBIDDEN", "매핑되지 않은 부모님입니다");
    }

    const { data, error } = await supabase
      .from("users")
      .select("phone")
      .eq("id", parentId)
      .maybeSingle();
    if (error) throw new ApiError("INTERNAL_ERROR", error.message);
    if (!data || !data.phone) throw new ApiError("NOT_FOUND", "전화번호가 등록되지 않았습니다");

    return ok(res, { parentId, phone: data.phone });
  }),
);

export default router;
