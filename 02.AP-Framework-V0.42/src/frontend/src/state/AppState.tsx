"use client";
// AppState.tsx — 공유 라이브 상태 (auth, alerts, location, chat, members, mappings, invites)
// 디자인 번들 app_state.jsx 충실 이식.
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";

// ───────── 타입 ─────────
export type Member = {
  id: string;
  name: string;
  phone: string;
  role: "가족" | "부모";
  mapped: string;
  status: "활성" | "대기";
};
export type Mapping = {
  id: string;
  parentId: string;
  parentName: string;
  parentPhone: string;
  familyId: string;
  familyName: string;
  relation: string;
  status: string;
  created: string;
};
export type ChatMsg = { id: number; sender: string; me: boolean; text: string; time: string };
export type SendRecord = { id: string; dt: string; channel: string; target: number; text: string; success: number; fail: number };
export type Alert = { id: number; type: string; text: string; time: string };
export type Emergency = { time: string } | null;
export type Toast = { id: number; msg: string; kind: "info" | "error" };
export type Invite = {
  token: string;
  url: string;
  parentName: string;
  parentPhone: string;
  relation: string;
  familyName: string;
  familyId: string;
  registered: boolean;
  status: string;
} | null;
// 가족이 보낸 매칭 요청 (대기 목록)
export type SentRequest = {
  id: string;
  parentName: string;
  parentPhone: string;
  relation: string;
  channel: "문자" | "QR";
  registered: boolean;
  status: "대기" | "연결됨" | "만료";
  sentAt: string;
};
// 부모님이 받는 연결 요청 (수신함)
export type IncomingRequest = {
  id: string;
  familyName: string;
  relation: string;
  sentAt: string;
};

// ───────── 시드 데이터 ─────────
export const PARENT = { name: "김순자", relation: "어머니", age: 72, phone: "010-2345-6789" };
export const CURRENT_FAMILY = { id: "M-1042", name: "이지영" };

const SEED_CHAT: ChatMsg[] = [
  { id: 1, sender: "이준호", me: false, text: "어머니 오늘 점심 드셨대요?", time: "13:58" },
  { id: 2, sender: "나", me: true, text: "방금 통화했어, 잘 드셨대 😊", time: "14:01" },
  { id: 3, sender: "이준호", me: false, text: "위치는 지금 집 근처죠?", time: "14:03" },
  { id: 4, sender: "나", me: true, text: "응 동네 산책 중이신 것 같아", time: "14:04" },
];

const SEED_MEMBERS: Member[] = [
  { id: "M-1042", name: "이지영", phone: "010-3211-7788", role: "가족", mapped: "어머니 김순자", status: "활성" },
  { id: "M-1043", name: "이준호", phone: "010-9930-1240", role: "가족", mapped: "어머니 김순자", status: "활성" },
  { id: "M-1044", name: "김순자", phone: "010-2345-6789", role: "부모", mapped: "딸 이지영 외 1", status: "활성" },
  { id: "M-1051", name: "박서윤", phone: "010-5567-0091", role: "가족", mapped: "아버지 박정호", status: "활성" },
  { id: "M-1052", name: "박정호", phone: "010-7781-3345", role: "부모", mapped: "딸 박서윤", status: "활성" },
  { id: "M-1066", name: "최민수", phone: "010-2240-8876", role: "가족", mapped: "(미매핑)", status: "대기" },
  { id: "M-1070", name: "정현우", phone: "010-6612-9087", role: "가족", mapped: "(미매핑)", status: "대기" },
  { id: "M-1071", name: "한지민", phone: "010-3398-2210", role: "부모", mapped: "아들 한태경", status: "활성" },
  { id: "M-1072", name: "한태경", phone: "010-8845-6601", role: "가족", mapped: "어머니 한지민", status: "활성" },
  { id: "M-1080", name: "오세훈", phone: "010-1123-4567", role: "부모", mapped: "(미매핑)", status: "대기" },
  { id: "M-1090", name: "이판석", phone: "010-4456-7788", role: "부모", mapped: "딸 이지영", status: "활성" },
];

const SEED_MAPPINGS: Mapping[] = [
  { id: "MP-01", parentId: "M-1044", parentName: "김순자", parentPhone: "010-2345-6789", familyId: "M-1042", familyName: "이지영", relation: "어머니", status: "활성", created: "2026-05-28" },
  { id: "MP-02", parentId: "M-1044", parentName: "김순자", parentPhone: "010-2345-6789", familyId: "M-1043", familyName: "이준호", relation: "어머니", status: "활성", created: "2026-05-28" },
  { id: "MP-03", parentId: "M-1052", parentName: "박정호", parentPhone: "010-7781-3345", familyId: "M-1051", familyName: "박서윤", relation: "아버지", status: "활성", created: "2026-06-01" },
  { id: "MP-04", parentId: "M-1071", parentName: "한지민", parentPhone: "010-3398-2210", familyId: "M-1072", familyName: "한태경", relation: "어머니", status: "활성", created: "2026-06-03" },
  { id: "MP-05", parentId: "M-1090", parentName: "이판석", parentPhone: "010-4456-7788", familyId: "M-1042", familyName: "이지영", relation: "아버지", status: "활성", created: "2026-06-05" },
];

const SEED_HISTORY: SendRecord[] = [
  { id: "S-1009", dt: "2026-06-09 14:05", channel: "카카오", target: 12, text: "긴급 알림 발생 안내", success: 12, fail: 0 },
  { id: "S-1008", dt: "2026-06-09 11:30", channel: "SMS", target: 45, text: "[안심연결] 부모님 위치 확인 안내드립니다.", success: 44, fail: 1 },
  { id: "S-1007", dt: "2026-06-08 17:20", channel: "SMS", target: 8, text: "서비스 점검 공지 (06/10 02:00~04:00)", success: 8, fail: 0 },
  { id: "S-1006", dt: "2026-06-08 09:10", channel: "카카오", target: 30, text: "위치 확인 안내", success: 29, fail: 1 },
  { id: "S-1005", dt: "2026-06-07 16:00", channel: "SMS", target: 3, text: "테스트 발송", success: 3, fail: 0 },
];

// ───────── 시간 헬퍼 ─────────
export function nowHM() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
function pad2(n: number) { return String(n).padStart(2, "0"); }
function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}
function nowDT() { return todayStr() + " " + nowHM(); }

// gentle 2-tone chime for emergency
function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ac = new Ctx();
    const g = ac.createGain();
    g.connect(ac.destination);
    g.gain.value = 0.0001;
    [880, 1180].forEach((f, i) => {
      const o = ac.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(g);
      const t0 = ac.currentTime + i * 0.18;
      o.start(t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
      o.stop(t0 + 0.34);
    });
    setTimeout(() => ac.close && ac.close(), 900);
  } catch { /* no-op */ }
}

// ───────── Context ─────────
type AppValue = {
  PARENT: typeof PARENT;
  CURRENT_FAMILY: typeof CURRENT_FAMILY;
  loc: { x: number; y: number; label: string; updated: string };
  sending: boolean;
  lastSent: string;
  alerts: Alert[];
  emergency: Emergency;
  triggerEmergency: () => string;
  ackEmergency: () => void;
  chat: ChatMsg[];
  sendChat: (text: string) => void;
  members: Member[];
  mappings: Mapping[];
  addMapping: (p: Member, f: Member, relation?: string) => void;
  removeMapping: (id: string) => void;
  isMapped: (parentId: string, familyId: string) => boolean;
  sendHistory: SendRecord[];
  pushSend: (r: { channel: string; count: number; text?: string }) => void;
  pendingInvite: Invite;
  createInvite: (parentName: string, parentPhone: string, relation: string, channel?: "문자" | "QR") => NonNullable<Invite>;
  matchInvite: () => void;
  clearInvite: () => void;
  sentRequests: SentRequest[];
  cancelSentRequest: (id: string) => void;
  resendSentRequest: (id: string) => void;
  incomingRequests: IncomingRequest[];
  acceptIncoming: (id: string) => void;
  declineIncoming: (id: string) => void;
  toasts: Toast[];
  pushToast: (msg: string, kind?: "info" | "error") => void;
};

const AppCtx = createContext<AppValue | null>(null);
export const useApp = () => {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loc, setLoc] = useState({ x: 46, y: 52, label: "행복동 7길 · 한빛공원 근처", updated: nowHM() });
  const [sending] = useState(true);
  const [lastSent, setLastSent] = useState("방금 전");

  const [alerts, setAlerts] = useState<Alert[]>([
    { id: 1, type: "location", text: "위치가 갱신되었습니다", time: "14:18" },
  ]);
  const [emergency, setEmergency] = useState<Emergency>(null);

  const [chat, setChat] = useState<ChatMsg[]>(SEED_CHAT);
  const [members, setMembers] = useState<Member[]>(SEED_MEMBERS);
  const [mappings, setMappings] = useState<Mapping[]>(SEED_MAPPINGS);
  const [sendHistory, setSendHistory] = useState<SendRecord[]>(SEED_HISTORY);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(100);

  const pushToast = useCallback((msg: string, kind: "info" | "error" = "info") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  // parent gently moves (live feel)
  useEffect(() => {
    const iv = setInterval(() => {
      setLoc((p) => {
        const nx = Math.max(28, Math.min(70, p.x + (Math.random() - 0.5) * 5));
        const ny = Math.max(30, Math.min(70, p.y + (Math.random() - 0.5) * 5));
        return { ...p, x: nx, y: ny, updated: nowHM() };
      });
      setLastSent("방금 전");
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  const triggerEmergency = useCallback(() => {
    const time = nowHM();
    setEmergency({ time });
    setAlerts((a) => [{ id: Date.now(), type: "emergency", text: PARENT.name + "님이 긴급 알림을 보냈습니다", time }, ...a]);
    playChime();
    return time;
  }, []);

  const ackEmergency = useCallback(() => setEmergency(null), []);

  const sendChat = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    const time = nowHM();
    setChat((c) => [...c, { id: Date.now(), sender: "나", me: true, text: t, time }]);
    setTimeout(() => {
      setChat((c) => [...c, { id: Date.now() + 1, sender: "이준호", me: false, text: "확인했어요, 고마워요!", time: nowHM() }]);
    }, 1600);
  }, []);

  // ── mapping management (F-013) ──
  const isMapped = useCallback(
    (parentId: string, familyId: string) => mappings.some((m) => m.parentId === parentId && m.familyId === familyId),
    [mappings],
  );

  const addMapping = useCallback((p: Member, f: Member, relation?: string) => {
    const rec: Mapping = {
      id: "MP-" + Date.now(), parentId: p.id, parentName: p.name, parentPhone: p.phone,
      familyId: f.id, familyName: f.name, relation: relation || "가족", status: "활성", created: todayStr(),
    };
    setMappings((prev) => [rec, ...prev]);
    setMembers((ms) => ms.map((mm) => (mm.id === f.id ? { ...mm, mapped: p.name + " (부모)", status: "활성" } : mm)));
  }, []);

  const removeMapping = useCallback((id: string) => {
    setMappings((prev) => {
      const removed = prev.find((m) => m.id === id);
      const next = prev.filter((m) => m.id !== id);
      if (removed) {
        const still = next.some((m) => m.familyId === removed.familyId);
        if (!still) setMembers((ms) => ms.map((mm) => (mm.id === removed.familyId ? { ...mm, mapped: "(미매핑)", status: "대기" } : mm)));
      }
      return next;
    });
  }, []);

  const pushSend = useCallback(({ channel, count, text }: { channel: string; count: number; text?: string }) => {
    setSendHistory((h) => [{ id: "S-" + Date.now(), dt: nowDT(), channel, target: count, text: text || "", success: count, fail: 0 }, ...h]);
  }, []);

  // ── 매칭 요청(초대) / 자동 매칭 ──
  const [pendingInvite, setPendingInvite] = useState<Invite>(null);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([
    { id: "RQ-2001", parentName: "이영자", parentPhone: "010-7000-1234", relation: "어머니", channel: "문자", registered: false, status: "대기", sentAt: "2026-06-09 09:40" },
    { id: "RQ-2000", parentName: "박정호", parentPhone: "010-7781-3345", relation: "아버지", channel: "QR", registered: true, status: "연결됨", sentAt: "2026-06-08 18:12" },
  ]);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([
    { id: "IN-3001", familyName: "이지영", relation: "딸", sentAt: "방금 전" },
  ]);

  const createInvite = useCallback((parentName: string, parentPhone: string, relation: string, channel: "문자" | "QR" = "문자") => {
    const registered = members.some((m) => m.role === "부모" && m.phone === parentPhone);
    const token = Math.random().toString(36).slice(2, 8).toUpperCase();
    const inv = {
      token, url: "ansim.kr/i/" + token,
      parentName, parentPhone, relation,
      familyName: CURRENT_FAMILY.name, familyId: CURRENT_FAMILY.id,
      registered, status: "sent",
    };
    setPendingInvite(inv);
    setSentRequests((rs) => [
      { id: "RQ-" + Date.now(), parentName, parentPhone, relation, channel, registered, status: "대기", sentAt: nowDT() },
      ...rs.filter((r) => r.parentPhone !== parentPhone),
    ]);
    return inv;
  }, [members]);

  const cancelSentRequest = useCallback((id: string) => {
    setSentRequests((rs) => rs.filter((r) => r.id !== id));
  }, []);

  const resendSentRequest = useCallback((id: string) => {
    setSentRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status: "대기", sentAt: nowDT() } : r)));
  }, []);

  const acceptIncoming = useCallback((id: string) => {
    setIncomingRequests((rs) => rs.filter((r) => r.id !== id));
  }, []);

  const declineIncoming = useCallback((id: string) => {
    setIncomingRequests((rs) => rs.filter((r) => r.id !== id));
  }, []);

  const matchInvite = useCallback(() => {
    setPendingInvite((inv) => {
      if (!inv) return inv;
      let parentId: string;
      const existing = members.find((m) => m.phone === inv.parentPhone);
      if (!existing) {
        parentId = "M-" + Date.now();
        const nm: Member = { id: parentId, name: inv.parentName, phone: inv.parentPhone, role: "부모", mapped: inv.familyName + " (가족)", status: "활성" };
        setMembers((ms) => [nm, ...ms]);
      } else {
        parentId = existing.id;
        setMembers((ms) => ms.map((m) => (m.id === parentId
          ? { ...m, status: "활성", mapped: m.mapped.includes("미매핑") ? inv.familyName + " (가족)" : m.mapped }
          : m)));
      }
      setMappings((mps) => (mps.some((x) => x.parentId === parentId && x.familyId === inv.familyId)
        ? mps
        : [{ id: "MP-" + Date.now(), parentId, parentName: inv.parentName, parentPhone: inv.parentPhone, familyId: inv.familyId, familyName: inv.familyName, relation: inv.relation, status: "활성", created: todayStr() }, ...mps]));
      setSentRequests((rs) => rs.map((r) => (r.parentPhone === inv.parentPhone ? { ...r, status: "연결됨", registered: true } : r)));
      return { ...inv, status: "matched" };
    });
  }, [members]);

  const clearInvite = useCallback(() => setPendingInvite(null), []);

  const value: AppValue = {
    PARENT, CURRENT_FAMILY,
    loc, sending, lastSent,
    alerts, emergency, triggerEmergency, ackEmergency,
    chat, sendChat,
    members,
    mappings, addMapping, removeMapping, isMapped,
    sendHistory, pushSend,
    pendingInvite, createInvite, matchInvite, clearInvite,
    sentRequests, cancelSentRequest, resendSentRequest,
    incomingRequests, acceptIncoming, declineIncoming,
    toasts, pushToast,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
