"use client";
// App.tsx — 셸: 탭 라우팅 + 스케일 스테이지 + 실시간 연동 데모
// 디자인 번들 app.jsx 충실 이식.
import React, { useState, useRef, useLayoutEffect } from "react";
import { AppProvider } from "@/state/AppState";
import { Icon } from "@/components/Icon";
import { AuthFlow } from "@/screens/SignupScreen";
import { ParentScreen } from "@/screens/ParentScreen";
import { FamilyScreen } from "@/screens/FamilyScreen";
import { AdminScreen } from "@/screens/AdminScreen";
import { IOSDevice } from "@/components/frames/IOSFrame";
import { ChromeWindow } from "@/components/frames/ChromeWindow";
import { ToastLayer } from "@/components/Toast";
import type { Role } from "@/screens/LoginScreen";

type TabKey = "login" | "parent" | "family" | "admin" | "demo";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "login", label: "로그인·가입", icon: "lock" },
  { key: "parent", label: "부모님", icon: "heart" },
  { key: "family", label: "가족", icon: "users" },
  { key: "admin", label: "관리자", icon: "shield" },
  { key: "demo", label: "실시간 연동 데모", icon: "navigation" },
];

// 고정 크기 씬을 가용 영역에 맞춰 스케일(최대 1x)
function Stage({ w, h, children }: { w: number; h: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const aw = el.clientWidth - 48;
      const ah = el.clientHeight - 48;
      setScale(Math.min(aw / w, ah / h, 1));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);
  return (
    <div ref={ref} style={{ flex: 1, minHeight: 0, display: "grid", placeItems: "center", overflow: "hidden" }}>
      <div style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "center" }}>
        {children}
      </div>
    </div>
  );
}

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      <IOSDevice width={402} height={860}>{children}</IOSDevice>
      <ToastLayer position="mobile" />
    </div>
  );
}

function SceneLabel({ children, color = "var(--gray-500)" }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 12, fontSize: 14, fontWeight: 700, color, letterSpacing: 0.2 }}>
      {children}
    </div>
  );
}

function AppShell() {
  const [tab, setTab] = useState<TabKey>("demo");

  const scene = () => {
    if (tab === "login") {
      return (
        <Stage w={402} h={900}>
          <div>
            <SceneLabel>SCR-001 · 로그인 / 회원가입</SceneLabel>
            <Phone>
              <AuthFlow onLogin={(role: Role) => setTab(role === "admin" ? "admin" : role === "parent" ? "parent" : "family")} />
            </Phone>
          </div>
        </Stage>
      );
    }
    if (tab === "parent") {
      return (
        <Stage w={402} h={900}>
          <div>
            <SceneLabel color="var(--danger-500)">SCR-002 · 부모님 화면 (고령자 UI)</SceneLabel>
            <Phone><ParentScreen /></Phone>
          </div>
        </Stage>
      );
    }
    if (tab === "family") {
      return (
        <Stage w={402} h={900}>
          <div>
            <SceneLabel color="var(--primary-600)">SCR-003 / 004 · 가족 화면 + 채팅</SceneLabel>
            <Phone><FamilyScreen /></Phone>
          </div>
        </Stage>
      );
    }
    if (tab === "admin") {
      return (
        <Stage w={1240} h={860}>
          <div>
            <SceneLabel>SCR-005 · 관리자 화면 (회원·발송)</SceneLabel>
            <div style={{ position: "relative" }}>
              <ChromeWindow width={1240} height={800} url="admin.ansim.kr/members" tabs={[{ title: "안심연결 관리자" }]}>
                <AdminScreen />
              </ChromeWindow>
              <ToastLayer position="pc" />
            </div>
          </div>
        </Stage>
      );
    }
    // demo: 부모님 + 가족 나란히, 실시간 연동
    return (
      <Stage w={904} h={930}>
        <div>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--gray-900)" }}>실시간 연동 데모</div>
            <div style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 3 }}>
              왼쪽 부모님 화면의 <b style={{ color: "var(--danger-500)" }}>긴급 알림</b> 버튼을 누르면 → 오른쪽 가족 화면에 즉시 전달됩니다
            </div>
          </div>
          <div style={{ display: "flex", gap: 36, justifyContent: "center" }}>
            <div>
              <SceneLabel color="var(--danger-500)">부모님 화면</SceneLabel>
              <Phone><ParentScreen /></Phone>
            </div>
            <div>
              <SceneLabel color="var(--primary-600)">가족 화면</SceneLabel>
              <Phone><FamilyScreen /></Phone>
            </div>
          </div>
        </div>
      </Stage>
    );
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--gray-100)" }}>
      <header style={{ height: 60, flexShrink: 0, background: "#fff", borderBottom: "1px solid var(--gray-300)", display: "flex", alignItems: "center", gap: 16, padding: "0 22px", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--primary-500)", display: "grid", placeItems: "center" }}>
            <Icon name="heart" size={18} color="#fff" stroke={2.2} />
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--gray-900)" }}>안심연결</div>
            <div style={{ fontSize: 11, color: "var(--gray-500)" }}>부모님 위치 확인 서비스 · 프로토타입</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <nav style={{ display: "flex", gap: 4, background: "var(--gray-100)", padding: 4, borderRadius: 10 }}>
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 8,
                border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 700, fontFamily: "var(--font-sans)",
                background: on ? "#fff" : "transparent", color: on ? "var(--primary-600)" : "var(--gray-500)",
                boxShadow: on ? "var(--shadow-sm)" : "none", transition: "all 150ms",
              }}>
                <Icon name={t.icon} size={16} color={on ? "var(--primary-600)" : "var(--gray-500)"} /> {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      {scene()}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
