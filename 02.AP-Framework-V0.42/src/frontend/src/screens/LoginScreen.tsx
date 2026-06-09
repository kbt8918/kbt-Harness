"use client";
// LoginScreen.tsx — SCR-001 로그인 (mobile)
import React, { useState } from "react";
import { useApp } from "@/state/AppState";
import { Icon } from "@/components/Icon";
import { SAFE_TOP, SAFE_BOTTOM, AuthDivider, GoogleButton } from "@/components/auth-ui";
import { api, apiEnabled, setToken, setAuthUser, ApiError } from "@/lib/api";

export type Role = "parent" | "family" | "admin";

// id/pw는 백엔드 시드 계정(login_id)과 일치 — apiEnabled 시 실제 로그인에 사용
export const DEMO_ACCOUNTS: Record<Role, { label: string; id: string; pw: string; icon: string; desc: string }> = {
  parent: { label: "부모님", id: "soonja", pw: "test1234", icon: "heart", desc: "위치 제공자" },
  family: { label: "가족", id: "jiyoung", pw: "test1234", icon: "users", desc: "위치 확인 회원" },
  admin: { label: "관리자", id: "admin", pw: "admin1234", icon: "shield", desc: "운영자" },
};

export function LoginScreen({ onLogin, onSwitch, onGoogle }: { onLogin?: (role: Role) => void; onSwitch?: () => void; onGoogle?: () => void }) {
  const { pushToast } = useApp();
  const [role, setRole] = useState<Role>("family");
  const [id, setId] = useState(DEMO_ACCOUNTS.family.id);
  const [pw, setPw] = useState(DEMO_ACCOUNTS.family.pw);
  const [showPw, setShowPw] = useState(false);
  const [auto, setAuto] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const pick = (r: Role) => {
    setRole(r);
    setId(DEMO_ACCOUNTS[r].id);
    setPw(DEMO_ACCOUNTS[r].pw);
    setErr("");
  };

  const submit = async () => {
    if (!id || !pw) { setErr("아이디와 비밀번호를 입력해주세요"); return; }
    setErr("");
    setLoading(true);

    // 백엔드 연동 시: 실제 로그인 → JWT 저장 → 응답 role로 분기
    if (apiEnabled) {
      try {
        const res = await api.login(id, pw);
        setToken(res.token);
        setAuthUser(res.user);
        setLoading(false);
        pushToast(DEMO_ACCOUNTS[res.user.role].label + " 계정으로 로그인되었어요");
        onLogin && onLogin(res.user.role);
        return;
      } catch (e) {
        setLoading(false);
        setErr(e instanceof ApiError ? e.message : "로그인에 실패했습니다");
        return;
      }
    }

    // 미연동(데모) 폴백: Mock 분기
    setTimeout(() => {
      setLoading(false);
      pushToast(DEMO_ACCOUNTS[role].label + " 계정으로 로그인되었어요");
      onLogin && onLogin(role);
    }, 850);
  };

  return (
    <div className="thin-scroll" style={{ minHeight: "100%", background: "#fff", padding: `${SAFE_TOP + 24}px 28px ${SAFE_BOTTOM + 24}px`, display: "flex", flexDirection: "column" }}>
      {/* brand */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: 24, marginBottom: 36 }}>
        <div style={{ width: 76, height: 76, borderRadius: 22, background: "var(--primary-500)", display: "grid", placeItems: "center", boxShadow: "0 10px 24px rgba(37,99,235,0.30)" }}>
          <Icon name="heart" size={40} color="#fff" stroke={2} fill="rgba(255,255,255,0.18)" />
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="t-h1" style={{ color: "var(--gray-900)" }}>안심연결</div>
          <div className="t-caption" style={{ color: "var(--gray-500)", marginTop: 4 }}>부모님 위치 확인 서비스</div>
        </div>
        <div className="t-caption" style={{ color: "var(--primary-600)", background: "var(--primary-100)", padding: "5px 12px", borderRadius: 9999, fontWeight: 600 }}>감시가 아닌, 안심으로 연결합니다</div>
      </div>

      {/* role demo chips */}
      <div style={{ marginBottom: 20 }}>
        <div className="t-micro" style={{ color: "var(--gray-500)", marginBottom: 8, fontWeight: 600 }}>체험 계정 선택 (로그인 후 역할별 자동 분기)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {(Object.entries(DEMO_ACCOUNTS) as [Role, typeof DEMO_ACCOUNTS[Role]][]).map(([key, a]) => {
            const on = role === key;
            return (
              <button
                key={key}
                onClick={() => pick(key)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 6px", borderRadius: 12, cursor: "pointer", border: on ? "1.5px solid var(--primary-500)" : "1.5px solid var(--gray-300)", background: on ? "var(--primary-100)" : "#fff", transition: "all 150ms ease-out" }}
              >
                <Icon name={a.icon} size={22} color={on ? "var(--primary-600)" : "var(--gray-500)"} />
                <span style={{ fontSize: 14, fontWeight: 700, color: on ? "var(--primary-600)" : "var(--gray-900)" }}>{a.label}</span>
                <span style={{ fontSize: 11, color: "var(--gray-500)" }}>{a.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="field">
          <label className="field-label">아이디 (이메일)</label>
          <input className="input" type="email" value={id} onChange={(e) => setId(e.target.value)} placeholder="name@email.com" />
        </div>
        <div className="field">
          <label className="field-label">비밀번호</label>
          <div style={{ position: "relative" }}>
            <input className={"input" + (err ? " input-error" : "")} type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} style={{ paddingRight: 46 }} onKeyDown={(e) => e.key === "Enter" && submit()} />
            <button onClick={() => setShowPw((s) => !s)} aria-label="비밀번호 표시" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, display: "grid", placeItems: "center", border: "none", background: "transparent", cursor: "pointer", color: "var(--gray-500)" }}>
              <Icon name={showPw ? "eye-off" : "eye"} size={20} />
            </button>
          </div>
          {err && <span className="t-caption" style={{ color: "var(--danger-500)" }}>{err}</span>}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--primary-500)" }} />
          <span className="t-caption" style={{ color: "var(--gray-700)" }}>자동 로그인</span>
        </label>

        <button className="btn btn-primary btn-block" onClick={submit} disabled={loading} style={{ marginTop: 4, height: 52 }}>
          {loading ? <span className="spinner" style={{ width: 20, height: 20 }} /> : "로그인"}
        </button>

        <AuthDivider />

        <GoogleButton label="Google 계정으로 로그인" onClick={() => onGoogle && onGoogle()} />

        <div className="t-caption" style={{ textAlign: "center", color: "var(--gray-500)", marginTop: 4 }}>
          아직 계정이 없으신가요?{" "}
          <button onClick={() => onSwitch && onSwitch()} style={{ border: "none", background: "transparent", color: "var(--primary-600)", fontWeight: 700, cursor: "pointer", fontSize: 14, padding: 0 }}>회원가입</button>
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <div className="t-micro" style={{ color: "var(--gray-300)", textAlign: "center", marginTop: 24 }}>bcryptjs 해시 검증 · 역할별 권한 분리 (F-011 / F-012)</div>
    </div>
  );
}
