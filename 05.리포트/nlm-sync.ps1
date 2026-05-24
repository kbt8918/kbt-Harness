# NotebookLM 소스 일괄 등록 스크립트
# AP-Framework V0.42 — P-103/P-104
#
# 사전 조건:
#   1. pip install notebooklm-cli
#   2. nlm login (Chrome --remote-debugging-port=9222 실행 상태에서)
#
# 실행 방법:
#   cd "c:\Users\kbt test-03\부모님위치확인서비스"
#   .\05.리포트\nlm-sync.ps1

$NOTEBOOK_ID = "7a96c23d-f6c2-4006-968b-82ac366667dc"
$PROJECT_ROOT = "c:\Users\kbt test-03\부모님위치확인서비스"

# 업로드할 파일 목록 (경로, 타이틀)
$sources = @(
  @{ Path = "PRD.md";                                      Title = "PRD - 부모님 위치 확인 서비스" },
  @{ Path = "CLAUDE.md";                                   Title = "CLAUDE - 프로젝트 규칙 V0.42" },
  @{ Path = "00.통합자료실\README.md";                     Title = "통합자료실 README" },
  @{ Path = "01.관리문서\착수보고서.md";                   Title = "[관리] 착수보고서" },
  @{ Path = "01.관리문서\WBS.md";                          Title = "[관리] WBS" },
  @{ Path = "02.기획문서\마켓리서치.md";                   Title = "[기획] 마켓리서치" },
  @{ Path = "02.기획문서\서비스기획서.md";                 Title = "[기획] 서비스기획서" },
  @{ Path = "02.기획문서\요구사항정의서.md";               Title = "[기획] 요구사항정의서" },
  @{ Path = "02.기획문서\기능명세서.md";                   Title = "[기획] 기능명세서" },
  @{ Path = "02.기획문서\API스펙.md";                      Title = "[기획] API스펙" },
  @{ Path = "02.기획문서\정보구조도.md";                   Title = "[기획] 정보구조도" },
  @{ Path = "02.기획문서\화면설계서.md";                   Title = "[기획] 화면설계서" },
  @{ Path = "03.구현문서\인프라아키텍처.md";               Title = "[구현] 인프라아키텍처" },
  @{ Path = "03.구현문서\시스템정의서.md";                 Title = "[구현] 시스템정의서" },
  @{ Path = "03.구현문서\데이터베이스설계서.md";           Title = "[구현] 데이터베이스설계서" },
  @{ Path = "03.구현문서\디자인스타일가이드.md";           Title = "[구현] 디자인스타일가이드" },
  @{ Path = "04.검수문서\테스트시나리오.md";               Title = "[검수] 테스트시나리오" },
  @{ Path = "04.검수문서\테스트결과보고서.md";             Title = "[검수] 테스트결과보고서" }
)

$uploaded = 0
$skipped = 0

Write-Host "=== NotebookLM 소스 동기화 시작 ===" -ForegroundColor Cyan
Write-Host "노트북 ID: $NOTEBOOK_ID"
Write-Host ""

foreach ($source in $sources) {
  $fullPath = Join-Path $PROJECT_ROOT $source.Path

  if (-not (Test-Path $fullPath)) {
    Write-Host "  [SKIP] $($source.Path) — 파일 없음" -ForegroundColor Yellow
    $skipped++
    continue
  }

  $content = Get-Content $fullPath -Raw -Encoding UTF8
  Write-Host "  [UPLOAD] $($source.Title) ..." -NoNewline

  try {
    nlm source add $NOTEBOOK_ID --text $content --title $source.Title
    Write-Host " 완료" -ForegroundColor Green
    $uploaded++
  } catch {
    Write-Host " 실패: $_" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "=== 동기화 완료: 업로드 $uploaded / 스킵 $skipped ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "NotebookLM에서 확인:"
Write-Host "https://notebooklm.google.com/notebook/$NOTEBOOK_ID"
