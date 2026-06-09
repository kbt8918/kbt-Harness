"use client";
// /auth/callback — Google OAuth 리디렉션 수신 → 백엔드 교환 → JWT 저장 → 메인 복귀
import React, { useEffect, useState } from "react";
import { api, setToken, setAuthUser, googleRedirectUri, ApiError } from "@/lib/api";

export default function GoogleCallback() {
  const [msg, setMsg] = useState("Google 계정으로 연결 중…");
  const [err, setErr] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const oauthErr = url.searchParams.get("error");
    let role: "parent" | "family" | undefined;
    try {
      const st = url.searchParams.get("state");
      if (st) role = JSON.parse(st).role;
    } catch { /* ignore */ }

    if (oauthErr) { setErr("Google 인증이 취소되었습니다."); return; }
    if (!code) { setErr("인증 코드가 없습니다."); return; }

    (async () => {
      try {
        const res = await api.googleExchange(code, googleRedirectUri(), role);
        setToken(res.token);
        setAuthUser(res.user);
        // 메인이 마운트 시 읽어 해당 역할 화면으로 자동 분기
        sessionStorage.setItem("ansim.justLoggedIn", res.user.role);
        setMsg(`${res.user.name}님으로 로그인되었습니다. 이동 중…`);
        window.location.replace("/");
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Google 로그인에 실패했습니다.");
      }
    })();
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif", background: "#f9fafb", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        {!err ? (
          <>
            <div style={{ width: 48, height: 48, margin: "0 auto 18px", border: "4px solid #dbeafe", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{msg}</div>
            <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
          </>
        ) : (
          <>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#dc2626", marginBottom: 10 }}>로그인 실패</div>
            <div style={{ fontSize: 14, color: "#374151", marginBottom: 18 }}>{err}</div>
            <a href="/" style={{ display: "inline-block", padding: "10px 20px", background: "#2563eb", color: "#fff", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}>처음으로 돌아가기</a>
          </>
        )}
      </div>
    </div>
  );
}
