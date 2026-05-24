# NotebookLM 연동 가이드

> AP-Framework V0.42 — P-103/P-104 실행 가이드
> 작성일: 2026-05-24

---

## 개요

이 가이드는 프로젝트 문서를 NotebookLM에 등록하여 AI 기반 프로젝트 위키를 구축하는 방법을 설명합니다.

| 항목 | 값 |
|------|-----|
| 노트북 URL | https://notebooklm.google.com/notebook/7a96c23d-f6c2-4006-968b-82ac366667dc |
| 노트북 ID | `7a96c23d-f6c2-4006-968b-82ac366667dc` |

---

## 방법 A. 수동 업로드 (지금 바로 가능)

NotebookLM 웹 UI에서 직접 파일을 업로드합니다.

### 단계별 절차

**Step 1.** [노트북 열기](https://notebooklm.google.com/notebook/7a96c23d-f6c2-4006-968b-82ac366667dc)

**Step 2.** 왼쪽 패널 하단 **"소스 추가(+ Add source)"** 버튼 클릭

**Step 3.** 아래 파일들을 순서대로 업로드

| 순서 | 파일 경로 | 업로드 방법 |
|------|-----------|-------------|
| 1 | `PRD.md` | 파일 업로드 또는 텍스트 붙여넣기 |
| 2 | `CLAUDE.md` | 파일 업로드 또는 텍스트 붙여넣기 |
| 3 | `00.통합자료실/README.md` | 파일 업로드 |

**Step 4.** 소스 등록 후 NotebookLM에서 아래 질문으로 동작 확인:
- "이 프로젝트의 핵심 기능을 요약해줘"
- "부모님 화면에서 SOS 알림 플로우를 설명해줘"

---

## 방법 B. CLI 자동화 (Python 설치 후 사용 가능)

### 사전 조건

Python 3.8 이상 설치 필요.

**Python 설치 (아직 없는 경우)**

1. [python.org](https://www.python.org/downloads/) 에서 Python 3.12 다운로드
2. 설치 시 **"Add Python to PATH"** 체크 필수
3. 설치 확인: `python --version`

### 설치 및 인증

```powershell
# 1. notebooklm-cli 설치
pip install notebooklm-cli

# 2. Google 인증 (Chrome이 열려 있어야 함)
# Chrome을 원격 디버깅 모드로 실행 (관리자 PowerShell):
Start-Process "chrome.exe" "--remote-debugging-port=9222 --user-data-dir=C:\temp\chrome-debug"

# 3. 인증 실행
nlm login
```

> `nlm login`은 Chrome DevTools Protocol을 사용합니다.
> Chrome이 `--remote-debugging-port=9222`로 실행된 상태에서 실행하면 Google 계정 선택 창이 뜹니다.

### 소스 업로드 명령어

```powershell
$NOTEBOOK_ID = "7a96c23d-f6c2-4006-968b-82ac366667dc"
$PROJECT_ROOT = "c:\Users\kbt test-03\부모님위치확인서비스"

# PRD.md 업로드
$prd = Get-Content "$PROJECT_ROOT\PRD.md" -Raw
nlm source add $NOTEBOOK_ID --text $prd --title "PRD - 부모님 위치 확인 서비스"

# CLAUDE.md 업로드
$claude = Get-Content "$PROJECT_ROOT\CLAUDE.md" -Raw
nlm source add $NOTEBOOK_ID --text $claude --title "CLAUDE - 프로젝트 규칙"

# 통합자료실 README 업로드
$readme = Get-Content "$PROJECT_ROOT\00.통합자료실\README.md" -Raw
nlm source add $NOTEBOOK_ID --text $readme --title "통합자료실 README"
```

### 산출물 생성 후 자동 등록 스크립트

`05.리포트/nlm-sync.ps1` 파일을 실행하면 완료된 모든 산출물을 일괄 등록합니다.

---

## 방법 C. notebooklm-mcp 사용 (MCP 설정 후)

Claude Code에 `notebooklm-mcp`가 연결된 경우:

```
NotebookLM에 PRD.md를 소스로 등록해줘
```

MCP 설정 방법: [notebooklm-mcp GitHub](https://github.com/sirmews/notebooklm-mcp)

---

## 산출물 완료 시 등록 절차 (Gate-Check 연동)

각 산출물이 완료될 때마다 아래 명령을 실행합니다:

```powershell
# 예: 착수보고서 완료 후
$content = Get-Content "01.관리문서\착수보고서.md" -Raw
nlm source add 7a96c23d-f6c2-4006-968b-82ac366667dc --text $content --title "착수보고서"
```

또는 Claude Code에서:
```
착수보고서를 NotebookLM에 등록해줘
```

---

## 현재 상태 및 다음 단계

| 단계 | 설명 | 상태 |
|------|------|------|
| 노트북 URL 확보 | .AP-key.md에 등록 완료 | 완료 |
| Python 설치 | pip 사용을 위해 필요 | **미완료** |
| notebooklm-cli 설치 | `pip install notebooklm-cli` | **미완료** |
| nlm login (Google 인증) | Chrome 원격 디버깅 필요 | **미완료** |
| PRD.md 소스 등록 | 수동 또는 CLI | **미완료** |
| 통합자료실 자료 등록 | 자료 추가 후 등록 | 대기 중 |

**추천 순서**: Python 설치 → `pip install notebooklm-cli` → Chrome 원격 디버깅으로 `nlm login` → 위 스크립트 실행
