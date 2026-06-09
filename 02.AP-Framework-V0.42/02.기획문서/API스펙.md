<style>
@media print {
    body, p, li { font-size: 13pt !important; line-height: 1.6 !important; }
    h1 { font-size: 22pt !important; margin-top: 22pt !important; margin-bottom: 14pt !important; }
    h2 { font-size: 18pt !important; margin-top: 18pt !important; margin-bottom: 12pt !important; }
    h3 { font-size: 16pt !important; margin-top: 16pt !important; margin-bottom: 10pt !important; }
    ul, ol { margin-top: 5pt !important; margin-bottom: 5pt !important; padding-left: 22pt !important; }
}
</style>

# API 스펙 (API Specification)

**프로젝트명**: 부모님 위치 확인 서비스
**작성일**: 2026-06-09
**버전**: v1.0
**작성자**: kbt8918 (기획자)
**근거 자료**: 기능명세서.md(v1.0), 요구사항정의서.md(v1.0)

> 본 문서는 기능명세서의 F-001~F-014 단위 기능과 "관련 API"를 RESTful 엔드포인트로 전개한다.
> 본 문서의 결과는 데이터베이스설계서(#12)·구현(코드)·테스트시나리오(#15)의 입력 자료가 된다.
> 배치 전략: M1~M4 통합 단계 기준으로 모든 엔드포인트는 Next.js Route Handlers(`src/frontend/app/api/*`)로 구현한다.

---

## 1. API 공통 사항

| 항목 | 내용 |
|------|------|
| Base URL | `https://{도메인}/api` (로컬: `http://localhost:3000/api`) |
| 인증 방식 | Bearer Token (JWT) — `Authorization: Bearer {token}` |
| 응답 형식 | JSON |
| 문자 인코딩 | UTF-8 |
| 실시간 채널 | SSE `/api/stream` 또는 Supabase Realtime (F-005, F-007) |
| 공통 정책 | 모든 보호 엔드포인트는 인증·역할·매핑 검증 미들웨어 적용(F-012) |

### 1.1 공통 응답 형식

**성공 응답**

```json
{
  "status": "success",
  "data": {}
}
```

**에러 응답**

```json
{
  "status": "error",
  "error": {
    "code": "FORBIDDEN",
    "message": "접근 권한이 없습니다"
  }
}
```

### 1.2 공통 에러 코드

| HTTP 상태 코드 | 에러 코드 | 설명 | 근거 정책 |
|----------------|-----------|------|-----------|
| 400 | BAD_REQUEST | 잘못된 요청(파라미터 오류 등) | F-001/F-009 |
| 401 | UNAUTHORIZED | 인증 필요·실패 | 인증 실패 정책 |
| 403 | FORBIDDEN | 권한·매핑 위반 | 권한 위반 정책(F-012) |
| 404 | NOT_FOUND | 리소스 없음 | - |
| 409 | CONFLICT | 중복(중복 매핑 등) | F-013 |
| 422 | UNPROCESSABLE | 검증 실패(번호 형식·빈 메시지 등) | F-007/F-009 |
| 429 | TOO_MANY_REQUESTS | 발송 한도 초과·연타 디바운스 | F-002/F-009 |
| 502 | UPSTREAM_ERROR | 외부 API(SMS/카카오/지도) 오류 | F-009/F-010 |
| 500 | INTERNAL_ERROR | 서버 내부 오류 | - |

---

## 2. API 엔드포인트 목록

| API-ID | Method | URL | 기능명 | 관련 기능 ID | 인증 |
|--------|--------|-----|--------|-------------|------|
| API-001 | POST | `/api/auth/login` | 로그인 | F-011 | 불필요 |
| API-002 | POST | `/api/auth/logout` | 로그아웃 | F-011 | 필요 |
| API-003 | POST | `/api/location` | 위치 전송 | F-001 | 필요(부모님) |
| API-004 | GET | `/api/location/:parentId` | 부모님 최신 위치 조회 | F-004 | 필요(가족) |
| API-005 | GET | `/api/stream` | 실시간 위치·알림 구독(SSE) | F-005, F-002 | 필요 |
| API-006 | POST | `/api/alert/emergency` | 긴급 알림 발송 | F-002 | 필요(부모님) |
| API-007 | GET | `/api/member/:parentId/phone` | 부모님 전화번호 조회 | F-006 | 필요(가족) |
| API-008 | GET | `/api/chat/:roomId/messages` | 채팅 이력 조회 | F-007 | 필요(가족) |
| API-009 | POST | `/api/chat/:roomId/messages` | 채팅 메시지 전송 | F-007 | 필요(가족) |
| API-010 | GET | `/api/admin/members` | 회원 조회 | F-008 | 필요(관리자) |
| API-011 | POST | `/api/admin/sms` | SMS 발송 | F-009 | 필요(관리자) |
| API-012 | POST | `/api/admin/kakao` | 카카오톡 알림톡 발송 | F-010 | 필요(관리자) |
| API-013 | GET | `/api/mapping` | 부모-가족 매핑 조회 | F-013 | 필요(관리자/가족) |
| API-014 | POST | `/api/mapping` | 부모-가족 매핑 생성 | F-013 | 필요(관리자/가족) |
| API-015 | DELETE | `/api/mapping/:mappingId` | 부모-가족 매핑 해제 | F-013 | 필요(관리자/가족) |

> F-003(고령자 UI)·F-014(반응형 레이아웃)은 프론트엔드 화면 기능으로 별도 API 없음.
> F-012(권한 분리)는 단일 엔드포인트가 아닌 전 API 공통 미들웨어로 적용.

---

## 3. API 상세

### API-001. 로그인 (F-011)

| 항목 | 내용 |
|------|------|
| Method | POST |
| URL | `/api/auth/login` |
| 설명 | 가족·관리자 자격 검증 후 JWT 토큰과 역할 정보를 발급한다 |

**Request**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| loginId | string | Y | 계정 ID |
| password | string | Y | 비밀번호(서버에서 bcryptjs 해시 비교) |

**Response (200 OK)**

```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOi...",
    "user": { "id": "u_123", "role": "family", "name": "홍길동" }
  }
}
```

**에러 Response**

| 상태 코드 | 에러 코드 | 조건 |
|-----------|-----------|------|
| 401 | UNAUTHORIZED | 자격 불일치 |
| 422 | UNPROCESSABLE | 필수 파라미터 누락 |

---

### API-002. 로그아웃 (F-011)

| 항목 | 내용 |
|------|------|
| Method | POST |
| URL | `/api/auth/logout` |
| 설명 | 현재 세션/토큰을 무효화한다 |

**Request**: 없음(Authorization 헤더로 식별)

**Response (200 OK)**

```json
{ "status": "success", "data": { "loggedOut": true } }
```

**에러 Response**

| 상태 코드 | 에러 코드 | 조건 |
|-----------|-----------|------|
| 401 | UNAUTHORIZED | 토큰 없음·만료 |

---

### API-003. 위치 전송 (F-001)

| 항목 | 내용 |
|------|------|
| Method | POST |
| URL | `/api/location` |
| 설명 | 부모님 단말의 GPS 좌표를 수집해 서버에 저장하고 매핑 가족에게 브로드캐스트한다 |

**Request**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| latitude | number | Y | 위도 |
| longitude | number | Y | 경도 |
| accuracy | number | N | 정확도(m) |
| timestamp | string(ISO8601) | Y | 좌표 수집 시각 |

**Response (200 OK)**

```json
{
  "status": "success",
  "data": { "saved": true, "broadcastTo": 2 }
}
```

**에러 Response**

| 상태 코드 | 에러 코드 | 조건 |
|-----------|-----------|------|
| 401 | UNAUTHORIZED | 미인증 |
| 403 | FORBIDDEN | 부모님 역할 아님 |
| 422 | UNPROCESSABLE | 좌표 형식 오류 |

> 네트워크 끊김 시 클라이언트 재전송 큐로 보정(F-001 예외 처리).

---

### API-004. 부모님 최신 위치 조회 (F-004)

| 항목 | 내용 |
|------|------|
| Method | GET |
| URL | `/api/location/:parentId` |
| 설명 | 매핑된 가족이 부모님의 최신 위치를 지도 표시용으로 조회한다 |

**Request (Path)**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| parentId | string | Y | 부모님 식별자 |

**Response (200 OK)**

```json
{
  "status": "success",
  "data": {
    "parentId": "p_001",
    "latitude": 37.5,
    "longitude": 127.0,
    "accuracy": 12.0,
    "updatedAt": "2026-06-09T09:00:00+09:00"
  }
}
```

**에러 Response**

| 상태 코드 | 에러 코드 | 조건 |
|-----------|-----------|------|
| 403 | FORBIDDEN | 매핑되지 않은 부모님 접근 |
| 404 | NOT_FOUND | 위치 데이터 없음("위치 확인 불가") |

---

### API-005. 실시간 위치·알림 구독 (F-005, F-002)

| 항목 | 내용 |
|------|------|
| Method | GET (SSE) |
| URL | `/api/stream` |
| 설명 | 가족 세션 기준 실시간 채널을 구독해 위치 갱신·긴급 알림 이벤트를 수신한다 |

**Request (Query)**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| channel | string | N | 구독 채널(기본: 매핑 가족 그룹) |

**Response (200, text/event-stream)**

```
event: location
data: { "parentId": "p_001", "latitude": 37.5, "longitude": 127.0, "updatedAt": "..." }

event: emergency
data: { "parentId": "p_001", "alertId": "a_99", "latitude": 37.5, "longitude": 127.0, "sentAt": "..." }
```

**에러 Response**

| 상태 코드 | 에러 코드 | 조건 |
|-----------|-----------|------|
| 403 | FORBIDDEN | 권한 없는 채널 구독 |

> 연결 끊김 시 클라이언트 자동 재연결 + 누락 이벤트 폴링 보정(F-005). Supabase Realtime 채택 시 동일 이벤트 스키마를 채널 메시지로 대체.

---

### API-006. 긴급 알림 발송 (F-002)

| 항목 | 내용 |
|------|------|
| Method | POST |
| URL | `/api/alert/emergency` |
| 설명 | 부모님 1-터치 긴급 버튼 입력을 받아 매핑 가족에게 현재 위치와 함께 즉시 알림을 브로드캐스트한다 |

**Request**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| latitude | number | N | 발송 시점 위도(첨부) |
| longitude | number | N | 발송 시점 경도(첨부) |

**Response (200 OK)**

```json
{
  "status": "success",
  "data": { "alertId": "a_99", "notifiedFamily": 2 }
}
```

**에러 Response**

| 상태 코드 | 에러 코드 | 조건 |
|-----------|-----------|------|
| 403 | FORBIDDEN | 부모님 역할 아님 |
| 409 | CONFLICT | 중복 연타(디바운스, 짧은 시간 내 1건 처리) |
| 422 | UNPROCESSABLE | 매핑 가족 없음(관리자 통보 처리) |

---

### API-007. 부모님 전화번호 조회 (F-006)

| 항목 | 내용 |
|------|------|
| Method | GET |
| URL | `/api/member/:parentId/phone` |
| 설명 | 가족이 "바로 전화"용으로 매핑된 부모님 전화번호를 권한 검증 후 조회한다 |

**Request (Path)**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| parentId | string | Y | 부모님 식별자 |

**Response (200 OK)**

```json
{ "status": "success", "data": { "parentId": "p_001", "phone": "010-1234-5678" } }
```

**에러 Response**

| 상태 코드 | 에러 코드 | 조건 |
|-----------|-----------|------|
| 403 | FORBIDDEN | 매핑되지 않은 부모님 접근 |
| 404 | NOT_FOUND | 전화번호 미등록(버튼 비활성 처리) |

---

### API-008. 채팅 이력 조회 (F-007)

| 항목 | 내용 |
|------|------|
| Method | GET |
| URL | `/api/chat/:roomId/messages` |
| 설명 | 가족 채팅방의 메시지 이력을 페이지네이션으로 조회한다 |

**Request**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| roomId (path) | string | Y | 채팅방(가족 그룹) 식별자 |
| cursor (query) | string | N | 페이지네이션 커서 |
| limit (query) | number | N | 페이지 크기(기본 30) |

**Response (200 OK)**

```json
{
  "status": "success",
  "data": {
    "messages": [
      { "id": "m_1", "senderId": "u_123", "text": "도착했어요", "createdAt": "..." }
    ],
    "nextCursor": "m_0"
  }
}
```

**에러 Response**

| 상태 코드 | 에러 코드 | 조건 |
|-----------|-----------|------|
| 403 | FORBIDDEN | 권한 없는 방 접근 |

---

### API-009. 채팅 메시지 전송 (F-007)

| 항목 | 내용 |
|------|------|
| Method | POST |
| URL | `/api/chat/:roomId/messages` |
| 설명 | 메시지를 저장하고 같은 가족 구성원에게 실시간 전파한다 |

**Request**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| roomId (path) | string | Y | 채팅방 식별자 |
| text | string | Y | 메시지 내용(빈 메시지 차단) |

**Response (201 Created)**

```json
{ "status": "success", "data": { "id": "m_2", "createdAt": "..." } }
```

**에러 Response**

| 상태 코드 | 에러 코드 | 조건 |
|-----------|-----------|------|
| 403 | FORBIDDEN | 권한 없는 방 접근 |
| 422 | UNPROCESSABLE | 빈 메시지 |

---

### API-010. 회원 조회 (F-008)

| 항목 | 내용 |
|------|------|
| Method | GET |
| URL | `/api/admin/members` |
| 설명 | 관리자가 회원·부모-가족 매핑 관계를 조회한다(개인정보 마스킹 적용) |

**Request (Query)**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| q | string | N | 검색어 |
| page | number | N | 페이지 |
| size | number | N | 페이지 크기 |

**Response (200 OK)**

```json
{
  "status": "success",
  "data": {
    "members": [
      { "id": "u_123", "name": "홍길동", "role": "family", "phone": "010-****-5678",
        "mappedParents": ["p_001"] }
    ],
    "total": 1
  }
}
```

**에러 Response**

| 상태 코드 | 에러 코드 | 조건 |
|-----------|-----------|------|
| 403 | FORBIDDEN | 관리자 권한 아님 |

---

### API-011. SMS 발송 (F-009)

| 항목 | 내용 |
|------|------|
| Method | POST |
| URL | `/api/admin/sms` |
| 설명 | 관리자가 선택 회원에게 외부 SMS 사업자 API로 다이렉트 발송한다 |

**Request**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| recipientIds | string[] | Y | 수신 회원 ID 목록 |
| message | string | Y | 메시지 내용 |

**Response (200 OK)**

```json
{
  "status": "success",
  "data": { "sent": 8, "failed": 1, "results": [ { "id": "u_123", "ok": true } ] }
}
```

**에러 Response**

| 상태 코드 | 에러 코드 | 조건 |
|-----------|-----------|------|
| 403 | FORBIDDEN | 관리자 권한 아님 |
| 422 | UNPROCESSABLE | 번호 형식 오류 대상(제외 처리) |
| 429 | TOO_MANY_REQUESTS | 발송 한도 초과 |
| 502 | UPSTREAM_ERROR | SMS 사업자 API 오류(재시도·실패 기록) |

---

### API-012. 카카오톡 알림톡 발송 (F-010)

| 항목 | 내용 |
|------|------|
| Method | POST |
| URL | `/api/admin/kakao` |
| 설명 | 관리자가 승인된 알림톡 템플릿으로 선택 회원에게 발송한다 |

**Request**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| recipientIds | string[] | Y | 수신 회원 ID 목록 |
| templateCode | string | Y | 승인된 알림톡 템플릿 코드 |
| variables | object | N | 템플릿 치환 변수 |

**Response (200 OK)**

```json
{ "status": "success", "data": { "sent": 7, "failed": 0 } }
```

**에러 Response**

| 상태 코드 | 에러 코드 | 조건 |
|-----------|-----------|------|
| 403 | FORBIDDEN | 관리자 권한 아님 |
| 422 | UNPROCESSABLE | 미승인 템플릿 |
| 502 | UPSTREAM_ERROR | 카카오 API 오류(재시도 / 선택적 SMS 대체) |

---

### API-013. 부모-가족 매핑 조회 (F-013)

| 항목 | 내용 |
|------|------|
| Method | GET |
| URL | `/api/mapping` |
| 설명 | 부모-가족 매핑 관계를 조회한다 |

**Request (Query)**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| parentId | string | N | 특정 부모님 기준 필터 |
| familyId | string | N | 특정 가족 기준 필터 |

**Response (200 OK)**

```json
{
  "status": "success",
  "data": { "mappings": [ { "id": "map_1", "parentId": "p_001", "familyId": "u_123" } ] }
}
```

**에러 Response**

| 상태 코드 | 에러 코드 | 조건 |
|-----------|-----------|------|
| 403 | FORBIDDEN | 관리자/해당 가족 외 접근 |

---

### API-014. 부모-가족 매핑 생성 (F-013)

| 항목 | 내용 |
|------|------|
| Method | POST |
| URL | `/api/mapping` |
| 설명 | 부모님-가족 계정을 연동(매핑)해 위치·알림 접근 범위를 설정한다 |

**Request**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| parentId | string | Y | 부모님 식별자 |
| familyId | string | Y | 가족 식별자 |

**Response (201 Created)**

```json
{ "status": "success", "data": { "id": "map_2", "parentId": "p_002", "familyId": "u_456" } }
```

**에러 Response**

| 상태 코드 | 에러 코드 | 조건 |
|-----------|-----------|------|
| 403 | FORBIDDEN | 권한 없음 |
| 404 | NOT_FOUND | 미존재 계정 매핑 |
| 409 | CONFLICT | 중복 매핑 |

---

### API-015. 부모-가족 매핑 해제 (F-013)

| 항목 | 내용 |
|------|------|
| Method | DELETE |
| URL | `/api/mapping/:mappingId` |
| 설명 | 매핑을 해제하고 해당 가족의 위치·알림 접근을 즉시 회수한다 |

**Request (Path)**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| mappingId | string | Y | 매핑 레코드 식별자 |

**Response (200 OK)**

```json
{ "status": "success", "data": { "deleted": true } }
```

**에러 Response**

| 상태 코드 | 에러 코드 | 조건 |
|-----------|-----------|------|
| 403 | FORBIDDEN | 권한 없음 |
| 404 | NOT_FOUND | 미존재 매핑 |

---

## 4. 기능-API 추적 매트릭스

| 기능 ID | 기능명 | API-ID |
|---------|--------|--------|
| F-001 | 실시간 위치 수집·전송 | API-003 |
| F-002 | 긴급 알림 발송 | API-006, API-005(브로드캐스트) |
| F-003 | 부모님 고령자 UI | (프론트엔드, API 없음) |
| F-004 | 부모님 위치 지도 표시 | API-004 |
| F-005 | 실시간 위치·알림 수신 | API-005 |
| F-006 | 바로 전화 연결 | API-007 |
| F-007 | 가족 채팅 | API-008, API-009 |
| F-008 | 회원 조회 | API-010 |
| F-009 | SMS 발송 | API-011 |
| F-010 | 카카오톡 알림톡 발송 | API-012 |
| F-011 | 로그인·인증 | API-001, API-002 |
| F-012 | 권한 분리·접근 제어 | 전 API 공통 미들웨어 |
| F-013 | 부모-가족 회원 매핑 | API-013, API-014, API-015 |
| F-014 | 반응형 레이아웃 | (프론트엔드, API 없음) |

---

**작성 완료 여부**: [x] API 스펙 작성 완료 (기능명세서 v1.0 기반, API-001~API-015 / 15개 엔드포인트)

**승인**:
- [ ] API 스펙 승인 (User Sign-off)
