"use client";
import React from "react";
import { useApp } from "@/state/AppState";
import { Icon } from "./Icon";

export function ToastLayer({ position = "pc" }: { position?: "pc" | "mobile" }) {
  const { toasts } = useApp();
  const wrap: React.CSSProperties =
    position === "mobile"
      ? { left: "50%", bottom: 28, transform: "translateX(-50%)", alignItems: "center" }
      : { right: 20, top: 20, alignItems: "flex-end" };
  return (
    <div
      style={{
        position: "absolute", zIndex: 200, display: "flex", flexDirection: "column",
        gap: 8, pointerEvents: "none", ...wrap,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "11px 16px", borderRadius: 10, color: "#fff",
            fontSize: 14, fontWeight: 600, boxShadow: "var(--shadow-md)",
            background: t.kind === "error" ? "var(--danger-500)" : "var(--gray-700)",
            animation: "toastin 300ms ease-out",
          }}
        >
          <Icon name={t.kind === "error" ? "x" : "check"} size={18} stroke={2.4} />
          {t.msg}
        </div>
      ))}
    </div>
  );
}
