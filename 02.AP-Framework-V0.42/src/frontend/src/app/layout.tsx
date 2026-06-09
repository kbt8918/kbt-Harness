import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "안심연결 — 부모님 위치 확인 서비스",
  description: "감시가 아닌, 안심으로 연결합니다. 부모님 위치 확인 + 긴급 알림 서비스 프로토타입.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div id="app-root">{children}</div>
      </body>
    </html>
  );
}
