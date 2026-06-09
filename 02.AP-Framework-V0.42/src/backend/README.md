# 안심연결 백엔드 (관리자 API)

Express.js + TypeScript + Supabase(PostgreSQL) 기반 관리자 백엔드.
부모님 위치 확인 서비스의 인증·회원관리·발송·매핑 API를 제공한다.

> 배치 전략: 산출물 인프라아키텍처는 M1~M4 단계에서 Next.js Route Handlers 통합을 권장하나,
> 본 프로젝트는 사용자 요청에 따라 `src/backend`에 **독립 Express 서버**로 분리 구현(M5+ 전략 선행 적용).

## 기술 스택

| 영역 | 기술 |
|------|------|
| 런타임 | Node.js + Express 4 |
| 언어 | TypeScript |
| DB | Supabase (PostgreSQL), `@supabase/supabase-js` (service_role) |
| 인증 | JWT (`jsonwebtoken`) + bcryptjs |
| 검증 | zod |
| 배포 | Vercel (서버리스) / Render·Railway (독립 호스팅) |

## 디렉터리 구조

```
src/backend/
├── api/index.ts          # Vercel 서버리스 진입점 (Express 위임)
├── sql/schema.sql        # DB 스키마 (8개 테이블, 데이터베이스설계서 기준)
├── scripts/
│   ├── db-push.ts        # 스키마 적용 (pg 직접 연결)
│   └── db-seed.ts        # 초기 데이터 (관리자/테스트 계정·매핑)
├── src/
│   ├── config.ts         # 환경변수 로드·검증
│   ├── supabase.ts       # service_role 클라이언트
│   ├── http.ts           # 공통 응답/에러 포맷 (API스펙 1.1/1.2)
│   ├── types.ts          # 도메인 타입
│   ├── utils.ts          # 마스킹·번호검증·asyncHandler
│   ├── middleware/       # auth(JWT·역할) / accessLog / errorHandler
│   ├── routes/           # auth / admin / mapping
│   ├── app.ts            # Express 앱 구성
│   └── server.ts         # 로컬/독립 진입점
├── vercel.json
├── .env.example
└── README.md
```

## 환경변수

`.env.example`을 `.env`로 복사 후 값을 채운다. (`.env`는 `.gitignore`로 보호)

| 변수 | 설명 |
|------|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role 키 (백엔드 전용, 노출 금지) |
| `SUPABASE_DB_*` | 스키마 push/seed용 Postgres 직접 연결 정보 |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | JWT 서명 키·만료 |
| `CORS_ORIGINS` | 허용 출처 (콤마 구분) |

## 설치 & 실행

```bash
cd src/backend
npm install

# 1) DB 스키마 적용 (최초 1회)
npm run db:push

# 2) 초기 데이터 시드 (관리자/테스트 계정)
npm run db:seed

# 3) 개발 서버 실행 (http://localhost:4000)
npm run dev
```

> `db:push`가 네트워크/IPv6 이슈로 실패하면, `sql/schema.sql` 내용을
> Supabase 대시보드 → SQL Editor 에 붙여넣어 직접 실행한다.

빌드 & 프로덕션 실행:

```bash
npm run build && npm start
```

## 시드 계정

| login_id | password | role |
|----------|----------|------|
| admin | admin1234 | admin |
| jiyoung | test1234 | family |
| soonja | test1234 | parent |

## API 엔드포인트

Base: `/api` · 인증: `Authorization: Bearer {token}`

| API-ID | Method | Path | 역할 | 설명 |
|--------|--------|------|------|------|
| — | GET | `/api/health` | 공개 | 헬스체크 |
| API-001 | POST | `/api/auth/login` | 공개 | 로그인(JWT 발급) |
| API-002 | POST | `/api/auth/logout` | 인증 | 로그아웃 |
| API-010 | GET | `/api/admin/members` | admin | 회원 조회(전화 마스킹) |
| API-011 | POST | `/api/admin/sms` | admin | SMS 발송 + 이력 기록 |
| API-012 | POST | `/api/admin/kakao` | admin | 카카오 알림톡 발송 |
| — | GET | `/api/admin/dispatches` | admin | 발송 내역 조회 |
| API-013 | GET | `/api/mapping` | admin/family | 매핑 조회 |
| API-014 | POST | `/api/mapping` | admin/family | 매핑 생성(중복 차단 409) |
| API-015 | DELETE | `/api/mapping/:mappingId` | admin/family | 매핑 해제 |

### 예시

```bash
# 로그인
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"loginId":"admin","password":"admin1234"}'

# 회원 조회 (TOKEN은 위 응답의 data.token)
curl http://localhost:4000/api/admin/members \
  -H "Authorization: Bearer $TOKEN"
```

## 공통 응답 형식

```json
// 성공
{ "status": "success", "data": { } }
// 에러
{ "status": "error", "error": { "code": "FORBIDDEN", "message": "접근 권한이 없습니다" } }
```

## Vercel 배포

```bash
cd src/backend
vercel            # 프리뷰
vercel --prod     # 프로덕션
```

Vercel 대시보드 → Project → Settings → Environment Variables 에 `.env`의
모든 키를 등록한다(특히 `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`).
`vercel.json`이 모든 요청을 `api/index.ts`(Express)로 라우팅한다.

배포 후 프론트엔드(`src/frontend`)의 API 호출 base URL을
`https://kbt-harness-admin.vercel.app` 으로 설정한다.

## 보안 주의

- `service_role` 키와 `JWT_SECRET`은 **백엔드 전용**. 절대 프론트엔드/공개 저장소에 노출 금지.
- 운영 배포 전 `JWT_SECRET`을 강력한 랜덤 값으로 교체.
- SMS/카카오 발송은 현재 **모의(시뮬레이션)** — 외부 사업자 API 연동 시 `routes/admin.ts`의 `dispatch()` 내부에서 실제 호출로 교체.
