// config.ts — 환경변수 로드 및 검증
import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`환경변수 누락: ${name} (.env 확인)`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  db: {
    host: process.env.SUPABASE_DB_HOST ?? "",
    port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
    name: process.env.SUPABASE_DB_NAME ?? "postgres",
    user: process.env.SUPABASE_DB_USER ?? "postgres",
    password: process.env.SUPABASE_DB_PASSWORD ?? "",
  },
  jwtSecret: process.env.JWT_SECRET ?? "ansim-connect-dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "12h",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3300")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
