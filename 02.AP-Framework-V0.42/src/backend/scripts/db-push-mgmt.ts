// db-push-mgmt.ts — Supabase Management API(REST/443)로 schema.sql 실행.
// IPv6 전용 직접 5432 연결이 막힌 환경에서 사용. PAT(SUPABASE_ACCESS_TOKEN) 필요.
import { readFileSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";
dotenv.config();

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
if (!token || !ref) {
  console.error("SUPABASE_ACCESS_TOKEN 또는 SUPABASE_PROJECT_REF 누락 (.env 확인)");
  process.exit(1);
}

async function runSql(query: string) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text;
}

async function main() {
  const sql = readFileSync(join(__dirname, "..", "sql", "schema.sql"), "utf-8");
  console.log("Management API로 스키마 적용 중...");
  await runSql(sql);
  // PostgREST 스키마 캐시 리로드 (테이블 즉시 REST 노출)
  await runSql("notify pgrst, 'reload schema';").catch(() => {});
  console.log("스키마 적용 완료 (9개 테이블 + 인덱스) + PostgREST 캐시 리로드");
}

main().catch((e) => {
  console.error("db:push(mgmt) 실패:", e.message);
  process.exit(1);
});
