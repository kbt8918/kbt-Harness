// types.ts — 도메인 타입 (데이터베이스설계서.md 기준)
export type Role = "parent" | "family" | "admin";

export interface UserRow {
  id: string;
  login_id: string;
  password_hash: string;
  name: string;
  role: Role;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface MappingRow {
  id: string;
  parent_id: string;
  family_id: string;
  created_at: string;
}

export interface DispatchRow {
  id: string;
  recipient_id: string;
  channel: "sms" | "kakao";
  template_code: string | null;
  content: string | null;
  status: "success" | "failed";
  fail_reason: string | null;
  sent_by: string;
  created_at: string;
}

// 인증된 요청에 첨부되는 사용자 정보
export interface AuthUser {
  id: string;
  role: Role;
  name: string;
}
