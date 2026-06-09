"use client";
// SignupScreen.tsx — SCR-001b 회원가입 + AuthFlow (로그인 ↔ 가입 ↔ Google)
import React, { useState } from "react";
import { useApp, type Invite } from "@/state/AppState";
import { Icon } from "@/components/Icon";
import { SAFE_TOP, SAFE_BOTTOM, AuthDivider, GoogleButton, Field, GoogleAuthSheet } from "@/components/auth-ui";
import { LoginScreen, type Role } from "./LoginScreen";
import { googleEnabled, startGoogleLogin } from "@/lib/api";

export function SignupScreen({ onLogin, onSwitch, onGoogle, invite }: {
  onLogin: (role: Role) => void;
  onSwitch?: () => void;
  onGoogle?: (role: Role) => void;
  invite?: NonNullable<Invite>;
}) {
  const { pushToast } = useApp();
  const [role, setRole] = useState<Role>(invite ? "parent" : "family");
  const [form, setForm] = useState({ name: invite ? invite.parentName : "", email: "", pw: "", pw2: "" });
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errs, setErrs] = useState<{ name?: string; email?: string; pw?: string; pw2?: string; agree?: string }>({});

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const er: typeof errs = {};
    if (!form.name.trim()) er.name = "이름을 입력해주세요";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) er.email = "올바른 이메일 형식이 아니에요";
    if (form.pw.length < 8) er.pw = "비밀번호는 8자 이상이어야 해요";
    if (form.pw2 !== form.pw) er.pw2 = "비밀번호가 일치하지 않아요";
    if (!agree) er.agree = "필수 약관에 동의해주세요";
    setErrs(er);
    return Object.keys(er).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      pushToast(invite ? "가입 완료 — 가족과 자동 연결되었어요" : "회원가입이 완료되었어요");
      onLogin(role);
    }, 900);
  };

  const roleOptions: { key: Role; label: string; desc: string; icon: string }[] = [
    { key: "parent", label: "부모님", desc: "위치 제공자", icon: "heart" },
    { key: "family", label: "가족", desc: "위치 확인 회원", icon: "users" },
  ];

  return (
    <div className="thin-scroll" style={{ minHeight: "100%", background: "#fff", padding: `${SAFE_TOP + 16}px 28px ${SAFE_BOTTOM + 24}px`, display: "flex", flexDirection: "column" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        {onSwitch && (
          <button onClick={onSwitch} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, marginLeft: -4, color: "var(--gray-700)", display: "grid", placeItems: "center" }}>
            <Icon name="chevron-left" size={26} />
          </button>
        )}
        <div>
          <div className="t-h1" style={{ color: "var(--gray-900)", fontSize: 22 }}>회원가입</div>
          <div className="t-caption" style={{ color: "var(--gray-500)" }}>안심연결 가족 계정 만들기</div>
        </div>
      </div>

      {/* 초대 안내 문구 (미가입 부모님 자동 매칭 안내) */}
      {invite && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 16px", marginBottom: 18, background: "var(--primary-100)", borderRadius: 14, border: "1px solid #bfdbfe" }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--primary-500)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Icon name="link" size={16} color="#fff" />
          </div>
          <div className="t-caption" style={{ color: "var(--primary-600)", lineHeight: "20px" }}>
            <b>{invite.familyName}</b>님이 가족 연결을 요청했어요.<br />
            회원가입을 완료하면 <b>{invite.familyName}</b>님과 <b>자동으로 연결</b>됩니다.
          </div>
        </div>
      )}

      {/* Google first */}
      {onGoogle && <GoogleButton label="Google 계정으로 가입하기" onClick={() => onGoogle(role)} />}
      {onGoogle && <div style={{ height: 16 }} />}
      {onGoogle && <AuthDivider />}
      {onGoogle && <div style={{ height: 16 }} />}

      {/* role */}
      <div className="field" style={{ marginBottom: 16 }}>
        <label className="field-label">가입 유형</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {roleOptions.map((r) => {
            const on = role === r.key;
            return (
              <button key={r.key} onClick={() => setRole(r.key)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, cursor: "pointer", border: on ? "1.5px solid var(--primary-500)" : "1.5px solid var(--gray-300)", background: on ? "var(--primary-100)" : "#fff", transition: "all 150ms" }}>
                <Icon name={r.icon} size={20} color={on ? "var(--primary-600)" : "var(--gray-500)"} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: on ? "var(--primary-600)" : "var(--gray-900)" }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: "var(--gray-500)" }}>{r.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="이름" err={errs.name}>
          <input className={"input" + (errs.name ? " input-error" : "")} value={form.name} onChange={set("name")} placeholder="홍길동" />
        </Field>
        <Field label="이메일" err={errs.email}>
          <input className={"input" + (errs.email ? " input-error" : "")} type="email" value={form.email} onChange={set("email")} placeholder="name@email.com" />
        </Field>
        <Field label="비밀번호 (8자 이상)" err={errs.pw}>
          <div style={{ position: "relative" }}>
            <input className={"input" + (errs.pw ? " input-error" : "")} type={showPw ? "text" : "password"} value={form.pw} onChange={set("pw")} style={{ paddingRight: 46 }} placeholder="••••••••" />
            <button onClick={() => setShowPw((s) => !s)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, display: "grid", placeItems: "center", border: "none", background: "transparent", cursor: "pointer", color: "var(--gray-500)" }}>
              <Icon name={showPw ? "eye-off" : "eye"} size={20} />
            </button>
          </div>
        </Field>
        <Field label="비밀번호 확인" err={errs.pw2}>
          <input className={"input" + (errs.pw2 ? " input-error" : "")} type={showPw ? "text" : "password"} value={form.pw2} onChange={set("pw2")} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••••" />
        </Field>
      </div>

      {/* agreement */}
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", userSelect: "none", marginTop: 16 }}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 18, height: 18, marginTop: 1, accentColor: "var(--primary-500)", flexShrink: 0 }} />
        <span className="t-caption" style={{ color: "var(--gray-700)" }}>
          <b style={{ color: "var(--danger-500)" }}>[필수]</b> 서비스 이용약관 및 개인정보·<u>위치정보</u> 수집·이용에 동의합니다
        </span>
      </label>
      {errs.agree && <span className="t-caption" style={{ color: "var(--danger-500)", marginTop: 6, marginLeft: 28 }}>{errs.agree}</span>}

      <button className="btn btn-primary btn-block" onClick={submit} disabled={loading} style={{ marginTop: 20, height: 52 }}>
        {loading ? <span className="spinner" style={{ width: 20, height: 20 }} /> : invite ? "회원가입하고 연결하기" : "회원가입"}
      </button>

      {onSwitch && (
        <div className="t-caption" style={{ textAlign: "center", color: "var(--gray-500)", marginTop: 18 }}>
          이미 계정이 있으신가요?{" "}
          <button onClick={onSwitch} style={{ border: "none", background: "transparent", color: "var(--primary-600)", fontWeight: 700, cursor: "pointer", fontSize: 14, padding: 0 }}>로그인</button>
        </div>
      )}
    </div>
  );
}

// ───────── AuthFlow — login ↔ signup ↔ Google ─────────
export function AuthFlow({ onLogin }: { onLogin: (role: Role) => void }) {
  const { pushToast } = useApp();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [google, setGoogle] = useState<{ role: Role } | null>(null);

  const completeGoogle = () => {
    setGoogle(null);
    pushToast("Google 계정으로 연결되었어요");
    onLogin((google && google.role) || "family");
  };

  // googleEnabled면 실제 Google OAuth로 이동(가입 유형 role 전달), 아니면 시뮬레이션 시트
  const handleGoogle = (role: "parent" | "family") => {
    if (googleEnabled) { startGoogleLogin(role); return; }
    setGoogle({ role });
  };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {mode === "login" ? (
        <LoginScreen onLogin={onLogin} onSwitch={() => setMode("signup")} onGoogle={() => handleGoogle("family")} />
      ) : (
        <SignupScreen onLogin={onLogin} onSwitch={() => setMode("login")} onGoogle={(role) => handleGoogle(role === "admin" ? "family" : role)} />
      )}
      {google && <GoogleAuthSheet onClose={() => setGoogle(null)} onComplete={completeGoogle} />}
    </div>
  );
}
