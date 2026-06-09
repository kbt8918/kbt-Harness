"use client";
// family-extra.tsx — 가족 설정 + 이동 기록 (안심맵)
import React, { useState } from "react";
import { useApp } from "@/state/AppState";
import { Icon, GoogleG } from "@/components/Icon";
import { SAFE_TOP, SAFE_BOTTOM, GoogleAuthSheet } from "@/components/auth-ui";
import { InviteFlow } from "./InviteFlow";

type ParentLite = { id: string; name: string; relation: string; phone: string };

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      style={{ width: 50, height: 30, borderRadius: 9999, border: "none", position: "relative", flexShrink: 0, cursor: disabled ? "default" : "pointer", transition: "background 200ms ease-out", background: on ? "var(--secondary-500)" : "var(--gray-300)", opacity: disabled ? 0.55 : 1 }}
    >
      <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 200ms ease-out" }} />
    </button>
  );
}

function SettingsSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 4px 10px", color: "var(--gray-500)" }}>
        <Icon name={icon} size={15} color="var(--gray-500)" />
        <span className="t-micro" style={{ fontWeight: 700, letterSpacing: 0.2 }}>{title}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

export function FamilySettings({ onClose }: { onClose: () => void }) {
  const { mappings, CURRENT_FAMILY, pushToast } = useApp();
  const [googleLinked, setGoogleLinked] = useState(false);
  const [gSheet, setGSheet] = useState(false);
  const [locAlert, setLocAlert] = useState(true);
  const [batAlert, setBatAlert] = useState(true);
  const [period, setPeriod] = useState("30초");
  const [inviteOpen, setInviteOpen] = useState(false);

  const parents: ParentLite[] = [];
  const seen = new Set<string>();
  mappings.filter((m) => m.familyId === CURRENT_FAMILY.id).forEach((m) => {
    if (seen.has(m.parentId)) return;
    seen.add(m.parentId);
    parents.push({ id: m.parentId, name: m.parentName, relation: m.relation, phone: m.parentPhone });
  });

  const PERIODS = ["30초", "1분", "5분"];

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 140, background: "var(--gray-50)", display: "flex", flexDirection: "column" }}>
      <div style={{ paddingTop: SAFE_TOP, background: "#fff", borderBottom: "1px solid var(--gray-300)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px 12px" }}>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, color: "var(--gray-700)", display: "grid", placeItems: "center" }}>
            <Icon name="chevron-left" size={26} />
          </button>
          <div className="t-h2" style={{ flex: 1, color: "var(--gray-900)", fontSize: 19 }}>가족 설정</div>
        </div>
      </div>

      <div className="thin-scroll" style={{ flex: 1, overflow: "auto", padding: `18px 18px ${SAFE_BOTTOM + 20}px` }}>
        {/* 계정 연동 */}
        <SettingsSection icon="link" title="계정 연동">
          <div className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <GoogleG size={26} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-900)" }}>Google 계정 {googleLinked ? "연동됨" : "미연동"}</div>
              <div className="t-caption" style={{ color: "var(--gray-500)" }}>소셜 로그인으로 편리하게 접속하세요</div>
            </div>
            {googleLinked ? (
              <span className="badge badge-green"><Icon name="check" size={12} color="var(--secondary-500)" /> 연동됨</span>
            ) : (
              <button className="btn btn-secondary" onClick={() => setGSheet(true)} style={{ height: 36, padding: "0 14px", fontSize: 13 }}>연동</button>
            )}
          </div>
          {!googleLinked && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--gray-100)", borderRadius: 12 }}>
              <Icon name="bell" size={18} color="var(--gray-500)" />
              <span className="t-caption" style={{ color: "var(--gray-700)" }}>Google 계정을 연동하면 소셜 로그인으로 간편하게 접속할 수 있어요.</span>
            </div>
          )}
        </SettingsSection>

        {/* 가족 구성원 */}
        <SettingsSection icon="users" title="가족 구성원">
          {parents.map((p) => (
            <div key={p.id} className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--secondary-100)", display: "grid", placeItems: "center", color: "var(--secondary-500)", fontWeight: 700, fontSize: 17 }}>{p.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-900)" }}>{p.name} <span style={{ fontWeight: 500, color: "var(--gray-500)", fontSize: 13 }}>({p.relation})</span></div>
                <div className="t-caption tabular" style={{ color: "var(--gray-500)" }}>{p.phone} · 연결됨</div>
              </div>
              <span className="badge badge-green"><span className="dot dot-green" /> 활성</span>
            </div>
          ))}
          <button onClick={() => setInviteOpen(true)} className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: "#fff" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--secondary-100)", display: "grid", placeItems: "center" }}>
              <Icon name="plus" size={18} color="var(--secondary-500)" />
            </div>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "var(--secondary-500)", textAlign: "left" }}>가족 구성원 초대하기</span>
            <Icon name="chevron-right" size={20} color="var(--gray-300)" />
          </button>
        </SettingsSection>

        {/* 알림 설정 */}
        <SettingsSection icon="bell" title="알림 설정">
          <div className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, opacity: 0.92 }}>
            <Icon name="alert-triangle" size={20} color="var(--danger-500)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-900)" }}>SOS 긴급 알림</div>
              <div className="t-caption" style={{ color: "var(--gray-500)" }}>수신 중단 불가</div>
            </div>
            <span className="badge badge-red" style={{ background: "var(--gray-100)", color: "var(--gray-500)" }}>항상 켜짐</span>
          </div>
          <div className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <Icon name="map-pin" size={20} color="var(--secondary-500)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-900)" }}>위치 갱신 알림</div>
              <div className="t-caption" style={{ color: "var(--gray-500)" }}>이동 감지 시 자동 알림</div>
            </div>
            <Toggle on={locAlert} onChange={(v) => { setLocAlert(v); pushToast("위치 갱신 알림 " + (v ? "켜짐" : "꺼짐")); }} />
          </div>
          <div className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <Icon name="battery" size={20} color="var(--secondary-500)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-900)" }}>배터리 부족 알림</div>
              <div className="t-caption" style={{ color: "var(--gray-500)" }}>20% 이하 시 알림</div>
            </div>
            <Toggle on={batAlert} onChange={(v) => { setBatAlert(v); pushToast("배터리 부족 알림 " + (v ? "켜짐" : "꺼짐")); }} />
          </div>
        </SettingsSection>

        {/* 위치 갱신 주기 */}
        <SettingsSection icon="clock" title="위치 갱신 주기">
          <div className="card" style={{ padding: 8, display: "flex", gap: 6 }}>
            {PERIODS.map((pp) => {
              const on = period === pp;
              return (
                <button key={pp} onClick={() => setPeriod(pp)} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, fontFamily: "var(--font-sans)", background: on ? "var(--secondary-500)" : "transparent", color: on ? "#fff" : "var(--gray-700)" }}>{pp}</button>
              );
            })}
          </div>
          <div className="t-caption" style={{ color: "var(--gray-500)", padding: "2px 4px" }}>짧을수록 정확하지만 배터리를 더 사용해요.</div>
        </SettingsSection>
      </div>

      {gSheet && <GoogleAuthSheet onClose={() => setGSheet(false)} onComplete={() => { setGSheet(false); setGoogleLinked(true); pushToast("Google 계정이 연동되었어요"); }} />}
      {inviteOpen && <InviteFlow onClose={() => setInviteOpen(false)} />}
    </div>
  );
}

// ───────── 매칭 요청 대기 목록 ─────────
const REQ_STATUS_META: Record<string, { badge: string; dot: string; label: string }> = {
  대기: { badge: "badge-amber", dot: "dot-amber", label: "대기" },
  연결됨: { badge: "badge-green", dot: "dot-green", label: "연결됨" },
  만료: { badge: "badge-gray", dot: "dot-gray", label: "만료" },
};

export function RequestList({ onClose, onInvite }: { onClose: () => void; onInvite: () => void }) {
  const { sentRequests, cancelSentRequest, resendSentRequest, pushToast } = useApp();
  const waiting = sentRequests.filter((r) => r.status === "대기").length;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 140, background: "var(--gray-50)", display: "flex", flexDirection: "column" }}>
      <div style={{ paddingTop: SAFE_TOP, background: "#fff", borderBottom: "1px solid var(--gray-300)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px 12px" }}>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, color: "var(--gray-700)", display: "grid", placeItems: "center" }}>
            <Icon name="chevron-left" size={26} />
          </button>
          <div style={{ flex: 1 }}>
            <div className="t-h2" style={{ color: "var(--gray-900)", fontSize: 19 }}>매칭 요청</div>
            <div className="t-caption" style={{ color: "var(--gray-500)" }}>보낸 요청 {sentRequests.length}건 · 대기 {waiting}건</div>
          </div>
          <button onClick={onInvite} className="btn btn-secondary" style={{ height: 36, padding: "0 12px", fontSize: 13 }}>
            <Icon name="plus" size={16} color="var(--secondary-500)" /> 새 요청
          </button>
        </div>
      </div>

      <div className="thin-scroll" style={{ flex: 1, overflow: "auto", padding: `16px 16px ${SAFE_BOTTOM + 16}px`, display: "flex", flexDirection: "column", gap: 12 }}>
        {sentRequests.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "60px 24px", textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--gray-100)", display: "grid", placeItems: "center" }}>
              <Icon name="mail" size={32} color="var(--gray-500)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--gray-700)" }}>보낸 매칭 요청이 없어요</div>
            <div className="t-caption" style={{ color: "var(--gray-500)" }}>부모님께 문자나 QR로 연결을 요청해 보세요.</div>
            <button onClick={onInvite} className="btn btn-primary" style={{ marginTop: 8, height: 46, padding: "0 20px" }}>부모님 매칭 요청 보내기</button>
          </div>
        ) : (
          sentRequests.map((r) => {
            const meta = REQ_STATUS_META[r.status];
            return (
              <div key={r.id} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--secondary-100)", display: "grid", placeItems: "center", color: "var(--secondary-500)", fontWeight: 700, fontSize: 17, flexShrink: 0 }}>{r.parentName[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-900)" }}>{r.parentName} <span style={{ fontWeight: 500, color: "var(--gray-500)", fontSize: 13 }}>({r.relation})</span></div>
                    <div className="t-caption tabular" style={{ color: "var(--gray-500)" }}>{r.parentPhone}</div>
                  </div>
                  <span className={"badge " + meta.badge}><span className={"dot " + meta.dot} /> {meta.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="badge badge-gray"><Icon name={r.channel === "QR" ? "link" : "mail"} size={12} /> {r.channel}로 전송</span>
                  <span className="badge badge-gray">{r.registered ? "가입된 부모님" : "미가입 — 가입 시 자동 연결"}</span>
                  <span className="t-micro tabular" style={{ color: "var(--gray-500)", marginLeft: "auto" }}>{r.sentAt}</span>
                </div>
                {r.status === "대기" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { resendSentRequest(r.id); pushToast(r.parentName + "님께 다시 보냈어요"); }} className="btn btn-secondary" style={{ flex: 1, height: 40, fontSize: 13 }}>
                      <Icon name="send" size={15} color="var(--secondary-500)" /> 다시 보내기
                    </button>
                    <button onClick={() => { cancelSentRequest(r.id); pushToast("요청을 취소했어요"); }} className="btn btn-secondary" style={{ flex: 1, height: 40, fontSize: 13, color: "var(--danger-500)" }}>
                      <Icon name="x" size={15} color="var(--danger-500)" /> 요청 취소
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ───────── 이동 기록 ─────────
const MOVE_LOG = [
  { time: "14:05", place: "한빛공원", detail: "25분 머무는 중", type: "stay" },
  { time: "13:48", place: "행복마트 앞", detail: "이동 · 약 8분", type: "move" },
  { time: "13:30", place: "행복경로당", detail: "1시간 10분 머무름", type: "stay" },
  { time: "12:20", place: "자택", detail: "출발", type: "home" },
  { time: "09:15", place: "자택", detail: "오전 휴식", type: "home" },
];

export function MovementHistory({ parents, focusId, onFocus }: { parents: ParentLite[]; focusId?: string; onFocus: (id: string) => void }) {
  const log = MOVE_LOG;
  const typeMeta: Record<string, { icon: string; color: string; bg: string }> = {
    stay: { icon: "map-pin", color: "var(--secondary-500)", bg: "var(--secondary-100)" },
    move: { icon: "footprints", color: "var(--primary-500)", bg: "var(--primary-100)" },
    home: { icon: "heart", color: "var(--gray-500)", bg: "var(--gray-100)" },
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--gray-50)" }}>
      <div style={{ paddingTop: SAFE_TOP, background: "#fff", borderBottom: "1px solid var(--gray-300)" }}>
        <div style={{ padding: "10px 16px 12px" }}>
          <div className="t-h2" style={{ color: "var(--gray-900)", fontSize: 19 }}>이동 기록</div>
          <div className="t-caption" style={{ color: "var(--gray-500)" }}>오늘 · {new Date().getMonth() + 1}월 {new Date().getDate()}일</div>
        </div>
        <div className="thin-scroll" style={{ display: "flex", gap: 8, padding: "0 16px 12px", overflowX: "auto" }}>
          {parents.map((p) => {
            const on = p.id === focusId;
            return (
              <button key={p.id} onClick={() => onFocus(p.id)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 9999, cursor: "pointer", flexShrink: 0, border: on ? "1.5px solid var(--secondary-500)" : "1px solid var(--gray-300)", background: on ? "var(--secondary-100)" : "#fff", fontFamily: "var(--font-sans)" }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: on ? "var(--secondary-500)" : "var(--gray-300)", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>{p.name[0]}</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: on ? "var(--secondary-500)" : "var(--gray-700)" }}>{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="thin-scroll" style={{ flex: 1, overflow: "auto", padding: `18px 20px ${SAFE_BOTTOM + 16}px` }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          {[["총 이동", "1.4km"], ["방문 장소", "4곳"], ["외출 시간", "4시간 50분"]].map((s) => (
            <div key={s[0]} className="card" style={{ flex: 1, padding: "12px 10px", textAlign: "center" }}>
              <div className="tabular" style={{ fontSize: 17, fontWeight: 800, color: "var(--gray-900)" }}>{s[1]}</div>
              <div className="t-micro" style={{ color: "var(--gray-500)", marginTop: 2 }}>{s[0]}</div>
            </div>
          ))}
        </div>

        <div style={{ position: "relative", paddingLeft: 6 }}>
          {log.map((e, i) => {
            const m = typeMeta[e.type];
            const last = i === log.length - 1;
            return (
              <div key={i} style={{ display: "flex", gap: 14, position: "relative" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: m.bg, display: "grid", placeItems: "center", flexShrink: 0, zIndex: 1 }}>
                    <Icon name={m.icon} size={18} color={m.color} />
                  </div>
                  {!last && <div style={{ width: 2, flex: 1, background: "var(--gray-300)", margin: "2px 0" }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: last ? 0 : 18 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-900)" }}>{e.place}</span>
                    <span className="t-micro tabular" style={{ color: "var(--gray-500)" }}>{e.time}</span>
                  </div>
                  <div className="t-caption" style={{ color: "var(--gray-500)", marginTop: 2 }}>{e.detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
