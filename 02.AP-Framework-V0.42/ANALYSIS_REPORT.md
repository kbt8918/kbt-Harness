# AP-Framework V0.42 분석 보고서

**분석일**: 2026-06-08  
**분석 대상**: 02.AP-Framework-V0.42 폴더 (73개 파일)  
**분석 방식**: 폴더 구조 + 핵심 파일 내용 검토

---

## 1. 프레임워크 개요

### 1.1 핵심 목적
**AP-Framework V0.42**는 IT PM(프로젝트 매니저)이 Claude Code를 활용하여 프로젝트 전 단계를 자동화하는 엔드-투-엔드 프로젝트 관리 프레임워크입니다.

- **대상 사용자**: 한국 IT PM, 기획자, 개발팀
- **자동화 대상**: 문서 생성, 일정 관리, 검수, 배포, 모니터링
- **핵심 철학**: Document Chaining (17단계 의존관계 DAG) + Gate-Check (순서 강제)

### 1.2 프레임워크의 역할
- **템플릿 저장소**: 읽기 전용 참고 폴더
- **확장 불가**: 모든 프로젝트는 이 폴더를 복사하여 자신의 프로젝트 루트에서 작업
- **범용성**: 어떤 프로젝트 유형이든 적용 가능 (커머스, SaaS, 모바일 등)

---

## 2. 구조 분석

### 2.1 폴더 계층 (전체 73개 파일)

```
02.AP-Framework-V0.42/
├── 문서 시스템
│   ├── 00.통합자료실/ (5개 하위 폴더 + 참고자료 저장소)
│   ├── 01.관리문서/ (착수~완료 보고서)
│   ├── 02.기획문서/ (마켓리서치~화면설계서)
│   ├── 03.구현문서/ (인프라~디자인 가이드)
│   ├── 04.검수문서/ (테스트 시나리오 및 결과)
│   └── 05.리포트/ (온디맨드 파생 자료)
│
├── 코드 구조
│   ├── src/
│   │   ├── frontend/ (.gitkeep)
│   │   └── backend/ (.gitkeep)
│   └── tests/ (jest.config.js, helpers.js, setup.js)
│
├── 자동화 인프라
│   ├── prompts/ (주차별 5개 프롬프트 + 50개+ 스킬 명령)
│   ├── n8n/ (5개 워크플로우 JSON)
│   └── .github/workflows/ci.yml
│
└── 설정 파일
    ├── CLAUDE.template.md (기본 규칙)
    ├── PRD.template.md (프로젝트 요구사항)
    ├── .AP-key.template.md (API 키 관리)
    ├── .progress.md (진행상황 추적)
    └── CHANGELOG.md (버전 관리)
```

### 2.2 주요 파일 역할

| 파일 | 용도 | 중요도 |
|------|------|--------|
| CLAUDE.template.md | PM 역할 정의, 기술 스택, 문서 규칙 | ⭐⭐⭐⭐⭐ |
| .progress.md | 17단계 산출물 진행상황 추적 + Gate-Check | ⭐⭐⭐⭐⭐ |
| prompts/week*.md | 주차별 Claude Code 프롬프트 모음 | ⭐⭐⭐⭐ |
| n8n/*.json | GitHub/Slack 연동 자동화 워크플로우 | ⭐⭐⭐ |

---

## 3. 핵심 시스템 분석

### 3.1 Document Chaining (17단계)

프레임워크의 **가장 강력한 특징**으로, 산출물들의 의존관계를 DAG 형태로 정의합니다.

**특징**:
- 위상 정렬(topological sort) 기반 순서 강제
- 전제조건 미충족 시 Gate-Check로 진행 차단
- 병렬 실행 그룹 명시 (Group A: 4개, Group B: 3개)

**18단계 (V0.42 기본)**:
```
1. 착수보고서 → 2. WBS
                 ├─→ 3. 마켓리서치 → 4. 서비스기획서
                 └─→ 5. 요구사항정의서 → 6. 기능명세서
                                       ├─→ 7. API스펙
                                       ├─→ 8. 정보구조도 → 9. 화면설계서
                                       ├─→ 11. 시스템정의서
                                       └─→ 15. 테스트시나리오
   10. 인프라아키텍처 (9 依존)
   12. DB설계서 (6, 7 依存)
   13. 디자인 가이드 (4, 9 依존)
   14. 중간보고서 (1 + 기획 2개 依존)
   16. 테스트결과 (15 + 코드 依존)
   17. 완료보고서 (16 + 15개 산출물 依存)
```

### 3.2 기술 스택 (V0.42 표준)

프레임워크에 **하드코딩된 기본값**:

| 영역 | 기술 | 선택성 |
|------|------|--------|
| Frontend | Next.js + Tailwind CSS | 필수 |
| Backend | Express.js (M1~M4 통합 / M5+ 분리) | 필수 |
| Database | PostgreSQL | 필수 |
| Deploy | Vercel (Frontend) | 필수 |
| DB Hosting | Supabase (권장) | 선택 |
| CI/CD | GitHub Actions | 필수 |
| Wiki/Knowledge | NotebookLM | 필수 |

**마일스톤별 API 배치 정책**:
- **M1~M4** (기본): Next.js API Routes 통합 → Vercel 단일 배포
- **M5+** (트래픽 증가): Express 분리 → Render/Railway 별도 호스팅

### 3.3 NotebookLM 양방향 동기화 (V0.41 도입, V0.42 유지)

프로젝트 참고자료를 **로컬 + 클라우드 이중 관리**:

**흐름**:
```
웹/PDF/문서 수집 → NotebookLM 노트북에 소스 등록
                    ↓
             로컬 참고자료/ 폴더에 마크다운 변환 저장
                    ↓
             Git으로 버전 관리 + Claude가 직접 참조 가능
```

**소스 유형별 처리**:
- `web_page`: WebFetch로 HTML 수집 → 마크다운 변환
- `generated_text`: 로컬 문서(PRD.md 등) 복사
- `pdf`: placeholder 파일 생성 (원본 별도 확보)

### 3.4 Gate-Check (V0.41 도입, V0.42 유지)

산출물 생성 전 **전제조건 자동 검증**:

```
1. .progress.md 읽기 → 전제조건 상태 확인
2. 미충족 시 → 선행 산출물 생성 제안
3. 충족 시 → 산출물 생성 실행
4. 완료 후 → (자동 3단계)
   (a) .progress.md 상태 업데이트
   (b) NotebookLM 소스 등록
   (c) 실패 시 [NLM 미등록] 기록
5. 강제 스킵 → 사용자 명시 시 [SKIP] 태그 기록
```

---

## 4. 자동화 시스템 분석

### 4.1 주차별 프롬프트 (prompts/*.md)

| Week | 파일 | 프롬프트 수 | 핵심 작업 |
|------|------|-----------|---------|
| 1 | week1-초기화.md | P-101 ~ P-104 | 프로젝트 생성, PRD, 통합자료실, NLM 동기화 |
| 2 | week2-관리자동화.md | P-201 ~ P-208 | 착수, WBS, 주간보고, 중간/완료보고 |
| 3 | week3-기획자동화.md | P-301 ~ P-309 | 마켓~화면설계, **Group A 병렬** |
| 4 | week4-구현자동화.md | P-401 ~ P-409 | 프론트/백엔드 코드, 배포, **Group B 병렬** |
| 5 | week5-검수자동화.md | P-501 ~ P-506 | 테스트, CI/CD, 배포 검증 |

### 4.2 n8n 워크플로우 (n8n/*.json)

5개 워크플로우로 **GitHub ↔ Slack 자동 연동**:

| # | 워크플로우 | 트리거 | 동작 | 필요 권한 |
|---|-----------|--------|------|----------|
| 01 | GitHub Issue → Slack | Issue 생성/수정 | Slack 알림 전송 | GitHub PAT |
| 02 | 주간 요약 → Slack | 매주 금 17시 | Issues 요약 생성 | GitHub PAT |
| 03 | 배포 알림 → Slack | GitHub Actions | 배포 상태 전송 | Webhook |
| 04 | Chat UI Agent | n8n Chat 접근 | Gemini 기반 프로젝트 질의 | Gemini API |
| 05 | Slack PM Agent | `/깃 [질문]` | Slack에서 AI 질의 | Gemini + GitHub PAT |

**WF-04, 05 특징**:
- Google Gemini 2.0 Flash 기반 AI Agent
- 버퍼 윈도우 메모리 (최근 10턴)
- GitHub Issues/Milestones/Repo Info 도구 포함
- 3초 타임아웃 대응 (responseNode 패턴)

---

## 5. 강점 분석 (Strengths)

### 5.1 체계적 의존관계 관리
- **DAG 기반 순서 강제**: 순서 건너뛰기 불가능 → 문서 결함 방지
- **병렬 실행 명시**: Group A (4개), Group B (3개) → 시간 단축
- **실체 검증**: #16 테스트 결과, #17 완료 보고서 자동 검증

### 5.2 양방향 지식 관리
- **NotebookLM + Git 이중화**: 클라우드 검색 + 로컬 버전 관리
- **참고자료 마크다운화**: 웹 자료도 구조화된 문서로 저장 → Claude 직접 참조 가능
- **증분 동기화**: 중복 등록 방지

### 5.3 기술 스택 표준화
- **V0.42 기본값 고정**: Next.js + Express / PostgreSQL / Vercel
- **점진적 마이그레이션**: M1~M4 통합 → M5+ 분리 (비용/복잡성 최소)
- **배포 체크리스트**: Vercel/Supabase/PG사 연동 트러블슈팅 가이드 포함

### 5.4 자동화된 모니터링
- **n8n 워크플로우**: GitHub Issue ↔ Slack 실시간 연동
- **AI Agent**: Gemini 기반 프로젝트 현황 자동 질의
- **CI/CD 통합**: GitHub Actions → n8n Webhook 배포 알림

---

## 6. 개선 기회 분석 (Opportunities)

### 6.1 현황

| 영역 | 현재 상태 | 평가 |
|------|---------|------|
| 문서 자동화 | 17단계 템플릿 + 주차별 프롬프트 | ✅ 완성도 높음 |
| 진행상황 추적 | .progress.md 수동 업데이트 | ⚠️ 반자동 |
| 코드 자동화 | Week 4 프롬프트 (기본값) | ⚠️ 기술 스택 고정 |
| 배포 자동화 | CI/CD 템플릿 + 트러블슈팅 | ✅ 완성도 높음 |
| 모니터링 | n8n 워크플로우 5개 | ✅ 충분함 |
| 에러 처리 | Gate-Check + [SKIP] 태그 | ⚠️ 수동 개입 필요 |

### 6.2 개선 제안

#### **6.2.1 자동 진행상황 추적 (High Priority)**

**현재**: .progress.md를 수동으로 업데이트
**문제**: 산출물 완료 시 3가지 작업 (상태 업데이트 + NotebookLM 등록 + 기록) 중 놓치는 경우 발생

**개선안**:
```
Phase 0 (현재): 수동 업데이트
    ↓
Phase 1: Claude 자동 실행 후 .progress.md 자동 기록
    ↓
Phase 2: n8n Webhook으로 완료 신호 수신 → .progress.md 자동 업데이트
    ↓
Phase 3: 전체 자동화 (Claude + n8n + Git Commit)
```

**구현 방법**:
- 산출물 생성 후 `write_progress_md()` 헬퍼 함수 추가
- NotebookLM CLI (`nlm source add`) 자동 호출
- `.progress.md` 변경 자동 Git commit

#### **6.2.2 Harness 에이전트 팀 구축 (High Priority)**

**현재**: 단일 Claude 인스턴스로 모든 작업 수행
**문제**: 복잡한 프로젝트는 15~20개 산출물을 순차 생성 → 컨텍스트 폭발, 실수 증가

**개선안**: **에이전트 팀 기반 병렬 처리**

```
구성:
  - PM 리더 (오케스트레이터)
  - 기획 에이전트 (마켓리서치 ~ 화면설계)
  - 구현 에이전트 (인프라 ~ DB설계)
  - QA 에이전트 (테스트 시나리오 ~ 결과 검증)
  
실행:
  Week 3 기획 Phase → 기획 에이전트 팀 (3-4명) 병렬 생성
  Week 4 구현 Phase → 구현 에이전트 팀 (2-3명) 병렬 생성
  Week 5 검수 Phase → QA 에이전트 + 기획팀 협업
```

**이점**:
- 병렬성 극대화 (순차 → 병렬)
- 전문성 강화 (각 에이전트 특화)
- 품질 향상 (상호 검증)

#### **6.2.3 기술 스택 유연성 (Medium Priority)**

**현재**: V0.42 기본값 고정 (`Next.js + Express / PostgreSQL / Vercel`)
**문제**: 특수한 프로젝트 (모바일 전용, 마이크로서비스, IoT 등)는 맞지 않음

**개선안**: **기술 스택 선택 메뉴 (variant system)**

```
Level 1: 기본 (V0.42 표준)
  → Next.js + Express / PostgreSQL / Vercel

Level 2: 변형 (선택)
  → React Native (모바일)
  → FastAPI (Python 백엔드)
  → MongoDB (NoSQL)
  → AWS Lambda (서버리스)
  
선택 방법:
  PRD.md의 "기술 스택" 섹션에서 "V0.42 기본 / 변형A / 변형B" 선택
  → 산출물 템플릿 자동 선택
```

**구현**:
- `CLAUDE.template.md`에 기술 스택 선택 분기 추가
- `prompts/week4-구현자동화.md`에 스택별 코드 생성 프롬프트 추가

#### **6.2.4 NotebookLM 마크다운 템플릿 (Medium Priority)**

**현재**: 참고자료/NLM-XX_제목.md 형식만 정의
**문제**: 다양한 소스 유형(웹, PDF, 영상, 팟캐스트)에 대한 문서화 부족

**개선안**: **소스 유형별 마크다운 템플릿**

```
NLM-01_웹소스_제목.md
  ├─ 원본 URL / 수집일 / 주제
  ├─ 요약 (200자)
  ├─ 핵심 내용 (구조화된 섹션)
  └─ 프로젝트 관련성

NLM-02_PDF_제목.md (placeholder)
  ├─ PDF 제목 / 작성일 / 저자
  ├─ 주제 영역
  └─ [원본 파일 별도 확보 필요]

NLM-03_고객자료_제목.md (RFP 등)
  ├─ 문서 ID / 제공자 / 수집일
  ├─ 요구사항 정리 (REQ-XXX 형식)
  └─ 주요 제약사항
```

#### **6.2.5 배포 자동화 고도화 (Medium Priority)**

**현재**: GitHub Actions CI/CD 기본 템플릿만 제공
**문제**: 배포 후 검수가 완전히 수동 → 자동화된 Post-Deploy 검증 부족

**개선안**: **Post-Deploy 자동 검증 워크플로우**

```
배포 완료 후:
  1. Health Check (서버 응답 200)
  2. API 엔드포인트 스모크 테스트
  3. Lighthouse 성능 점수 (LCP, FID, CLS)
  4. 보안 헤더 검증 (CSP, X-Frame-Options 등)
  5. DB 마이그레이션 검증 (스키마 버전)
  6. 환경변수 존재 확인
  
실패 시:
  → Slack 알림 + 롤백 제안
```

#### **6.2.6 프롬프트 라이브러리 모듈화 (Low Priority)**

**현재**: 주차별 프롬프트 파일 (week1~5)
**문제**: 산출물 재생성/부분 수정 시 해당 프롬프트를 찾기 어려움

**개선안**: **산출물별 인덱스**

```
prompts/
├── week1-초기화.md (P-101 ~ P-104)
├── week2-관리자동화.md (P-201 ~ P-208)
├── ...
└── INDEX.md (신규)
    
    | 산출물 ID | 산출물명 | 프롬프트 ID | 주차 | 파일 |
    |-----------|---------|-----------|------|------|
    | #1 | 착수보고서 | P-201 | W2 | week2-관리자동화.md:P-201 |
    | #2 | WBS | P-202 | W2 | week2-관리자동화.md:P-202 |
    ...
```

---

## 7. 구체적 개선 로드맵

### Phase 1: 자동화 (1~2주)

**개선 6.2.1: .progress.md 자동 업데이트**
- `helpers/update_progress.js` 작성
- Claude 산출물 생성 후 자동 호출
- Git commit 자동화

**개선 6.2.2: Harness 에이전트 팀 설계**
- `.claude/agents/` 디렉토리 구조 정의
- PM 리더, 기획/구현/QA 에이전트 정의
- Week 3, 4 프롬프트에 팀 호출 통합

### Phase 2: 확장성 (2~3주)

**개선 6.2.3: 기술 스택 변형 추가**
- React Native, FastAPI, MongoDB 템플릿
- PRD.md에 스택 선택 메뉴 추가
- 스택별 코드 생성 프롬프트

**개선 6.2.4: NotebookLM 마크다운 템플릿**
- 소스 유형별 마크다운 템플릿 정의
- P-104 프롬프트에 템플릿 적용 로직 추가

### Phase 3: 모니터링 (3~4주)

**개선 6.2.5: Post-Deploy 자동 검증**
- `.github/workflows/post-deploy.yml` 작성
- Lighthouse, 보안 헤더, API 검증 포함
- n8n Webhook으로 결과 Slack 전송

### Phase 4: 조직 (4주+)

**개선 6.2.6: 프롬프트 인덱스**
- `prompts/INDEX.md` 작성
- 산출물별 프롬프트 빠른 찾기

---

## 8. 종합 평가

### 강점
✅ **최고 수준의 문서 자동화** (17단계 DAG + Gate-Check)  
✅ **양방향 지식 관리** (NotebookLM + Git)  
✅ **배포 체크리스트** (문제 해결 가이드 포함)  
✅ **자동화 인프라** (n8n 5개 워크플로우)  

### 약점
⚠️ 진행상황 추적 반자동 (수동 업데이트 필요)  
⚠️ 병렬성 제한 (단일 Claude 인스턴스)  
⚠️ 기술 스택 고정 (V0.42 기본값만)  
⚠️ 배포 후 검증 수동 (자동화 부족)  

### 최고 우선순위
1. **에이전트 팀 기반 병렬화** → 15~20개 산출물을 병렬로 생성
2. **.progress.md 자동 업데이트** → Gate-Check 실패율 감소
3. **기술 스택 변형** → 범용성 극대화

---

## 9. 추가 참고

### 파일 구조 요약
- **문서 시스템**: 00~05 폴더 (완성도 95%)
- **코드 구조**: src/, tests/ (템플릿 준비 완료)
- **자동화**: prompts/, n8n/ (주차별 프롬프트 + 5개 워크플로우)
- **설정**: CLAUDE.template, PRD.template, .AP-key.template, .progress.md

### 사용 흐름
```
1. 프로젝트 생성: P-101 (초기화)
2. PRD 작성: P-102
3. 자료 정리: P-103 (통합자료실) + P-104 (NLM 동기화)
4. Week 2~5: 주차별 프롬프트 실행
   - 각 프롬프트 완료 시 자동으로 .progress.md 업데이트
   - Gate-Check 통과한 산출물만 다음 단계 진행 가능
5. n8n 워크플로우: GitHub ↔ Slack 자동 연동
```

### 다음 단계
1. **이 보고서 검토** → 개선 우선순위 결정
2. **Harness 에이전트 설계** 착수
3. **Week 3, 4 프롬프트 개선** (병렬화)
4. **Post-Deploy 자동 검증** 추가

