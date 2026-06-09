// db-push.ts — sql/schema.sql 을 Supabase Postgres에 적용
import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";
import { config } from "../src/config";

async function main() {
  const sql = readFileSync(join(__dirname, "..", "sql", "schema.sql"), "utf-8");
  const client = new Client({
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Supabase Postgres 연결 성공 — 스키마 적용 중...");
  await client.query(sql);
  console.log("스키마 적용 완료 (8개 테이블 + 인덱스)");
  await client.end();
}

main().catch((e) => {
  console.error("db:push 실패:", e.message);
  process.exit(1);
});
