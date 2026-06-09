"use client";
// AdminScreen.tsx — SCR-005 관리자 화면 (회원·발송, desktop)
import React, { useState, useEffect } from "react";
import { useApp, type Member } from "@/state/AppState";
import { Icon } from "@/components/Icon";
import { MappingModal, MappingView, HistoryView, maskPhone } from "./admin-extra";
import { api, apiEnabled, type AdminMember } from "@/lib/api";

// 백엔드 AdminMember → 화면 Member 형태로 변환 (기존 테이블/필터 재사용)
function toMember(m: AdminMember): Member {
  const isParent = m.role === "parent";
  const mappedCount = isParent ? m.mappedFamilies.length : m.mappedParents.length;
  return {
    id: m.id,
    name: m.name,
    phone: m.phone ?? "-",
    role: isParent ? "부모" : "가족",
    mapped: mappedCount > 0 ? `${mappedCount}명 연결` : "(미매핑)",
    status: mappedCount > 0 ? "활성" : "대기",
  };
}

function SendModal({ kind, count, onClose, onSend }: { kind: "sms" | "kakao"; count: number; onClose: () => void; onSend: (c: number, text: string) => void }) {
  const isKakao = kind === "kakao";
  const [msg, setMsg] = useState(isKakao ? "" : "[안심연결] 안녕하세요, 부모님 위치 확인 서비스입니다. ");
  const [tpl, setTpl] = useState("위치 확인 안내");
  const TEMPLATES = ["위치 확인 안내", "긴급 알림 발생 안내", "서비스 점검 공지"];

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center", animation: "fadein 200ms ease-out" }}>
      <div style={{ width: 520, background: "#fff", borderRadius: 16, boxShadow: "var(--shadow-md)", animation: "pop 220ms ease-out", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--gray-100)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name={isKakao ? "message-square" : "mail"} size={22} color="var(--primary-600)" />
            <span className="t-h2" style={{ color: "var(--gray-900)" }}>{isKakao ? "카카오 알림톡 발송" : "SMS 발송"}</span>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--gray-500)", padding: 4 }}><Icon name="x" size={22} /></button>
        </div>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--gray-50)", padding: "10px 14px", borderRadius: 10 }}>
            <Icon name="users" size={18} color="var(--gray-500)" />
            <span className="t-body" style={{ color: "var(--gray-700)" }}>수신 대상: <b style={{ color: "var(--gray-900)" }}>선택 {count}명</b></span>
          </div>
          {isKakao && (
            <div className="field">
              <label className="field-label">승인 템플릿</label>
              <div style={{ position: "relative" }}>
                <select className="input" value={tpl} onChange={(e) => setTpl(e.target.value)} style={{ appearance: "none", cursor: "pointer" }}>
                  {TEMPLATES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <Icon name="chevron-down" size={18} color="var(--gray-500)" style={{ position: "absolute", right: 12, top: 15, pointerEvents: "none" }} />
              </div>
              <span className="t-micro" style={{ color: "var(--secondary-500)", display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="check" size={13} color="var(--secondary-500)" /> 승인된 템플릿만 발송 가능 (F-010)
              </span>
            </div>
          )}
          <div className="field">
            <label className="field-label">메시지 내용</label>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} className="input" style={{ height: "auto", padding: 12, resize: "none", lineHeight: "22px" }} placeholder={isKakao ? "템플릿 변수에 들어갈 내용을 입력하세요" : "발송할 메시지를 입력하세요"} />
            <span className="t-micro" style={{ color: "var(--gray-500)", textAlign: "right" }}>{msg.length} / 90자</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: "1px solid var(--gray-100)" }}>
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={() => onSend(count, msg)}>발송</button>
        </div>
      </div>
    </div>
  );
}

export function AdminScreen() {
  const { members: mockMembers, pushToast, pushSend } = useApp();
  const [nav, setNav] = useState<"members" | "mapping" | "history">("members");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [modal, setModal] = useState<"sms" | "kakao" | "mapping" | null>(null);

  // 백엔드 연동: apiEnabled면 실제 회원 목록을 가져와 표시(실패 시 Mock 폴백)
  const [apiMembers, setApiMembers] = useState<Member[] | null>(null);
  useEffect(() => {
    if (!apiEnabled) return;
    let alive = true;
    api
      .members()
      .then((res) => { if (alive) setApiMembers(res.members.map(toMember)); })
      .catch(() => { if (alive) setApiMembers(null); /* 폴백: Mock 사용 */ });
    return () => { alive = false; };
  }, []);
  const members = apiMembers ?? mockMembers;

  const filtered = members.filter((m: Member) => {
    const q = query.trim();
    const okQ = !q || m.name.includes(q) || m.phone.includes(q) || m.id.includes(q);
    const okS = statusFilter === "전체" || m.status === statusFilter;
    return okQ && okS;
  });

  const allOn = filtered.length > 0 && filtered.every((m: Member) => selected.has(m.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allOn) filtered.forEach((m: Member) => next.delete(m.id));
    else filtered.forEach((m: Member) => next.add(m.id));
    setSelected(next);
  };
  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const reset = () => { setQuery(""); setStatusFilter("전체"); };

  const navItems = [
    { key: "members" as const, label: "회원 관리", icon: "users" },
    { key: "mapping" as const, label: "매핑 관리", icon: "link" },
    { key: "history" as const, label: "발송 내역", icon: "list" },
  ];

  const STATUS_BADGE: Record<string, string> = { "활성": "badge-green", "대기": "badge-amber" };

  return (
    <div style={{ display: "flex", height: "100%", background: "var(--gray-50)", fontFamily: "var(--font-sans)", position: "relative" }}>
      {/* sidebar */}
      <aside style={{ width: 208, flexShrink: 0, background: "#fff", borderRight: "1px solid var(--gray-300)", display: "flex", flexDirection: "column", padding: "20px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px 20px" }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--primary-500)", display: "grid", placeItems: "center" }}>
            <Icon name="heart" size={18} color="#fff" stroke={2.2} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--gray-900)" }}>안심연결</div>
            <div style={{ fontSize: 11, color: "var(--gray-500)", fontWeight: 600, letterSpacing: 0.5 }}>ADMIN</div>
          </div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map((it) => {
            const on = nav === it.key;
            return (
              <button
                key={it.key}
                onClick={() => setNav(it.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9,
                  border: "none", cursor: "pointer", textAlign: "left", fontSize: 14, fontWeight: 600,
                  background: on ? "var(--primary-100)" : "transparent",
                  color: on ? "var(--primary-600)" : "var(--gray-700)",
                }}
              >
                <Icon name={it.icon} size={18} color={on ? "var(--primary-600)" : "var(--gray-500)"} /> {it.label}
              </button>
            );
          })}
        </nav>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderTop: "1px solid var(--gray-100)" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--gray-100)", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, color: "var(--gray-700)" }}>박</div>
          <div style={{ flex: 1, lineHeight: 1.3 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-900)" }}>박관리</div>
            <div style={{ fontSize: 11, color: "var(--gray-500)" }}>운영자</div>
          </div>
          <Icon name="log-out" size={17} color="var(--gray-500)" />
        </div>
      </aside>

      {/* main */}
      <main className="thin-scroll" style={{ flex: 1, overflow: "auto", padding: "28px 32px" }}>
        {nav === "mapping" ? <MappingView /> : nav === "history" ? <HistoryView /> : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h1 className="t-h1" style={{ margin: 0, color: "var(--gray-900)" }}>회원 관리</h1>
              <span className="t-caption" style={{ color: "var(--gray-500)" }}>전체 <b style={{ color: "var(--gray-900)" }}>{members.length}</b>명 · 활성 {members.filter((m: Member) => m.status === "활성").length}명</span>
            </div>

            {/* filter panel */}
            <div className="card" style={{ padding: 16, display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16 }}>
              <div className="field" style={{ flex: 1, maxWidth: 360 }}>
                <label className="field-label">검색</label>
                <div style={{ position: "relative" }}>
                  <Icon name="search" size={18} color="var(--gray-500)" style={{ position: "absolute", left: 12, top: 15 }} />
                  <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름 / 연락처 / 회원 ID" style={{ paddingLeft: 38 }} />
                </div>
              </div>
              <div className="field" style={{ width: 160 }}>
                <label className="field-label">매핑 상태</label>
                <div style={{ position: "relative" }}>
                  <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ appearance: "none", cursor: "pointer" }}>
                    <option>전체</option><option>활성</option><option>대기</option>
                  </select>
                  <Icon name="chevron-down" size={18} color="var(--gray-500)" style={{ position: "absolute", right: 12, top: 15, pointerEvents: "none" }} />
                </div>
              </div>
              <button className="btn btn-secondary" onClick={reset}>초기화</button>
              <button className="btn btn-primary"><Icon name="search" size={18} color="#fff" /> 검색</button>
            </div>

            {/* table */}
            <div className="card" style={{ overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--gray-100)" }}>
                    {["", "이름", "연락처", "역할", "매핑 부모/가족", "상태"].map((h, i) => (
                      <th key={i} style={{ textAlign: i === 0 ? "center" : "left", padding: i === 0 ? "0" : "11px 16px", fontSize: 13, fontWeight: 600, color: "var(--gray-500)", width: i === 0 ? 48 : undefined }}>
                        {i === 0 ? (
                          <input type="checkbox" checked={allOn} onChange={toggleAll} style={{ width: 16, height: 16, accentColor: "var(--primary-500)", cursor: "pointer" }} />
                        ) : (
                          h
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m: Member) => {
                    const on = selected.has(m.id);
                    return (
                      <tr key={m.id} onClick={() => toggle(m.id)} style={{ borderTop: "1px solid var(--gray-100)", cursor: "pointer", background: on ? "var(--primary-100)" : "#fff", transition: "background 120ms" }}>
                        <td style={{ textAlign: "center" }}><input type="checkbox" checked={on} onChange={() => toggle(m.id)} onClick={(e) => e.stopPropagation()} style={{ width: 16, height: 16, accentColor: "var(--primary-500)", cursor: "pointer" }} /></td>
                        <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600, color: "var(--gray-900)" }}>{m.name}<span style={{ color: "var(--gray-300)", fontWeight: 400, marginLeft: 6, fontSize: 12 }}>{m.id}</span></td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--gray-700)" }} className="tabular">{maskPhone(m.phone)}</td>
                        <td style={{ padding: "12px 16px" }}><span className={"badge " + (m.role === "부모" ? "badge-amber" : "badge-gray")}>{m.role}</span></td>
                        <td style={{ padding: "12px 16px", fontSize: 14, color: m.mapped.includes("미매핑") ? "var(--gray-500)" : "var(--gray-900)" }}>{m.mapped}</td>
                        <td style={{ padding: "12px 16px" }}><span className={"badge " + STATUS_BADGE[m.status]}><span className={"dot " + (m.status === "활성" ? "dot-green" : "dot-amber")} />{m.status}</span></td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 48, textAlign: "center", color: "var(--gray-500)" }}>조회 결과가 없습니다</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* pagination */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, margin: "18px 0" }}>
              <button className="pg"><Icon name="chevron-left" size={16} /></button>
              {[1, 2, 3].map((p) => <button key={p} className={"pg" + (p === 1 ? " pg-on" : "")}>{p}</button>)}
              <span style={{ color: "var(--gray-500)", padding: "0 4px" }}>…</span>
              <button className="pg">8</button>
              <button className="pg"><Icon name="chevron-right" size={16} /></button>
            </div>

            {/* action bar */}
            <div style={{ position: "sticky", bottom: 0, display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "#fff", border: "1px solid var(--gray-300)", borderRadius: 12, boxShadow: "var(--shadow-md)" }}>
              <span className="t-body" style={{ color: "var(--gray-700)" }}>선택 <b style={{ color: "var(--primary-600)" }}>{selected.size}</b>명</span>
              <div style={{ flex: 1 }} />
              <button className="btn btn-secondary" disabled={!selected.size} onClick={() => selected.size && setModal("sms")} style={selected.size ? {} : { opacity: 0.5 }}><Icon name="mail" size={18} /> SMS 발송</button>
              <button className="btn btn-secondary" disabled={!selected.size} onClick={() => selected.size && setModal("kakao")} style={selected.size ? {} : { opacity: 0.5 }}><Icon name="message-square" size={18} /> 카카오 알림톡</button>
              <button className="btn btn-primary" disabled={!selected.size} onClick={() => selected.size && setModal("mapping")} style={selected.size ? {} : { opacity: 0.5 }}><Icon name="link" size={18} color="#fff" /> 매핑 관리</button>
            </div>
          </>
        )}
      </main>

      {(modal === "sms" || modal === "kakao") && (
        <SendModal kind={modal} count={selected.size} onClose={() => setModal(null)}
          onSend={async (c, text) => {
            const kind = modal;
            const channel = kind === "kakao" ? "카카오" : "SMS";
            const ids = Array.from(selected);
            setModal(null);

            // 백엔드 연동: 실제 발송 API 호출 (미연동/실패 시 Mock 기록 폴백)
            if (apiEnabled && apiMembers) {
              try {
                const r = kind === "kakao" ? await api.sendKakao(ids, text || "위치 확인 안내") : await api.sendSms(ids, text);
                pushSend({ channel, count: c, text });
                pushToast(`발송 완료 — 성공 ${r.sent}건 / 실패 ${r.failed}건`);
                setSelected(new Set());
                return;
              } catch {
                pushToast("발송에 실패했습니다", "error");
                return;
              }
            }
            pushSend({ channel, count: c, text });
            pushToast("발송 완료 — 성공 " + c + "건 / 실패 0건");
            setSelected(new Set());
          }} />
      )}
      {modal === "mapping" && (() => {
        const sel = members.filter((m) => selected.has(m.id));
        const preP = sel.find((m) => m.role === "부모")?.id;
        const preF = sel.find((m) => m.role === "가족")?.id;
        return <MappingModal preParentId={preP} preFamilyId={preF} onClose={() => setModal(null)} />;
      })()}
    </div>
  );
}
