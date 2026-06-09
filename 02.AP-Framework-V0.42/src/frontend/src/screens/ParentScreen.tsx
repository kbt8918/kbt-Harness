"use client";
// ParentScreen.tsx — SCR-002 부모님 화면 (고령자 UI, mobile)
import React, { useState } from "react";
import { useApp } from "@/state/AppState";
import { Icon } from "@/components/Icon";
import { SAFE_TOP, SAFE_BOTTOM } from "@/components/auth-ui";
import { api, apiEnabled, getAuthUser } from "@/lib/api";

// 백엔드 긴급알림 발송 (부모로 로그인된 경우에만). 위치는 브라우저 Geolocation, 실패 시 좌표 없이 발송.
function backendEmergency() {
  if (!apiEnabled) return;
  const u = getAuthUser();
  if (!u || u.role !== "parent") return;
  const fire = (lat?: number, lng?: number) => { api.sendEmergency(lat, lng).catch(() => { /* Mock 흐름 유지 */ }); };
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => fire(pos.coords.latitude, pos.coords.longitude),
      () => fire(),
      { timeout: 3000 },
    );
  } else { fire(); }
}

export function ParentScreen() {
  const { PARENT, sending, lastSent, triggerEmergency, incomingRequests, acceptIncoming, declineIncoming, pushToast } = useApp();
  const [phase, setPhase] = useState<"idle" | "sending" | "sent">("idle");
  const [sentAt, setSentAt] = useState("");

  const press = () => {
    if (phase !== "idle") return; // 중복 연타 디바운스 (F-002)
    setPhase("sending");
    backendEmergency(); // 백엔드 연동(부모 로그인 시), 데모는 Mock만
    setTimeout(() => {
      const t = triggerEmergency();
      setSentAt(t);
      setPhase("sent");
    }, 700);
  };

  return (
    <div style={{ minHeight: "100%", background: "var(--gray-50)", padding: `${SAFE_TOP + 20}px 24px ${SAFE_BOTTOM + 20}px`, display: "flex", flexDirection: "column", gap: 48 }}>
      {/* greeting + reassurance */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="t-senior-greeting" style={{ color: "var(--gray-900)" }}>
          안녕하세요,<br />{PARENT.name}님
        </div>
        <div className="t-senior-message" style={{ color: "var(--gray-700)" }}>
          위치가 가족에게<br />안전하게 전달되고 있어요
        </div>
      </div>

      {/* incoming family connection requests (가족 연결 요청 도착) */}
      {incomingRequests.map((req) => (
        <div key={req.id} className="card" style={{ borderRadius: 18, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16, background: "var(--primary-100)", border: "2px solid var(--primary-500)", animation: "pop 350ms ease-out" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--primary-500)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Icon name="users" size={28} color="#fff" stroke={2.2} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "var(--gray-900)", lineHeight: 1.25 }}>
                {req.familyName}({req.relation})님이<br />연결을 요청했어요
              </span>
              <span style={{ fontSize: 16, color: "var(--gray-700)" }}>수락하면 위치를 함께 볼 수 있어요</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => { acceptIncoming(req.id); pushToast(req.familyName + "님과 연결되었어요"); }}
              className="btn btn-primary"
              style={{ flex: 2, height: 64, fontSize: 21, borderRadius: 16, gap: 8 }}
            >
              <Icon name="check" size={26} color="#fff" stroke={2.6} /> 수락
            </button>
            <button
              onClick={() => declineIncoming(req.id)}
              className="btn btn-secondary"
              style={{ flex: 1, height: 64, fontSize: 19, borderRadius: 16, color: "var(--gray-700)" }}
            >
              나중에
            </button>
          </div>
        </div>
      ))}

      {/* location status card */}
      <div className="card" style={{ borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, background: "var(--secondary-100)", border: "1px solid #bbf7d0" }}>
        <div className="dot dot-green dot-pulse" style={{ width: 14, height: 14, color: "var(--secondary-500)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span className="t-senior-status" style={{ color: "var(--secondary-500)", fontWeight: 700 }}>{sending ? "위치 전송 중" : "위치 확인 불가"}</span>
          <span className="t-caption" style={{ color: "var(--gray-700)", fontSize: 16 }}>최근 전송: {lastSent}</span>
        </div>
      </div>

      {/* giant emergency button */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "center" }}>
        <button
          onClick={press}
          disabled={phase !== "idle"}
          style={{
            width: "100%", minHeight: 240, borderRadius: 28, border: "none", cursor: "pointer",
            background: phase === "idle" ? "linear-gradient(180deg, #EF4444 0%, var(--danger-500) 60%, var(--danger-600) 100%)" : "var(--danger-600)",
            color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
            boxShadow: phase === "idle" ? "0 16px 36px rgba(220,38,38,0.40), inset 0 2px 0 rgba(255,255,255,0.25)" : "0 6px 16px rgba(220,38,38,0.30)",
            transition: "transform 100ms ease-out, box-shadow 150ms", transform: phase === "sending" ? "scale(0.98)" : "scale(1)", position: "relative", overflow: "hidden",
          }}
          onMouseDown={(e) => phase === "idle" && (e.currentTarget.style.transform = "scale(0.98)")}
          onMouseUp={(e) => phase === "idle" && (e.currentTarget.style.transform = "scale(1)")}
        >
          {phase === "sending" ? (
            <>
              <span className="spinner spinner-lg" />
              <span className="t-senior-status" style={{ color: "#fff" }}>보내는 중…</span>
            </>
          ) : (
            <>
              <Icon name="alert-triangle" size={56} color="#fff" stroke={2.2} />
              <span className="t-senior-button">긴급 알림</span>
              <span style={{ fontSize: 19, fontWeight: 600, opacity: 0.92 }}>1회 누르세요</span>
            </>
          )}
        </button>
        <div className="t-senior-status" style={{ color: "var(--gray-500)", textAlign: "center" }}>가족에게 즉시 알려드려요</div>
      </div>

      {/* sent feedback overlay */}
      {phase === "sent" && (
        <div style={{ position: "absolute", inset: 0, zIndex: 45, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(2px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: `${SAFE_TOP}px 32px ${SAFE_BOTTOM}px`, animation: "fadein 250ms ease-out" }}>
          <div style={{ width: 96, height: 96, borderRadius: 9999, background: "var(--secondary-100)", display: "grid", placeItems: "center", animation: "pop 350ms ease-out" }}>
            <Icon name="check" size={52} color="var(--secondary-500)" stroke={3} />
          </div>
          <div className="t-senior-feedback" style={{ color: "var(--gray-900)", textAlign: "center" }}>
            가족에게<br />전송되었어요
          </div>
          <div className="t-senior-status" style={{ color: "var(--gray-500)" }}>{sentAt} 에 보냈어요</div>
          <button className="btn btn-primary" onClick={() => setPhase("idle")} style={{ width: "100%", height: 64, fontSize: 22, borderRadius: 16, marginTop: 12 }}>확인</button>
        </div>
      )}
    </div>
  );
}
