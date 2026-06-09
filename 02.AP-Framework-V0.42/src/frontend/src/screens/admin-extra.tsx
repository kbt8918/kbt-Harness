"use client";
// admin-extra.tsx — 매핑 관리 / 발송 내역 화면 + 매핑 모달 (desktop)
import React, { useState } from "react";
import { useApp, type Member } from "@/state/AppState";
import { Icon } from "@/components/Icon";
import { api, apiEnabled } from "@/lib/api";

// 매핑 생성/해제를 백엔드에 반영 (하이브리드: 화면은 Mock 유지, 영속은 API).
// 백엔드 매핑 id는 Mock과 다르므로, 해제는 parent/family id로 백엔드 매핑을 찾아 삭제.
async function apiCreateMapping(parentId: string, familyId: string) {
  if (!apiEnabled) return;
  try { await api.createMapping(parentId, familyId); }
  catch { /* 중복(409) 등은 화면 Mock 로직이 별도 처리 — 무시 */ }
}
async function apiRemoveMapping(parentId: string, familyId: string) {
  if (!apiEnabled) return;
  try {
    const { mappings } = await api.mappings();
    const target = mappings.find((m) => m.parentId === parentId && m.familyId === familyId);
    if (target) await api.deleteMapping(target.id);
  } catch { /* 미연동/실패 시 무시 — 화면 Mock 반영은 유지 */ }
}

export function maskPhone(p: string) {
  const parts = p.split("-");
  if (parts.length === 3) return parts[0] + "-****-" + parts[2];
  return p;
}

const RELATIONS = ["어머니", "아버지", "할머니", "할아버지", "장모님", "장인어른", "기타"];

function StatCard({ icon, label, value, sub, accent = "var(--gray-900)" }: { icon: string; label: string; value: React.ReactNode; sub?: string; accent?: string }) {
  return (
    <div className="card" style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--gray-500)" }}>
        <Icon name={icon} size={16} color="var(--gray-500)" />
        <span className="t-caption" style={{ fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="tabular" style={{ fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</span>
        {sub && <span className="t-caption" style={{ color: "var(--gray-500)" }}>{sub}</span>}
      </div>
    </div>
  );
}

function Select({ value, onChange, children, width }: { value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode; width?: number }) {
  return (
    <div style={{ position: "relative", width }}>
      <select className="input" value={value} onChange={onChange} style={{ appearance: "none", cursor: "pointer", width: "100%" }}>
        {children}
      </select>
      <Icon name="chevron-down" size={18} color="var(--gray-500)" style={{ position: "absolute", right: 12, top: 15, pointerEvents: "none" }} />
    </div>
  );
}

// ───────── 매핑 모달 (F-013) — 한 부모님 ↔ 여러 가족 제한 없음 ─────────
export function MappingModal({ preParentId, preFamilyId, onClose }: { preParentId?: string; preFamilyId?: string; onClose: () => void }) {
  const { members, mappings, addMapping, removeMapping, isMapped, pushToast } = useApp();
  const parents = members.filter((m) => m.role === "부모");
  const families = members.filter((m) => m.role === "가족");

  const [parentId, setParentId] = useState(preParentId || parents[0]?.id || "");
  const [famIds, setFamIds] = useState<Set<string>>(() => { const s = new Set<string>(); if (preFamilyId) s.add(preFamilyId); return s; });
  const [relation, setRelation] = useState("어머니");
  const [err, setErr] = useState("");

  const toggleFam = (id: string) => setFamIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const create = () => {
    if (!parentId) { setErr("부모님을 선택해주세요"); return; }
    if (famIds.size === 0) { setErr("연결할 가족을 1명 이상 선택해주세요"); return; }
    const p = parents.find((m) => m.id === parentId);
    if (!p) { setErr("부모님을 선택해주세요"); return; }
    const targets = [...famIds].filter((fid) => !isMapped(parentId, fid));
    if (targets.length === 0) { setErr("선택한 가족은 이미 모두 연결되어 있어요"); return; }
    targets.forEach((fid) => { const f = families.find((m) => m.id === fid); if (f) addMapping(p, f, relation); });
    // 백엔드 영속 (하이브리드)
    targets.forEach((fid) => { void apiCreateMapping(parentId, fid); });
    pushToast(p.name + "님을 " + targets.length + "개 가족과 연결했습니다 (제한 없음)");
    setFamIds(new Set());
    setErr("");
  };

  const involved = mappings.filter((m) => m.parentId === parentId || famIds.has(m.familyId));

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center", animation: "fadein 200ms ease-out" }}>
      <div style={{ width: 600, maxHeight: "86%", background: "#fff", borderRadius: 16, boxShadow: "var(--shadow-md)", animation: "pop 220ms ease-out", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--gray-100)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="link" size={22} color="var(--primary-600)" />
            <div>
              <div className="t-h2" style={{ color: "var(--gray-900)" }}>매핑 관리</div>
              <div className="t-micro" style={{ color: "var(--gray-500)" }}>부모(위치 제공자) ↔ 가족(위치 확인자) 연결 (F-013)</div>
            </div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--gray-500)", padding: 4 }}><Icon name="x" size={22} /></button>
        </div>

        <div className="thin-scroll" style={{ padding: 22, overflow: "auto" }}>
          <div style={{ background: "var(--gray-50)", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div className="field-label" style={{ margin: 0 }}>새 매핑 생성</div>
              <span className="badge badge-green"><Icon name="check" size={12} color="var(--secondary-500)" /> 한 부모님 ↔ 여러 가족 제한 없음</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="t-micro" style={{ color: "var(--gray-500)", display: "block", marginBottom: 4 }}>부모님 (위치 제공자)</label>
                <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                  {parents.map((p) => <option key={p.id} value={p.id}>{p.name} · {maskPhone(p.phone)}</option>)}
                </Select>
              </div>
              <div style={{ width: 130 }}>
                <label className="t-micro" style={{ color: "var(--gray-500)", display: "block", marginBottom: 4 }}>관계</label>
                <Select value={relation} onChange={(e) => setRelation(e.target.value)}>
                  {RELATIONS.map((r) => <option key={r}>{r}</option>)}
                </Select>
              </div>
            </div>

            <label className="t-micro" style={{ color: "var(--gray-500)", display: "block", marginBottom: 6 }}>연결할 가족 (여러 명 선택 가능)</label>
            <div className="thin-scroll card" style={{ maxHeight: 168, overflow: "auto", padding: 6, marginBottom: 12 }}>
              {families.map((f) => {
                const already = isMapped(parentId, f.id);
                const checked = already || famIds.has(f.id);
                return (
                  <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, cursor: already ? "default" : "pointer", background: checked ? "var(--primary-100)" : "transparent" }}>
                    <input type="checkbox" checked={checked} disabled={already} onChange={() => toggleFam(f.id)} style={{ width: 16, height: 16, accentColor: "var(--primary-500)", cursor: already ? "default" : "pointer" }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--gray-900)" }}>{f.name}</span>
                    <span className="t-micro tabular" style={{ color: "var(--gray-500)" }}>{maskPhone(f.phone)}</span>
                    <div style={{ flex: 1 }} />
                    {already && <span className="badge badge-gray">연결됨</span>}
                  </label>
                );
              })}
            </div>

            <button className="btn btn-primary btn-block" onClick={create}><Icon name="plus" size={18} color="#fff" /> 선택한 가족과 연결 ({famIds.size})</button>
            {err && <div className="t-caption" style={{ color: "var(--danger-500)", marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><Icon name="alert-triangle" size={14} color="var(--danger-500)" /> {err}</div>}
          </div>

          <div className="field-label" style={{ margin: "20px 0 10px" }}>선택 항목 관련 매핑 ({involved.length})</div>
          {involved.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--gray-500)", border: "1px dashed var(--gray-300)", borderRadius: 12 }} className="t-caption">관련 매핑이 없습니다</div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              {involved.map((m, i) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i ? "1px solid var(--gray-100)" : "none" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--gray-900)" }}>{m.parentName}</span>
                  <Icon name="arrow-right" size={14} color="var(--gray-300)" />
                  <span style={{ fontSize: 14, color: "var(--gray-900)" }}>{m.familyName}</span>
                  <span className="badge badge-gray">{m.relation}</span>
                  <div style={{ flex: 1 }} />
                  <span className="t-micro" style={{ color: "var(--gray-500)" }}>{m.created}</span>
                  <button className="btn btn-secondary" onClick={() => { void apiRemoveMapping(m.parentId, m.familyId); removeMapping(m.id); pushToast("매핑이 해제되었습니다 — 접근 권한 즉시 회수"); }} style={{ height: 34, padding: "0 12px", fontSize: 13, color: "var(--danger-500)", borderColor: "var(--gray-300)" }}>
                    <Icon name="unlink" size={15} color="var(--danger-500)" /> 해제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 22px", borderTop: "1px solid var(--gray-100)" }}>
          <button className="btn btn-primary" onClick={onClose}>완료</button>
        </div>
      </div>
    </div>
  );
}

// ───────── 매핑 관리 화면 ─────────
export function MappingView() {
  const { members, mappings, removeMapping, pushToast } = useApp();
  const [modal, setModal] = useState<{ preParentId?: string; preFamilyId?: string } | null>(null);

  const unmapped = members.filter((m: Member) => !mappings.some((mp) => mp.parentId === m.id || mp.familyId === m.id));
  const parentsLinked = new Set(mappings.map((m) => m.parentId)).size;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 className="t-h1" style={{ margin: 0, color: "var(--gray-900)" }}>매핑 관리</h1>
        <button className="btn btn-primary" onClick={() => setModal({})}><Icon name="plus" size={18} color="#fff" /> 새 매핑 추가</button>
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        <StatCard icon="link" label="총 매핑" value={mappings.length} sub="건" accent="var(--primary-600)" />
        <StatCard icon="heart" label="연결된 부모님" value={parentsLinked} sub="명" />
        <StatCard icon="clock" label="미매핑 회원" value={unmapped.length} sub="명" accent="var(--warning-500)" />
      </div>

      <div>
        <div className="field-label" style={{ marginBottom: 8 }}>매핑 목록</div>
        <div className="card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--gray-100)" }}>
                {["부모님 (위치 제공자)", "가족 (위치 확인자)", "관계", "상태", "등록일", "관리"].map((h, i) => (
                  <th key={i} style={{ textAlign: i === 5 ? "right" : "left", padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "var(--gray-500)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mappings.map((m, i) => (
                <tr key={m.id} style={{ borderTop: i ? "1px solid var(--gray-100)" : "none" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--primary-100)", display: "grid", placeItems: "center", color: "var(--primary-600)", fontWeight: 700, fontSize: 13 }}>{m.parentName[0]}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--gray-900)" }}>{m.parentName}</div>
                        <div className="t-micro tabular" style={{ color: "var(--gray-500)" }}>{maskPhone(m.parentPhone)}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 14, color: "var(--gray-900)" }}>{m.familyName}</td>
                  <td style={{ padding: "12px 16px" }}><span className="badge badge-gray">{m.relation}</span></td>
                  <td style={{ padding: "12px 16px" }}><span className="badge badge-green"><span className="dot dot-green" />{m.status}</span></td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--gray-500)" }} className="tabular">{m.created}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <button className="btn btn-secondary" onClick={() => { void apiRemoveMapping(m.parentId, m.familyId); removeMapping(m.id); pushToast("매핑이 해제되었습니다 — 접근 권한 즉시 회수 (F-013)"); }} style={{ height: 32, padding: "0 12px", fontSize: 13, color: "var(--danger-500)" }}>
                      <Icon name="unlink" size={15} color="var(--danger-500)" /> 해제
                    </button>
                  </td>
                </tr>
              ))}
              {mappings.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--gray-500)" }}>매핑이 없습니다</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="field-label" style={{ marginBottom: 8 }}>미매핑 회원 ({unmapped.length})</div>
        {unmapped.length === 0 ? (
          <div className="card t-caption" style={{ padding: 24, textAlign: "center", color: "var(--gray-500)" }}>모든 회원이 매핑되었습니다</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {unmapped.map((m) => (
              <div key={m.id} className="card" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, minWidth: 280 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--gray-100)", display: "grid", placeItems: "center", color: "var(--gray-700)", fontWeight: 700, fontSize: 14 }}>{m.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--gray-900)" }}>{m.name} <span className={"badge " + (m.role === "부모" ? "badge-amber" : "badge-gray")} style={{ marginLeft: 4 }}>{m.role}</span></div>
                  <div className="t-micro tabular" style={{ color: "var(--gray-500)" }}>{maskPhone(m.phone)}</div>
                </div>
                <button className="btn btn-primary" onClick={() => setModal(m.role === "부모" ? { preParentId: m.id } : { preFamilyId: m.id })} style={{ height: 34, padding: "0 12px", fontSize: 13 }}>
                  <Icon name="link" size={15} color="#fff" /> 매핑하기
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && <MappingModal preParentId={modal.preParentId} preFamilyId={modal.preFamilyId} onClose={() => setModal(null)} />}
    </div>
  );
}

// ───────── 발송 내역 화면 ─────────
export function HistoryView() {
  const { sendHistory } = useApp();
  const [channel, setChannel] = useState("전체");

  const rows = sendHistory.filter((r) => channel === "전체" || r.channel === channel);
  const totalSent = sendHistory.reduce((s, r) => s + r.target, 0);
  const totalOk = sendHistory.reduce((s, r) => s + r.success, 0);
  const totalFail = sendHistory.reduce((s, r) => s + r.fail, 0);
  const rate = totalSent ? Math.round((totalOk / totalSent) * 100) : 0;

  const CH_BADGE: Record<string, string> = { SMS: "badge-gray", 카카오: "badge-amber" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 className="t-h1" style={{ margin: 0, color: "var(--gray-900)" }}>발송 내역</h1>
        <div style={{ display: "flex", gap: 6, background: "var(--gray-100)", padding: 4, borderRadius: 10 }}>
          {["전체", "SMS", "카카오"].map((c) => {
            const on = channel === c;
            return (
              <button key={c} onClick={() => setChannel(c)} style={{ padding: "7px 16px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-sans)", background: on ? "#fff" : "transparent", color: on ? "var(--primary-600)" : "var(--gray-500)", boxShadow: on ? "var(--shadow-sm)" : "none" }}>{c}</button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        <StatCard icon="send" label="총 발송" value={totalSent.toLocaleString()} sub="건" accent="var(--primary-600)" />
        <StatCard icon="check-circle" label="성공률" value={rate + "%"} sub={totalOk.toLocaleString() + "건 성공"} accent="var(--secondary-500)" />
        <StatCard icon="alert-triangle" label="실패" value={totalFail} sub="건" accent="var(--danger-500)" />
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--gray-100)" }}>
              {["발송일시", "채널", "대상", "내용", "결과", "상태"].map((h, i) => (
                <th key={i} style={{ textAlign: i === 2 || i === 4 ? "center" : "left", padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "var(--gray-500)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} style={{ borderTop: i ? "1px solid var(--gray-100)" : "none" }}>
                <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--gray-700)" }} className="tabular">{r.dt}</td>
                <td style={{ padding: "12px 16px" }}><span className={"badge " + CH_BADGE[r.channel]}><Icon name={r.channel === "SMS" ? "mail" : "message-square"} size={13} /> {r.channel === "카카오" ? "알림톡" : "SMS"}</span></td>
                <td style={{ padding: "12px 16px", textAlign: "center", fontSize: 14, color: "var(--gray-900)" }} className="tabular">{r.target}명</td>
                <td style={{ padding: "12px 16px", fontSize: 14, color: "var(--gray-900)", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.text}</td>
                <td style={{ padding: "12px 16px", textAlign: "center", fontSize: 13 }} className="tabular">
                  <span style={{ color: "var(--secondary-500)", fontWeight: 600 }}>{r.success}</span>
                  <span style={{ color: "var(--gray-300)" }}> / </span>
                  <span style={{ color: r.fail ? "var(--danger-500)" : "var(--gray-500)", fontWeight: 600 }}>{r.fail}</span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  {r.fail ? <span className="badge badge-amber"><Icon name="alert-triangle" size={12} /> 일부 실패</span> : <span className="badge badge-green"><span className="dot dot-green" /> 완료</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--gray-500)" }}>발송 내역이 없습니다</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
