// server.ts — 로컬/독립 호스팅 진입점 (Render/Railway 등)
import { createApp } from "./app";
import { config } from "./config";

const app = createApp();
app.listen(config.port, () => {
  console.log(`안심연결 백엔드 실행 중 → http://localhost:${config.port}`);
  console.log(`헬스체크: http://localhost:${config.port}/api/health`);
});
