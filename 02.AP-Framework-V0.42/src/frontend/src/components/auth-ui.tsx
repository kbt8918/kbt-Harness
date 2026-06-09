"use client";
// auth-ui.tsx — 로그인/회원가입 공용 작은 컴포넌트들
import React from "react";
import { Icon, GoogleG } from "./Icon";

// 모바일 세이프에어리어 (디자인 번들 screen_login.jsx 상수)
export const SAFE_TOP = 58;
export const SAFE_BOTTOM = 34;

export function GoogleButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="btn btn-secondary btn-block" style={{ height: 52, gap: 12, fontSize: 16, fontWeight: 600 }}>
      <GoogleG size={20} /> {label}
    </button>
  );
}

export function AuthDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
      <div style={{ flex: 1, height: 1, background: "var(--gray-300)" }} />
      <span className="t-micro" style={{ color: "var(--gray-500)" }}>또는</span>
      <div style={{ flex: 1, height: 1, background: "var(--gray-300)" }} />
    </div>
  );
}

export function Field({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
      {err && <span className="t-caption" style={{ color: "var(--danger-500)" }}>{err}</span>}
    </div>
  );
}

// Simulated Google account chooser (clearly marked as a demo sheet)
const GOOGLE_ACCOUNTS = [
  { name: "이지영", email: "jiyoung.lee@gmail.com", color: "#7c3aed", initial: "이" },
  { name: "김순자", email: "soonja.kim@gmail.com", color: "#16A34A", initial: "김" },
];

export function GoogleAuthSheet({ onClose, onComplete }: { onClose: () => void; onComplete: (acct: typeof GOOGLE_ACCOUNTS[number]) => void }) {
  const [phase, setPhase] = React.useState<"pick" | "connecting">("pick");
  const [chosen, setChosen] = React.useState<typeof GOOGLE_ACCOUNTS[number] | null>(null);

  const choose = (acct: typeof GOOGLE_ACCOUNTS[number]) => {
    setChosen(acct);
    setPhase("connecting");
    setTimeout(() => onComplete(acct), 1100);
  };

  return (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: 60, background: "rgba(17,24,39,0.45)",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        animation: "fadein 200ms ease-out",
      }}
      onClick={phase === "pick" ? onClose : undefined}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: `20px 20px ${SAFE_BOTTOM + 16}px`, animation: "sheetup 280ms cubic-bezier(0.16,1,0.3,1)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 14, borderBottom: "1px solid var(--gray-100)" }}>
          <GoogleG size={22} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-900)" }}>Google 계정으로 계속</div>
            <div className="t-micro" style={{ color: "var(--gray-500)" }}>안심연결(으)로 로그인</div>
          </div>
          {phase === "pick" && (
            <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--gray-500)", padding: 4 }}>
              <Icon name="x" size={20} />
            </button>
          )}
        </div>

        {phase === "pick" ? (
          <div style={{ paddingTop: 8 }}>
            <div className="t-caption" style={{ color: "var(--gray-500)", padding: "8px 4px 6px" }}>계정 선택</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {GOOGLE_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  onClick={() => choose(a)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 8px", border: "none", background: "transparent", cursor: "pointer", borderRadius: 10, textAlign: "left" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--gray-50)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: a.color, color: "#fff", display: "grid", placeItems: "center", fontSize: 17, fontWeight: 700 }}>{a.initial}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--gray-900)" }}>{a.name}</div>
                    <div className="t-caption" style={{ color: "var(--gray-500)" }}>{a.email}</div>
                  </div>
                </button>
              ))}
              <button
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 8px", border: "none", background: "transparent", cursor: "pointer", borderRadius: 10, textAlign: "left" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--gray-50)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid var(--gray-300)", display: "grid", placeItems: "center", color: "var(--gray-500)" }}>
                  <Icon name="users" size={20} color="var(--gray-500)" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--gray-700)" }}>다른 계정 사용</div>
              </button>
            </div>
            <div className="t-micro" style={{ color: "var(--gray-300)", textAlign: "center", marginTop: 12 }}>체험용 시뮬레이션 화면입니다 (OAuth 2.0)</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "34px 0 26px" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: chosen!.color, color: "#fff", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 700 }}>{chosen!.initial}</div>
            <div className="spinner" style={{ width: 26, height: 26, borderColor: "var(--gray-300)", borderTopColor: "var(--primary-500)" }} />
            <div className="t-caption" style={{ color: "var(--gray-700)" }}>{chosen!.email} 로 연결 중…</div>
          </div>
        )}
      </div>
    </div>
  );
}
