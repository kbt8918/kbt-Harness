"use client";
// api.ts — 백엔드(관리자 API) 클라이언트.
// NEXT_PUBLIC_API_BASE 가 설정되면 실제 백엔드를, 없으면 빈 문자열(미연동)로 둔다.
// 백엔드 응답 포맷: { status: "success", data } | { status: "error", error: { code, message } }

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
export const apiEnabled = Boolean(API_BASE);

const TOKEN_KEY = "ansim.token";
const USER_KEY = "ansim.user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}
export function setAuthUser(user: AuthResult["user"] | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(USER_KEY);
}
export function getAuthUser(): AuthResult["user"] | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(window.localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type ApiOk<T> = { status: "success"; data: T };
type ApiErr = { status: "error"; error: { code: string; message: string } };

async function request<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> {
  if (!API_BASE) throw new ApiError("NO_BACKEND", "백엔드 API가 설정되지 않았습니다", 0);
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init?.headers as Record<string, string>) };
  if (init?.auth !== false) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError("NETWORK_ERROR", "서버에 연결할 수 없습니다", 0);
  }
  const body = (await res.json().catch(() => null)) as ApiOk<T> | ApiErr | null;
  if (!res.ok || !body || body.status === "error") {
    const err = body && body.status === "error" ? body.error : { code: "INTERNAL_ERROR", message: "요청 처리에 실패했습니다" };
    throw new ApiError(err.code, err.message, res.status);
  }
  return body.data;
}

// ── 타입 ──
export type ApiRole = "parent" | "family" | "admin";
export interface AuthResult {
  token: string;
  user: { id: string; role: ApiRole; name: string };
}
export interface AdminMember {
  id: string;
  name: string;
  role: ApiRole;
  phone: string | null;
  mappedParents: string[];
  mappedFamilies: string[];
}
export interface MappingDto {
  id: string;
  parentId: string;
  familyId: string;
  createdAt?: string;
}
export interface DispatchDto {
  id: string;
  recipient_id: string;
  channel: "sms" | "kakao";
  content: string | null;
  status: "success" | "failed";
  fail_reason: string | null;
  created_at: string;
}
export interface LocationDto {
  parentId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  updatedAt: string;
}
export interface AlertDto {
  id: string;
  parent_id: string;
  latitude: number | null;
  longitude: number | null;
  sent_at: string;
}

// ── 엔드포인트 ──
export const api = {
  login: (loginId: string, password: string) =>
    request<AuthResult>("/api/auth/login", { method: "POST", auth: false, body: JSON.stringify({ loginId, password }) }),
  logout: () => request<{ loggedOut: boolean }>("/api/auth/logout", { method: "POST" }),
  members: (q?: string) =>
    request<{ members: AdminMember[]; total: number }>(`/api/admin/members${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  mappings: () => request<{ mappings: MappingDto[] }>("/api/mapping"),
  createMapping: (parentId: string, familyId: string) =>
    request<MappingDto>("/api/mapping", { method: "POST", body: JSON.stringify({ parentId, familyId }) }),
  deleteMapping: (id: string) => request<{ deleted: boolean }>(`/api/mapping/${id}`, { method: "DELETE" }),
  sendSms: (recipientIds: string[], message: string) =>
    request<{ sent: number; failed: number }>("/api/admin/sms", { method: "POST", body: JSON.stringify({ recipientIds, message }) }),
  sendKakao: (recipientIds: string[], templateCode: string) =>
    request<{ sent: number; failed: number }>("/api/admin/kakao", { method: "POST", body: JSON.stringify({ recipientIds, templateCode }) }),
  dispatches: (channel?: "sms" | "kakao") =>
    request<{ dispatches: DispatchDto[] }>(`/api/admin/dispatches${channel ? `?channel=${channel}` : ""}`),
  // 부모님/가족 화면용 (위치·긴급·전화)
  sendLocation: (latitude: number, longitude: number, accuracy?: number) =>
    request<{ saved: boolean; broadcastTo: number }>("/api/location", { method: "POST", body: JSON.stringify({ latitude, longitude, accuracy }) }),
  getLocation: (parentId: string) => request<LocationDto>(`/api/location/${parentId}`),
  sendEmergency: (latitude?: number, longitude?: number) =>
    request<{ alertId: string; notifiedFamily: number }>("/api/alert/emergency", { method: "POST", body: JSON.stringify({ latitude, longitude }) }),
  recentAlerts: () => request<{ alerts: AlertDto[] }>("/api/alert/recent"),
  parentPhone: (parentId: string) => request<{ parentId: string; phone: string }>(`/api/member/${parentId}/phone`),
};
