// db-seed.ts — 초기 데이터 (데이터베이스설계서 §7). 멱등: login_id 기준 upsert.
import bcrypt from "bcryptjs";
import { supabase } from "../src/supabase";
import type { Role } from "../src/types";

type SeedUser = { login_id: string; password: string; name: string; role: Role; phone: string | null };

const USERS: SeedUser[] = [
  { login_id: "admin", password: "admin1234", name: "박관리", role: "admin", phone: "010-0000-0000" },
  { login_id: "jiyoung", password: "test1234", name: "이지영", role: "family", phone: "010-3211-7788" },
  { login_id: "junho", password: "test1234", name: "이준호", role: "family", phone: "010-9930-1240" },
  { login_id: "soonja", password: "test1234", name: "김순자", role: "parent", phone: "010-2345-6789" },
  { login_id: "panseok", password: "test1234", name: "이판석", role: "parent", phone: "010-4456-7788" },
];

async function main() {
  console.log("시드 시작 — 사용자 upsert...");
  const idByLogin: Record<string, string> = {};

  for (const u of USERS) {
    const password_hash = await bcrypt.hash(u.password, 10);
    const { data, error } = await supabase
      .from("users")
      .upsert(
        { login_id: u.login_id, password_hash, name: u.name, role: u.role, phone: u.phone, updated_at: new Date().toISOString() },
        { onConflict: "login_id" },
      )
      .select("id, login_id")
      .single();
    if (error) throw new Error(`users upsert(${u.login_id}): ${error.message}`);
    idByLogin[u.login_id] = data!.id;
    console.log(`  user ${u.login_id} (${u.role}) → ${data!.id}`);
  }

  // 매핑: 김순자↔이지영, 김순자↔이준호, 이판석↔이지영
  const MAPS: [string, string][] = [
    ["soonja", "jiyoung"],
    ["soonja", "junho"],
    ["panseok", "jiyoung"],
  ];
  for (const [p, f] of MAPS) {
    const { error } = await supabase
      .from("parent_family_mappings")
      .upsert({ parent_id: idByLogin[p], family_id: idByLogin[f] }, { onConflict: "parent_id,family_id" });
    if (error) throw new Error(`mapping(${p}-${f}): ${error.message}`);
    console.log(`  mapping ${p} → ${f}`);
  }

  console.log("시드 완료.");
}

main().catch((e) => {
  console.error("db:seed 실패:", e.message);
  process.exit(1);
});
