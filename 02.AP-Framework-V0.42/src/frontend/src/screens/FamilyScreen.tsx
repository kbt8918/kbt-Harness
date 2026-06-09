"use client";
// FamilyScreen.tsx — SCR-003 가족 화면(안심맵 위치 지도) + SCR-004 채팅 (mobile)
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useApp, type Mapping } from "@/state/AppState";
import { Icon } from "@/components/Icon";
import { SAFE_TOP, SAFE_BOTTOM } from "@/components/auth-ui";
import { InviteFlow } from "./InviteFlow";
import { FamilySettings, MovementHistory, RequestList } from "./family-extra";
import { api, apiEnabled, getAuthUser } from "@/lib/api";

const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const LOC_SPOTS = [
  { x: 46, y: 50, label: "행복동 7길 · 한빛공원 근처" },
  { x: 62, y: 38, label: "행복동 2길 · 전통시장 입구" },
  { x: 33, y: 62, label: "행복동 11길 · 경로당 앞" },
  { x: 70, y: 60, label: "행복동 5길 · 버스정류장" },
];
const SEED_BATTERY = [78, 64, 92, 47];

type Marker = { id: string; name: string; relation: string; x: number; y: number; focused: boolean };
type ParentLite = { id: string; name: string; relation: string; phone: string };
type LocState = { x: number; y: number; label: string; battery: number; lastSync: number };

function relTime(lastSync: number, now: number) {
  const s = Math.max(0, Math.floor((now - lastSync) / 1000));
  if (s < 5) return "방금 전";
  if (s < 60) return s + "초 전";
  if (s < 3600) return Math.floor(s / 60) + "분 전";
  return Math.floor(s / 3600) + "시간 전";
}
function batColor(b: number) { return b < 15 ? "var(--danger-500)" : b < 30 ? "var(--warning-500)" : "var(--secondary-500)"; }
const FAM_NAVH = 78;

const glassBtn: React.CSSProperties = { width: 40, height: 40, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", display: "grid", placeItems: "center", boxShadow: "0 3px 10px rgba(0,0,0,0.14)" };

function FauxMap({ markers, flash }: { markers: Marker[]; flash: boolean }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#e9eef0" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#eef3ee 0%,#e7edef 60%,#e3ebee 100%)" }} />
      <div style={{ position: "absolute", left: -20, top: 70, width: 150, height: 130, background: "#cfe6c6", borderRadius: "44% 56% 50% 50%" }} />
      <div style={{ position: "absolute", right: 18, top: 150, width: 120, height: 100, background: "#d3e8cb", borderRadius: "52% 48% 46% 54%" }} />
      <div style={{ position: "absolute", left: 120, bottom: 150, width: 110, height: 90, background: "#cfe6c6", borderRadius: 28 }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120, background: "linear-gradient(180deg,#bfdcef,#a9cfe8)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 110, height: 26, background: "#cfe3f3", transform: "skewY(-2deg)" }} />
      <div style={{ position: "absolute", left: "-10%", top: "34%", width: "120%", height: 24, background: "#f4e9c9", transform: "rotate(-8deg)", boxShadow: "0 0 0 1px #ecdfb6" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: "58%", height: 12, background: "#fff" }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: "30%", width: 11, background: "#fff" }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, right: "26%", width: 9, background: "#fff", opacity: 0.95 }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: "20%", height: 7, background: "#fff", opacity: 0.85 }} />

      {markers.map((m) => {
        const f = m.focused;
        return (
          <div key={m.id} style={{ position: "absolute", left: m.x + "%", top: m.y + "%", transform: "translate(-50%,-100%)", transition: "left 1.2s ease-out, top 1.2s ease-out", display: "flex", flexDirection: "column", alignItems: "center", zIndex: f ? 5 : 4 }}>
            <div style={{ marginBottom: 5, background: "#fff", padding: "3px 9px", borderRadius: 9999, fontSize: 11.5, fontWeight: 700, color: "var(--gray-900)", boxShadow: "0 2px 6px rgba(0,0,0,0.18)", whiteSpace: "nowrap" }}>
              {m.name} <span style={{ color: "var(--gray-500)", fontWeight: 500 }}>({m.relation})</span>
            </div>
            <div style={{ position: "relative" }}>
              {f && <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 58, height: 58, borderRadius: "50%", background: "rgba(22,163,74,0.22)", animation: flash ? "ping 1s ease-out infinite" : "ping 2.6s ease-out infinite" }} />}
              <div style={{ position: "relative", width: f ? 46 : 38, height: f ? 46 : 38, borderRadius: "50%", background: f ? "var(--secondary-500)" : "var(--gray-500)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: f ? 18 : 15, border: "3px solid #fff", boxShadow: "0 4px 10px rgba(0,0,0,0.3)" }}>{m.name[0]}</div>
              <div style={{ position: "absolute", left: "50%", bottom: -5, transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "7px solid #fff" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChatView({ onBack }: { onBack: () => void }) {
  const { chat, sendChat } = useApp();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [chat.length]);
  const send = () => { if (!text.trim()) return; sendChat(text); setText(""); };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--gray-50)" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid var(--gray-300)", display: "flex", alignItems: "center", gap: 6, padding: `${SAFE_TOP}px 12px 12px` }}>
        <button onClick={onBack} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 6, color: "var(--gray-700)", display: "grid", placeItems: "center" }}>
          <Icon name="chevron-left" size={26} />
        </button>
        <div style={{ flex: 1 }}>
          <div className="t-h2" style={{ fontSize: 18, color: "var(--gray-900)" }}>가족 채팅방</div>
          <div className="t-micro" style={{ color: "var(--gray-500)" }}>이가족 · 참여자 3</div>
        </div>
        <span className="badge badge-gray"><Icon name="users" size={13} /> 3</span>
      </div>

      <div ref={listRef} className="thin-scroll" style={{ flex: 1, overflow: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ textAlign: "center", margin: "2px 0 6px" }}>
          <span className="t-micro" style={{ color: "var(--gray-500)", background: "var(--gray-100)", padding: "4px 10px", borderRadius: 9999 }}>오늘</span>
        </div>
        {chat.map((m) => (
          <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: m.me ? "flex-end" : "flex-start", gap: 3 }}>
            {!m.me && <span className="t-micro" style={{ color: "var(--gray-500)", marginLeft: 4 }}>{m.sender}</span>}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flexDirection: m.me ? "row-reverse" : "row", maxWidth: "82%" }}>
              <div style={{ padding: "10px 13px", fontSize: 15, lineHeight: "21px", background: m.me ? "var(--primary-100)" : "#fff", color: "var(--gray-900)", borderRadius: 14, border: m.me ? "none" : "1px solid var(--gray-300)", borderTopRightRadius: m.me ? 4 : 14, borderTopLeftRadius: m.me ? 14 : 4 }}>{m.text}</div>
              <span className="t-micro" style={{ color: "var(--gray-500)", whiteSpace: "nowrap" }}>{m.time}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: `10px 12px ${SAFE_BOTTOM + 8}px`, background: "#fff", borderTop: "1px solid var(--gray-300)", display: "flex", gap: 8, alignItems: "center" }}>
        <input className="input" value={text} placeholder="메시지를 입력하세요" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} style={{ flex: 1, height: 46, borderRadius: 23, background: "var(--gray-50)" }} />
        <button onClick={send} disabled={!text.trim()} className="btn btn-primary" style={{ width: 46, height: 46, borderRadius: 23, padding: 0, opacity: text.trim() ? 1 : 0.5 }}>
          <Icon name="send" size={20} color="#fff" />
        </button>
      </div>
    </div>
  );
}

function CallOverlay({ parent, onEnd }: { parent: ParentLite; onEnd: () => void }) {
  const [sec, setSec] = useState(0);
  useEffect(() => { const iv = setInterval(() => setSec((s) => s + 1), 1000); return () => clearInterval(iv); }, []);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 150, background: "linear-gradient(180deg,#1f2937,#111827)", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", padding: `${SAFE_TOP + 40}px 24px ${SAFE_BOTTOM + 36}px`, animation: "fadein 250ms ease-out" }}>
      <div style={{ fontSize: 15, opacity: 0.7, marginBottom: 28 }}>{sec < 2 ? "통화 연결 중…" : "통화 중"}</div>
      <div style={{ width: 108, height: 108, borderRadius: "50%", background: "var(--secondary-500)", display: "grid", placeItems: "center", fontSize: 40, fontWeight: 700, marginBottom: 18 }}>{parent.name[0]}</div>
      <div style={{ fontSize: 26, fontWeight: 700 }}>{parent.name}</div>
      <div style={{ fontSize: 16, opacity: 0.75, marginTop: 4 }}>{parent.relation} · {parent.phone}</div>
      <div className="tabular" style={{ fontSize: 17, opacity: 0.65, marginTop: 14 }}>{mm}</div>
      <div style={{ flex: 1 }} />
      <button onClick={onEnd} style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--danger-500)", border: "none", cursor: "pointer", display: "grid", placeItems: "center", boxShadow: "0 8px 20px rgba(220,38,38,0.5)" }}>
        <Icon name="phone" size={30} color="#fff" style={{ transform: "rotate(135deg)" }} />
      </button>
    </div>
  );
}

export function FamilyScreen() {
  const { PARENT, mappings, CURRENT_FAMILY, emergency, triggerEmergency, ackEmergency, pushToast, sentRequests } = useApp();
  const [tab, setTab] = useState<"map" | "history" | "chat">("map");
  const [callingParent, setCallingParent] = useState<ParentLite | null>(null);
  const [flash, setFlash] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [locDenied, setLocDenied] = useState(false);
  const waitingCount = sentRequests.filter((r) => r.status === "대기").length;
  const [focusId, setFocusId] = useState<string | null>(null);
  const [locs, setLocs] = useState<Record<string, LocState>>({});
  const [now, setNow] = useState(Date.now());

  // 현재 가족에 연결된 모든 부모님
  const parents = useMemo<ParentLite[]>(() => {
    const seen = new Set<string>();
    const out: ParentLite[] = [];
    mappings.filter((m: Mapping) => m.familyId === CURRENT_FAMILY.id).forEach((m) => {
      if (seen.has(m.parentId)) return;
      seen.add(m.parentId);
      out.push({ id: m.parentId, name: m.parentName, relation: m.relation, phone: m.parentPhone });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappings]);

  useEffect(() => {
    setLocs((prev) => {
      const next = { ...prev };
      parents.forEach((p, i) => {
        if (!next[p.id]) next[p.id] = { ...LOC_SPOTS[i % LOC_SPOTS.length], battery: SEED_BATTERY[i % SEED_BATTERY.length], lastSync: Date.now() - (i * 11 + 6) * 1000 };
      });
      return next;
    });
  }, [parents]);

  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setLocs((prev) => {
        const next: Record<string, LocState> = {};
        Object.keys(prev).forEach((k) => {
          const p = prev[k];
          next[k] = { ...p, x: clampN(p.x + (Math.random() - 0.5) * 5, 22, 74), y: clampN(p.y + (Math.random() - 0.5) * 4, 24, 60), battery: Math.max(8, p.battery - (Math.random() < 0.25 ? 1 : 0)) };
        });
        return next;
      });
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  const effFocus = (focusId && parents.some((p) => p.id === focusId)) ? focusId : (parents[0] && parents[0].id);
  const markers: Marker[] = parents.map((p) => ({
    id: p.id, name: p.name, relation: p.relation,
    x: locs[p.id]?.x ?? 50, y: locs[p.id]?.y ?? 50,
    focused: p.id === effFocus,
  }));

  const focusOn = (id: string) => {
    setFocusId(id);
    setFlash(true);
    setLocs((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], lastSync: Date.now() } } : prev));
    setTimeout(() => setFlash(false), 2400);
  };
  const onSOS = () => { triggerEmergency(); pushToast("SOS 수신 — 긴급 알림이 도착했습니다"); };

  // ── 백엔드 연동: 가족 로그인 시 긴급알림 폴링 + 위치 갱신시각 동기화 ──
  const isBackendFamily = apiEnabled && getAuthUser()?.role === "family";
  const lastAlertRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isBackendFamily) return;
    let alive = true;
    const poll = async () => {
      try {
        const { alerts } = await api.recentAlerts();
        if (!alive || alerts.length === 0) return;
        const latest = alerts[0];
        if (lastAlertRef.current && lastAlertRef.current !== latest.id && !emergency) {
          triggerEmergency();
          pushToast("SOS 수신 — 긴급 알림이 도착했습니다");
        }
        lastAlertRef.current = latest.id;
      } catch { /* 폴링 실패 무시 */ }
    };
    poll();
    const iv = setInterval(poll, 8000);
    return () => { alive = false; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBackendFamily, emergency]);

  // 바로전화: 백엔드에서 실제 번호 조회 후 통화 오버레이(번호 갱신)
  // 단, 부모 id가 백엔드 UUID일 때만 조회(Mock 시드 id면 Mock 번호 유지).
  const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  const callParent = async (p: ParentLite) => {
    setCallingParent(p);
    if (isBackendFamily && isUuid(p.id)) {
      try {
        const { phone } = await api.parentPhone(p.id);
        setCallingParent((cur) => (cur && cur.id === p.id ? { ...cur, phone } : cur));
      } catch { /* 매핑/번호 없음 — Mock 번호 유지 */ }
    }
  };

  // ── 채팅 탭 ──
  if (tab === "chat") {
    return (
      <div style={{ height: "100%", position: "relative", background: "var(--gray-50)" }}>
        <ChatView onBack={() => setTab("map")} />
      </div>
    );
  }

  const navItem = (key: "map" | "history" | "chat", icon: string, label: string) => {
    const on = tab === key;
    return (
      <button onClick={() => setTab(key)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 0", border: "none", background: "transparent", cursor: "pointer", fontFamily: "var(--font-sans)", color: on ? "var(--secondary-500)" : "var(--gray-500)" }}>
        <Icon name={icon} size={22} color={on ? "var(--secondary-500)" : "var(--gray-500)"} stroke={on ? 2.2 : 1.8} />
        <span style={{ fontSize: 11, fontWeight: on ? 700 : 500 }}>{label}</span>
      </button>
    );
  };

  return (
    <div style={{ height: "100%", position: "relative", background: "var(--gray-50)", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: FAM_NAVH }}>
        {tab === "history" ? (
          <MovementHistory parents={parents} focusId={effFocus} onFocus={focusOn} />
        ) : (
          <>
            <FauxMap markers={markers} flash={flash} />

            {/* 위치 권한 거부 상태 */}
            {locDenied && (
              <div style={{ position: "absolute", inset: 0, zIndex: 20, background: "rgba(249,250,251,0.96)", backdropFilter: "blur(2px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "40px 32px", textAlign: "center", animation: "fadein 200ms ease-out" }}>
                <div style={{ width: 84, height: 84, borderRadius: "50%", background: "var(--danger-100, #fee2e2)", display: "grid", placeItems: "center" }}>
                  <Icon name="map-pin" size={40} color="var(--danger-500)" />
                </div>
                <div style={{ fontSize: 19, fontWeight: 800, color: "var(--gray-900)" }}>위치 권한이 꺼져 있어요</div>
                <div style={{ fontSize: 14, color: "var(--gray-700)", lineHeight: 1.5, maxWidth: 280 }}>
                  부모님 위치를 보려면 기기 설정에서<br />위치 접근을 허용해 주세요.
                </div>
                <button onClick={() => { setLocDenied(false); pushToast("위치 권한이 허용되었습니다"); }} className="btn btn-primary" style={{ height: 48, padding: "0 22px", marginTop: 4 }}>
                  <Icon name="check" size={18} color="#fff" /> 위치 권한 허용
                </button>
              </div>
            )}

            {/* 연결된 부모님 없음 (빈 상태) */}
            {!locDenied && parents.length === 0 && (
              <div style={{ position: "absolute", left: 16, right: 16, top: "50%", transform: "translateY(-50%)", zIndex: 8, background: "#fff", borderRadius: 18, padding: "28px 22px", boxShadow: "0 10px 30px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center", animation: "pop 320ms ease-out" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--secondary-100)", display: "grid", placeItems: "center" }}>
                  <Icon name="users" size={34} color="var(--secondary-500)" />
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--gray-900)" }}>아직 연결된 부모님이 없어요</div>
                <div style={{ fontSize: 14, color: "var(--gray-700)", lineHeight: 1.5 }}>부모님께 문자나 QR로 연결을 요청하면<br />위치를 함께 확인할 수 있어요.</div>
                <button onClick={() => setInviteOpen(true)} className="btn btn-primary" style={{ height: 48, padding: "0 22px", marginTop: 4 }}>
                  <Icon name="plus" size={18} color="#fff" /> 부모님 매칭 요청 보내기
                </button>
              </div>
            )}

            {/* 상단 바 (플로팅) */}
            <div style={{ position: "absolute", top: SAFE_TOP - 6, left: 14, right: 14, display: "flex", alignItems: "flex-start", justifyContent: "space-between", zIndex: 10 }}>
              <button onClick={() => setLocDenied((v) => !v)} title="위치 권한 상태 전환(시연)" style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", padding: "8px 14px 8px 10px", borderRadius: 9999, boxShadow: "0 3px 10px rgba(0,0,0,0.12)", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: locDenied ? "var(--danger-500)" : "var(--secondary-500)", display: "grid", placeItems: "center" }}>
                  <Icon name="shield" size={16} color="#fff" />
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--gray-900)" }}>안심맵</span>
              </button>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                <button onClick={() => setSettingsOpen(true)} style={glassBtn}>
                  <Icon name="settings" size={20} color="var(--gray-700)" />
                </button>
                <button onClick={() => setRequestsOpen(true)} style={{ ...glassBtn, position: "relative" }}>
                  <Icon name="mail" size={19} color="var(--gray-700)" />
                  {waitingCount > 0 && (
                    <span style={{ position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, padding: "0 4px", borderRadius: 9999, background: "var(--danger-500)", color: "#fff", fontSize: 11, fontWeight: 800, display: "grid", placeItems: "center", border: "2px solid #fff" }}>{waitingCount}</span>
                  )}
                </button>
                <button onClick={() => pushToast("연결된 부모님 모두 안심 상태입니다")} style={glassBtn}>
                  <Icon name="shield" size={19} color="var(--secondary-500)" />
                </button>
              </div>
            </div>

            {/* 긴급(SOS) 영역 */}
            <div style={{ position: "absolute", left: 14, right: 14, bottom: 188, zIndex: 9, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
              {emergency ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--danger-500)", color: "#fff", padding: "11px 14px", borderRadius: 14, boxShadow: "0 6px 16px rgba(220,38,38,0.4)", animation: "slidedown 250ms ease-out", width: "100%" }}>
                  <Icon name="alert-triangle" size={20} color="#fff" stroke={2.3} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>SOS 긴급 알림 수신</div>
                    <div style={{ fontSize: 12, opacity: 0.9 }}>{PARENT.name}님 · {emergency.time}</div>
                  </div>
                  <button onClick={() => { const em = parents.find((p) => p.name === PARENT.name) || parents[0]; em && focusOn(em.id); }} style={{ background: "rgba(255,255,255,0.22)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, padding: "7px 11px", borderRadius: 9, cursor: "pointer" }}>위치보기</button>
                  <button onClick={ackEmergency} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: 2 }}><Icon name="x" size={18} color="#fff" /></button>
                </div>
              ) : (
                <button onClick={onSOS} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--danger-500)", color: "#fff", padding: "10px 16px", borderRadius: 9999, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 14, boxShadow: "0 6px 16px rgba(220,38,38,0.38)" }}>
                  <Icon name="alert-triangle" size={18} color="#fff" stroke={2.3} /> SOS 수신 미리보기
                </button>
              )}
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-700)", background: "rgba(255,255,255,0.85)", padding: "3px 10px", borderRadius: 9999, backdropFilter: "blur(4px)" }}>
                부모님 {parents.length}명 확인 중 · Free 2명까지
              </div>
            </div>

            {/* 하단 부모님 카드 캐러셀 */}
            <div className="thin-scroll" style={{ position: "absolute", left: 0, right: 0, bottom: 14, display: "flex", gap: 12, padding: "0 14px", overflowX: "auto", zIndex: 9, scrollSnapType: "x mandatory" }}>
              {parents.map((p) => {
                const pl = locs[p.id] || ({} as Partial<LocState>);
                const on = p.id === effFocus;
                return (
                  <div key={p.id} onClick={() => focusOn(p.id)} style={{ flexShrink: 0, width: 270, scrollSnapAlign: "start", background: "#fff", borderRadius: 16, padding: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.16)", cursor: "pointer", border: on ? "2px solid var(--secondary-500)" : "2px solid transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--secondary-100)", display: "grid", placeItems: "center", color: "var(--secondary-500)", fontWeight: 800, fontSize: 17, flexShrink: 0 }}>{p.name[0]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-900)" }}>{p.name} <span style={{ fontWeight: 500, color: "var(--gray-500)", fontSize: 13 }}>({p.relation})</span></div>
                        <div style={{ fontSize: 12, color: "var(--gray-500)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pl.label || "위치 확인 중"}</div>
                      </div>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--secondary-500)" }}>
                        <span className="dot dot-green dot-pulse" style={{ color: "var(--secondary-500)" }} /> 실시간
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, flex: 1, background: "var(--gray-50)", padding: "7px 10px", borderRadius: 9, fontSize: 12, fontWeight: 600, color: "var(--gray-700)" }}>
                        <Icon name="battery" size={15} color={batColor(pl.battery ?? 80)} /> 배터리 {pl.battery ?? "-"}%
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, flex: 1, background: "var(--gray-50)", padding: "7px 10px", borderRadius: 9, fontSize: 12, fontWeight: 600, color: "var(--gray-700)" }}>
                        <Icon name="clock" size={15} color="var(--gray-500)" /> {relTime(pl.lastSync || now, now)} 갱신
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); callParent(p); }} style={{ width: 38, height: 38, borderRadius: 10, background: "var(--secondary-500)", border: "none", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <Icon name="phone" size={17} color="#fff" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {/* 초대 카드 */}
              <button onClick={() => setInviteOpen(true)} style={{ flexShrink: 0, width: 150, scrollSnapAlign: "start", background: "rgba(255,255,255,0.92)", borderRadius: 16, padding: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", cursor: "pointer", border: "2px dashed var(--secondary-500)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--secondary-100)", display: "grid", placeItems: "center" }}>
                  <Icon name="plus" size={20} color="var(--secondary-500)" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--secondary-500)", textAlign: "center" }}>부모님<br />매칭 요청</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* 하단 탭바 */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: FAM_NAVH, background: "#fff", borderTop: "1px solid var(--gray-300)", display: "flex", alignItems: "flex-start", paddingTop: 4, paddingBottom: SAFE_BOTTOM, zIndex: 12 }}>
        {navItem("map", "map-pin", "지도")}
        {navItem("history", "route", "이동 기록")}
        {navItem("chat", "message-circle", "채팅")}
      </div>

      {callingParent && <CallOverlay parent={callingParent} onEnd={() => setCallingParent(null)} />}
      {inviteOpen && <InviteFlow onClose={() => setInviteOpen(false)} />}
      {requestsOpen && <RequestList onClose={() => setRequestsOpen(false)} onInvite={() => { setRequestsOpen(false); setInviteOpen(true); }} />}
      {settingsOpen && <FamilySettings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
