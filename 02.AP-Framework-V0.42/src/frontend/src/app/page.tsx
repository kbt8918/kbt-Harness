import App from "./App";

export const metadata = {
  title: "안심연결 — 부모님 위치 확인 서비스",
  description: "안심연결: 부모님 위치를 실시간으로 확인하고, 긴급 상황에 빠르게 대응하세요.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  userScalable: false,
};

export default function Home() {
  return <App />;
}
