"use client";
// InviteFlow.tsx — 가족 → 부모님 매칭 요청 (문자/QR) + 자동 매칭
import React, { useEffect, useState } from "react";
import QRCodeLib from "qrcode";
import { useApp } from "@/state/AppState";
import { Icon } from "@/components/Icon";
import { SAFE_TOP, SAFE_BOTTOM, Field } from "@/components/auth-ui";
import { SignupScreen } from "./SignupScreen";

const INVITE_RELATIONS = ["어머니", "아버지", "할머니", "할아버지", "장모님", "장인어른", "기타"];

const INVITE_SAMPLES = [
  { label: "가입된 부모님 예시", name: "김순자", phone: "010-2345-6789", note: "이미 회원" },
  { label: "미가입 부모님 예시", name: "이영자", phone: "010-7000-1234", note: "신규" },
];

export function QRCode({ text, size = 184 }: { text: string; size?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCodeLib.toDataURL(text, { errorCorrectionLevel: "M", margin: 2, width: size * 2 })
      .then((u) => { if (alive) setUrl(u); })
      .catch(() => { if (alive) setUrl(null); });
    return () => { alive = false; };
  }, [text, size]);

  if (!url) {
    return <div style={{ width: size, height: size, display: "grid", placeItems: "center", background: "var(--gray-100)", borderRadius: 12, color: "var(--gray-500)", fontSize: 13 }}>QR 생성 중…</div>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} width={size} height={size} alt="매칭 QR 코드" style={{ borderRadius: 10, display: "block", imageRendering: "pixelated" }} />;
}

function StepHeader({ title, onBack, onClose }: { title: string; onBack?: () => void; onClose?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18 }}>
      {onBack && (
        <button onClick={onBack} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, marginLeft: -4, color: "var(--gray-700)", display: "grid", placeItems: "center" }}>
          <Icon name="chevron-left" size={26} />
        </button>
      )}
      <div className="t-h2" style={{ flex: 1, color: "var(--gray-900)", fontSize: 19 }}>{title}</div>
      {onClose && (
        <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, color: "var(--gray-500)", display: "grid", placeItems: "center" }}>
          <Icon name="x" size={22} />
        </button>
      )}
    </div>
  );
}

const methodCardStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 14, padding: "16px", borderRadius: 16, cursor: "pointer", border: "1px solid var(--gray-300)", background: "#fff", width: "100%" };
function methodIcon(bg: string): React.CSSProperties {
  return { width: 48, height: 48, borderRadius: 12, background: bg, display: "grid", placeItems: "center", flexShrink: 0 };
}

export function InviteFlow({ onClose }: { onClose: () => void }) {
  const { createInvite, matchInvite, clearInvite, pendingInvite, pushToast } = useApp();
  const [step, setStep] = useState<"form" | "method" | "sms" | "qr" | "landing" | "matched">("form");
  const [smsSent, setSmsSent] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("어머니");
  const [err, setErr] = useState("");

  const close = () => { clearInvite(); onClose(); };

  const goMethod = () => {
    if (!name.trim()) { setErr("부모님 성함을 입력해주세요"); return; }
    if (!/^01[0-9]-?\d{3,4}-?\d{4}$/.test(phone.replace(/\s/g, ""))) { setErr("올바른 휴대폰 번호를 입력해주세요"); return; }
    setErr("");
    createInvite(name.trim(), phone.trim(), relation);
    setStep("method");
  };

  const inv = pendingInvite || ({} as NonNullable<typeof pendingInvite>);
  const fullUrl = "https://" + (inv.url || "ansim.kr/i/PREVIEW");
  const smsBody = `[안심연결] ${inv.familyName}님이 가족 연결을 요청했어요. 아래 링크를 눌러 ${relation} 연결을 완료하세요 → ${fullUrl}`;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 130, background: "#fff", display: "flex", flexDirection: "column" }}>
      <div className="thin-scroll" style={{ flex: 1, overflow: "auto", padding: `${SAFE_TOP + 16}px 24px ${SAFE_BOTTOM + 20}px` }}>
        {/* STEP: 정보 입력 */}
        {step === "form" && (
          <>
            <StepHeader title="부모님 매칭 요청" onClose={close} />
            <p className="t-caption" style={{ color: "var(--gray-500)", marginTop: -8, marginBottom: 18 }}>
              부모님께 문자나 QR 코드로 연결을 요청해요. 부모님이 수락하면 자동으로 매칭됩니다.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="부모님 성함" err={err && !name ? err : ""}>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="예) 김순자" />
              </Field>
              <Field label="휴대폰 번호" err={err && name ? err : ""}>
                <input className="input tabular" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" inputMode="tel" />
              </Field>
              <Field label="나와의 관계">
                <div style={{ position: "relative" }}>
                  <select className="input" value={relation} onChange={(e) => setRelation(e.target.value)} style={{ appearance: "none", cursor: "pointer" }}>
                    {INVITE_RELATIONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                  <Icon name="chevron-down" size={18} color="var(--gray-500)" style={{ position: "absolute", right: 12, top: 15, pointerEvents: "none" }} />
                </div>
              </Field>
            </div>

            <div className="t-micro" style={{ color: "var(--gray-500)", margin: "18px 0 8px", fontWeight: 700 }}>빠른 입력 (데모)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {INVITE_SAMPLES.map((s) => (
                <button key={s.phone} onClick={() => { setName(s.name); setPhone(s.phone); setErr(""); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, cursor: "pointer", border: "1px solid var(--gray-300)", background: "#fff", textAlign: "left" }}>
                  <Icon name="heart" size={16} color="var(--gray-500)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-900)" }}>{s.name} <span className="tabular" style={{ fontWeight: 400, color: "var(--gray-500)" }}>{s.phone}</span></div>
                    <div style={{ fontSize: 11, color: "var(--gray-500)" }}>{s.label}</div>
                  </div>
                  <span className={"badge " + (s.note === "이미 회원" ? "badge-green" : "badge-amber")}>{s.note}</span>
                </button>
              ))}
            </div>

            <button className="btn btn-primary btn-block" onClick={goMethod} style={{ marginTop: 22, height: 52 }}>다음</button>
          </>
        )}

        {/* STEP: 전송 방법 선택 */}
        {step === "method" && (
          <>
            <StepHeader title="전송 방법 선택" onBack={() => setStep("form")} onClose={close} />
            <div className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12, marginBottom: 18, background: "var(--gray-50)" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--primary-100)", display: "grid", placeItems: "center", color: "var(--primary-600)", fontWeight: 700 }}>{inv.parentName ? inv.parentName[0] : "?"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-900)" }}>{inv.parentName} <span className="t-caption" style={{ color: "var(--gray-500)", fontWeight: 500 }}>· {relation}</span></div>
                <div className="t-caption tabular" style={{ color: "var(--gray-500)" }}>{inv.parentPhone}</div>
              </div>
              <span className={"badge " + (inv.registered ? "badge-green" : "badge-amber")}>{inv.registered ? "가입 회원" : "미가입"}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={() => { setSmsSent(false); setStep("sms"); }} style={methodCardStyle}>
                <div style={methodIcon("var(--primary-100)")}><Icon name="message-square" size={26} color="var(--primary-600)" /></div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--gray-900)" }}>문자로 보내기</div>
                  <div className="t-caption" style={{ color: "var(--gray-500)" }}>부모님 번호로 연결 링크를 문자 발송</div>
                </div>
                <Icon name="chevron-right" size={20} color="var(--gray-300)" />
              </button>
              <button onClick={() => setStep("qr")} style={methodCardStyle}>
                <div style={methodIcon("var(--secondary-100)")}><Icon name="navigation" size={24} color="var(--secondary-500)" /></div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--gray-900)" }}>QR 코드</div>
                  <div className="t-caption" style={{ color: "var(--gray-500)" }}>부모님이 카메라로 스캔해서 연결</div>
                </div>
                <Icon name="chevron-right" size={20} color="var(--gray-300)" />
              </button>
            </div>
          </>
        )}

        {/* STEP: 문자 */}
        {step === "sms" && (
          <>
            <StepHeader title="문자로 보내기" onBack={() => setStep("method")} onClose={close} />
            <div className="t-caption" style={{ color: "var(--gray-500)", marginBottom: 12 }}>아래 내용이 <b style={{ color: "var(--gray-900)" }} className="tabular">{inv.parentPhone}</b> 으로 발송됩니다.</div>
            <div style={{ background: "var(--gray-100)", borderRadius: 16, padding: 16 }}>
              <div style={{ background: "#fff", borderRadius: 14, borderTopLeftRadius: 4, padding: "12px 14px", fontSize: 14, lineHeight: "21px", color: "var(--gray-900)", boxShadow: "var(--shadow-sm)" }}>{smsBody}</div>
              <div className="t-micro" style={{ color: "var(--gray-500)", marginTop: 8, textAlign: "center" }}>MMS 미리보기</div>
            </div>

            {!smsSent ? (
              <button className="btn btn-primary btn-block" onClick={() => { setSmsSent(true); pushToast("매칭 요청 문자를 보냈어요"); }} style={{ marginTop: 22, height: 52 }}>
                <Icon name="send" size={18} color="#fff" /> 문자 전송하기
              </button>
            ) : (
              <div style={{ marginTop: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "var(--secondary-100)", borderRadius: 12, marginBottom: 14 }}>
                  <Icon name="check-circle" size={22} color="var(--secondary-500)" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--secondary-500)" }}>전송 완료 — 부모님의 수락을 기다리고 있어요</span>
                </div>
                <button className="btn btn-secondary btn-block" onClick={() => setStep("landing")} style={{ height: 52 }}>
                  <Icon name="smartphone" size={18} /> 부모님 화면에서 링크 열어보기 (시연)
                </button>
              </div>
            )}
          </>
        )}

        {/* STEP: QR */}
        {step === "qr" && (
          <>
            <StepHeader title="QR 코드" onBack={() => setStep("method")} onClose={close} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 0 4px" }}>
              <div style={{ padding: 18, background: "#fff", border: "1px solid var(--gray-300)", borderRadius: 18, boxShadow: "var(--shadow-md)" }}>
                <QRCode text={fullUrl} size={184} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div className="t-h2" style={{ color: "var(--gray-900)", fontSize: 17 }}>부모님이 스캔하면 연결돼요</div>
                <div className="t-caption" style={{ color: "var(--gray-500)", marginTop: 4 }}>휴대폰 카메라로 이 코드를 비추면<br />연결 페이지가 열립니다</div>
              </div>
              <div className="t-micro tabular" style={{ color: "var(--gray-500)", background: "var(--gray-100)", padding: "6px 12px", borderRadius: 9999 }}>{fullUrl}</div>
            </div>
            <button className="btn btn-secondary btn-block" onClick={() => setStep("landing")} style={{ marginTop: 22, height: 52 }}>
              <Icon name="smartphone" size={18} /> 부모님 화면에서 열어보기 (시연)
            </button>
          </>
        )}

        {/* STEP: 부모님 랜딩 (가입된 부모님) */}
        {step === "landing" && inv.registered && (
          <>
            <StepHeader title="부모님 화면" onBack={() => setStep("method")} onClose={close} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14, padding: "10px 0" }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: "var(--primary-500)", display: "grid", placeItems: "center", boxShadow: "0 8px 20px rgba(37,99,235,0.3)" }}>
                <Icon name="heart" size={36} color="#fff" stroke={2} />
              </div>
              <div className="t-h1" style={{ color: "var(--gray-900)", fontSize: 21 }}>{inv.familyName}님이<br />가족 연결을 요청했어요</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: "var(--secondary-100)", borderRadius: 12 }}>
                <Icon name="check-circle" size={20} color="var(--secondary-500)" />
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--secondary-500)" }}>이미 안심연결 회원이시네요. 로그인하면 바로 연결돼요.</span>
              </div>
            </div>
            <button className="btn btn-primary btn-block" onClick={() => { matchInvite(); setStep("matched"); }} style={{ marginTop: 24, height: 56, fontSize: 17 }}>로그인하고 연결하기</button>
          </>
        )}

        {/* STEP: 부모님 랜딩 (미가입 → 회원가입) */}
        {step === "landing" && !inv.registered && (
          <SignupScreen invite={inv} onLogin={() => { matchInvite(); setStep("matched"); }} />
        )}

        {/* STEP: 매칭 완료 */}
        {step === "matched" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 16, minHeight: "70vh" }}>
            <div style={{ width: 96, height: 96, borderRadius: 9999, background: "var(--secondary-100)", display: "grid", placeItems: "center", animation: "pop 350ms ease-out" }}>
              <Icon name="check" size={52} color="var(--secondary-500)" stroke={3} />
            </div>
            <div className="t-h1" style={{ color: "var(--gray-900)" }}>매칭 완료!</div>
            <div className="t-body" style={{ color: "var(--gray-700)" }}>
              <b>{inv.familyName}</b>님과 <b>{inv.parentName}</b>님이<br />가족으로 연결되었어요
            </div>
            <div className="card" style={{ padding: 16, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, background: "var(--gray-50)" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-900)" }}>{inv.parentName}</span>
              <Icon name="link" size={18} color="var(--primary-500)" />
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-900)" }}>{inv.familyName}</span>
              <span className="badge badge-gray" style={{ marginLeft: 4 }}>{inv.relation}</span>
            </div>
            <div className="t-caption" style={{ color: "var(--gray-500)" }}>관리자 회원·매핑 목록에도 자동 반영됩니다</div>
            <button className="btn btn-primary btn-block" onClick={close} style={{ marginTop: 8, height: 52 }}>완료</button>
          </div>
        )}
      </div>
    </div>
  );
}
