// mapping.ts — API-013 조회 / API-014 생성 / API-015 해제 (F-013)
import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase";
import { ok, ApiError } from "../http";
import { asyncHandler } from "../utils";
import { requireAuth, requireRole } from "../middleware/auth";
import type { MappingRow, UserRow } from "../types";

const router = Router();

// 매핑은 관리자/가족 접근 (F-013). 가족은 자신 관련 매핑만 — 여기서는 관리자/가족 역할 허용.
router.use(requireAuth, requireRole("admin", "family"));

// API-013 GET /api/mapping
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const parentId = req.query.parentId as string | undefined;
    const familyId = req.query.familyId as string | undefined;

    let query = supabase
      .from("parent_family_mappings")
      .select("id, parent_id, family_id, created_at")
      .order("created_at", { ascending: false });

    // 가족은 본인이 family_id인 매핑만 조회 가능 (권한 분리)
    if (req.user!.role === "family") query = query.eq("family_id", req.user!.id);
    if (parentId) query = query.eq("parent_id", parentId);
    if (familyId) query = query.eq("family_id", familyId);

    const { data, error } = await query;
    if (error) throw new ApiError("INTERNAL_ERROR", error.message);
    const mappings = (data ?? []).map((m: MappingRow) => ({
      id: m.id,
      parentId: m.parent_id,
      familyId: m.family_id,
      createdAt: m.created_at,
    }));
    return ok(res, { mappings });
  }),
);

// API-014 POST /api/mapping — 중복 매핑 차단(409)
const createSchema = z.object({
  parentId: z.string().uuid(),
  familyId: z.string().uuid(),
});
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError("UNPROCESSABLE", "parentId와 familyId는 필수입니다");
    const { parentId, familyId } = parsed.data;

    // 가족은 본인을 포함한 매핑만 생성 가능
    if (req.user!.role === "family" && familyId !== req.user!.id) {
      throw new ApiError("FORBIDDEN", "본인 외의 가족 매핑은 생성할 수 없습니다");
    }

    // 계정 존재·역할 검증
    const { data: users, error: uErr } = await supabase
      .from("users")
      .select("id, role")
      .in("id", [parentId, familyId]);
    if (uErr) throw new ApiError("INTERNAL_ERROR", uErr.message);
    const parent = (users ?? []).find((u: Pick<UserRow, "id" | "role">) => u.id === parentId);
    const family = (users ?? []).find((u: Pick<UserRow, "id" | "role">) => u.id === familyId);
    if (!parent || !family) throw new ApiError("NOT_FOUND", "존재하지 않는 계정입니다");
    if (parent.role !== "parent") throw new ApiError("UNPROCESSABLE", "parentId는 부모님 계정이어야 합니다");
    if (family.role !== "family") throw new ApiError("UNPROCESSABLE", "familyId는 가족 계정이어야 합니다");

    // 중복 매핑 차단
    const { data: dup } = await supabase
      .from("parent_family_mappings")
      .select("id")
      .eq("parent_id", parentId)
      .eq("family_id", familyId)
      .maybeSingle();
    if (dup) throw new ApiError("CONFLICT", "이미 매핑된 관계입니다");

    const { data, error } = await supabase
      .from("parent_family_mappings")
      .insert({ parent_id: parentId, family_id: familyId })
      .select("id, parent_id, family_id")
      .single();
    if (error) {
      // UNIQUE 제약 위반(경합) → 409
      if (error.code === "23505") throw new ApiError("CONFLICT", "이미 매핑된 관계입니다");
      throw new ApiError("INTERNAL_ERROR", error.message);
    }
    return ok(res, { id: data!.id, parentId: data!.parent_id, familyId: data!.family_id }, 201);
  }),
);

// API-015 DELETE /api/mapping/:mappingId
router.delete(
  "/:mappingId",
  asyncHandler(async (req, res) => {
    const { mappingId } = req.params;

    const { data: existing } = await supabase
      .from("parent_family_mappings")
      .select("id, family_id")
      .eq("id", mappingId)
      .maybeSingle<Pick<MappingRow, "id" | "family_id">>();
    if (!existing) throw new ApiError("NOT_FOUND", "존재하지 않는 매핑입니다");
    if (req.user!.role === "family" && existing.family_id !== req.user!.id) {
      throw new ApiError("FORBIDDEN", "본인 매핑만 해제할 수 있습니다");
    }

    const { error } = await supabase.from("parent_family_mappings").delete().eq("id", mappingId);
    if (error) throw new ApiError("INTERNAL_ERROR", error.message);
    return ok(res, { deleted: true });
  }),
);

export default router;
