# Windows 에서 AI 와 일할 때 함정

> Windows 11 + Claude Code(PowerShell 5.1 · Git Bash) 에서 실제로 겪은 것들이에요. 대부분 **에러 없이 조용히** 깨져서 더 위험해요.
> AI 가 읽고 따르게 하려면 CLAUDE.md 에 이 문서 경로를 한 줄 적어 두세요.

## 먼저 볼 것 3가지

1. **Bash heredoc 안에 Windows 경로·정규식을 넣지 마세요.** `\\` 가 `\` 로 줄어 경로가 탭·줄바꿈으로 바뀌어요. 여러 줄 스크립트는 **파일로 만들어서** 실행해요
2. **스크립트로 md 를 고치면 CRLF 가 돼요.** Python·PowerShell 의 기본 쓰기는 `\n` 을 `\r\n` 으로 바꿔요. kb 에는 `.gitattributes` 로 LF 를 고정하고 `check-kb.cjs --fix-eol` 로 복구해요
3. **"파싱 성공" 을 믿지 마세요.** 깨진 경로가 든 JSON 도 문법은 유효해요. 경로는 실제로 있는지(`fs.existsSync`)까지 확인해요

## 1. 백슬래시가 사라짐 (heredoc)

| 증상 | 원인 | 이렇게 |
|---|---|---|
| 설정 파일의 `C:\tools\node.exe` 가 `C:<TAB>ools<LF>ode.exe` 로 바뀜. 프로그램은 "연결 끊김" 만 말함 | Bash 툴 heredoc 이 `\\` 를 `\` 로 줄이고, 저장할 때 `\t`·`\n` 이 제어 문자가 됨 | JSON 은 node 로 읽고 고쳐서 `JSON.stringify`. 경로는 `String.fromCharCode(92)` 로 조립 |
| 정규식 `/^INDEX\.md$/` 의 `\.` 가 풀려 아무 글자나 맞음 | 같은 원인. 문법 오류가 없어서 더 조용함 | 이스케이프가 필요 없는 방법을 먼저 (`name.toUpperCase() === 'INDEX.MD'`) |
| Python 문자열의 `\0`·`\r` 이 NUL·CR 바이트로 박힘 | 같은 원인 | 스크립트는 파일 편집 도구로 `.py`·`.cjs` 파일을 만들어 실행. Python 은 `r"..."` |
| `node -e '...'` 안의 `/\\/g` 가 SyntaxError | 같은 원인 | 인라인 말고 파일로 |

같은 원인으로 다섯 번 사고가 났어요. 매번 "썼다" 까지는 성공으로 보였어요.

## 2. 줄바꿈이 CRLF 로 바뀜

| 경로 | 결과 | 이렇게 |
|---|---|---|
| Python `open(p, 'w')`, `Path.write_text()` | `\n` → `\r\n` (읽을 때는 다시 `\n` 으로 보여서 눈치채기 어려움) | `open(p, 'w', encoding='utf-8', newline='\n')`, `write_text(t, encoding='utf-8', newline='\n')` |
| PowerShell `Out-File`·`>`·`Set-Content` | 기본 CRLF | 파일 편집 도구를 쓰거나, 쓴 뒤 `check-kb.cjs --fix-eol` |
| `git stash`·`checkout` (`core.autocrlf=true`) | **건드리지도 않은 파일**까지 CRLF 로 | 저장소마다 `.gitattributes` 에 `* text=auto eol=lf`. 줄바꿈이 의심될 땐 `stash` 대신 `git diff` |

**확인할 때 `grep -c $'\r'` 를 믿지 마세요.** 이 환경의 Bash 툴에선 LF 파일에 줄 수를 돌려주기도(거짓 양성), CRLF 파일에 0 을 돌려주기도(거짓 음성) 해요. 대신:

```bash
tr -cd '\r' < 파일.md | wc -c    # 0 이면 LF
```

증상: kb 점검기가 멀쩡한 문서에 "frontmatter 없음" 이라고 해요 — 첫 줄이 `---\r\n` 이라 못 알아본 거예요. 지금 점검기는 CRLF 를 따로 알려줘요.

## 3. PowerShell 5.1

| 안 되는 것 / 증상 | 대신 |
|---|---|
| `A && B`, `A \|\| B` | `A; if ($?) { B }` |
| 삼항 `? :`, `??`, `?.` | `if/else` + `$null -eq` |
| `ConvertFrom-Json -AsHashtable` | 없음. PSCustomObject 로 받음 |
| `.ps1` 안의 한글이 깨짐 | PS 5.1 은 스크립트를 ANSI 로 읽음 → 본문은 ASCII 만, 한글 경로는 인자로 |
| `Set-Content`·`Add-Content` 로 쓴 파일이 다른 도구에서 깨짐 | 기본 ANSI → `-Encoding utf8` |
| `$ErrorActionPreference = "Stop"` 인 스크립트가 정상 프로그램 실행 중 멈춤 | 네이티브 프로그램이 stderr 에 경고 한 줄만 써도 종료 오류가 됨 → 그 구간만 Stop 을 풀고 `$LASTEXITCODE` 로 판단 |
| `& .\x.ps1` 뒤 `$LASTEXITCODE` 가 성공인데도 실패처럼 보임 | 스크립트가 성공 때 `exit` 를 안 부르면 값이 안 바뀜 → 판단 전에 `$global:LASTEXITCODE = 0` |
| node 에서 `powershell -Command "& x.ps1"` → 실행 정책 오류 | 인자에 `-ExecutionPolicy Bypass` (그 프로세스에만) |
| `Invoke-WebRequest` 가 비대화 모드에서 IE 엔진 오류 | `-UseBasicParsing` |
| 따옴표 없는 `-Dfoo.bar=x` 인자가 쪼개짐 | 인자를 따옴표로 |

## 4. Git Bash·Python·기타

| 증상 | 원인 | 이렇게 |
|---|---|---|
| `node x.cjs /api/a` 가 `C:/Program Files/Git/api/a` 를 받음 | Git Bash 가 `/` 로 시작하는 인자를 Windows 경로로 바꿈 | 명령 앞에 `MSYS_NO_PATHCONV=1`, 또는 PowerShell 로 |
| 백틱이 든 글을 `python -c "..."` 로 넘겼더니 이상한 명령이 실행됨 | Bash 가 백틱을 명령 치환으로 실행 | 백틱이 든 글은 파일로 넘김 |
| `python` 이 아무것도 안 함 | PATH 의 `python` 이 Microsoft Store 스텁 | 설치한 python 을 전체 경로로. 새 스크립트는 node 가 편함 |
| `python -I` 출력 한글이 깨짐 | `-I` 는 `PYTHONIOENCODING` 을 무시 | `python -I -X utf8` |
| `python -I` 로 같은 폴더 모듈 import 실패 | `-I` 는 스크립트 폴더를 `sys.path` 에서 뺌 | 스크립트 맨 위에서 `sys.path.insert(0, 스크립트 폴더)` |
| 검색 도구(ripgrep)가 분명히 있는 파일을 못 찾음 | `.gitignore` 된 파일을 건너뜀 | 빌드 산출물을 찾을 땐 옵션으로 포함 |
| 화면에 똑같이 보이는 두 문자열이 `===` 로 안 맞음 | 웹·노션에서 붙여 넣은 글의 줄바꿈 없는 공백(U+00A0) | 비교하는 쪽을 정규화. 눈으로 판단하지 않기 |
| `python -m http.server --bind 0.0.0.0` 이 인터넷 쪽으로도 열림 | PC 에 공인 IP 가 같이 붙어 있고 방화벽이 꺼져 있으면 그대로 노출 | `127.0.0.1` 이나 내부 IP 로만 묶기 |
| Claude Code 로 백그라운드에 띄운 서버가 도중에 꺼짐 | 백그라운드 명령 기본 30분 제한 | 오래 쓸 서버는 timeout 을 길게, 끝나면 직접 끄기 |

## 5. 작업 스케줄러

| 증상 | 원인 | 이렇게 |
|---|---|---|
| 손으로 돌리면 되는데 스케줄러에선 실패 | 작업 계정의 PATH 에 node·git 이 없음 | node·git 을 절대 경로로 (`register-windows.ps1` 이 그렇게 등록) |
| `.bat` 에서 `echo exit %RC%>> log` 가 로그에 안 남음 | `1>>` 처럼 숫자 바로 뒤 `>>` 는 "1번 출력 리다이렉트" 로 읽힘 | `>>` 앞에 항상 공백. 가능하면 bat 대신 node 스크립트 |
| 그 시각에 PC 가 꺼져 있어서 안 돌았음 | 기본 설정은 건너뜀 | `-StartWhenAvailable` (켜진 뒤 바로 실행) |
