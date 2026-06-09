// supabase.ts — service_role 키 기반 백엔드 전용 Supabase 클라이언트
// service_role은 RLS를 우회하므로 절대 프론트엔드에 노출 금지.
import { createClient } from "@supabase/supabase-js";
import { config } from "./config";

export const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
