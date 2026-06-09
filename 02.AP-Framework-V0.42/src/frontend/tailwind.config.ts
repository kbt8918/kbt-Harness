import type { Config } from "tailwindcss";

// 디자인 토큰(Design-Style-Guide.md v1.0)을 Tailwind 테마에 매핑.
// 실제 스타일 대부분은 globals.css의 CSS 변수 + 유틸 클래스로 충실히 재현하며,
// Tailwind 색상은 보조적으로 사용한다.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 100: "#DBEAFE", 500: "#2563EB", 600: "#1D4ED8" },
        secondary: { 100: "#DCFCE7", 500: "#16A34A" },
        danger: { 100: "#FEE2E2", 500: "#DC2626", 600: "#B91C1C" },
        warning: { 100: "#FEF3C7", 500: "#D97706" },
        gray: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          300: "#D1D5DB",
          500: "#6B7280",
          700: "#374151",
          900: "#111827",
        },
      },
      fontFamily: {
        sans: ['"Pretendard"', "-apple-system", '"Noto Sans KR"', "system-ui", "sans-serif"],
      },
      borderRadius: { sm: "6px", md: "10px", lg: "16px" },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.06)",
        md: "0 4px 12px rgba(0,0,0,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
