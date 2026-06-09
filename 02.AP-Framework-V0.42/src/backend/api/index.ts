// api/index.ts — Vercel 서버리스 진입점. Express 앱을 단일 함수로 위임.
// vercel.json 의 rewrites가 모든 /api/* 요청을 이 함수로 라우팅한다.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../src/app";

const app = createApp();

export default function handler(req: VercelRequest, res: VercelResponse) {
  return (app as unknown as (req: VercelRequest, res: VercelResponse) => void)(req, res);
}
