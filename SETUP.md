# SETUP — keep-ai-brain 설치 (AI 가 읽고 따르는 문서)

> 이 문서는 **설치를 맡은 AI** 에게 하는 말이다. 사용자는 "SETUP.md 읽고 설치해 줘" 라고만 한다.
> 너는 이 PC 를 먼저 점검하고(0장), 사람만 정할 수 있는 것만 묻고(1장), 기존 설정을 덮어쓰지 않고 설치하고(2장), 확인한 뒤(3장) 보고한다(4장).

## 지킬 것

```yaml
덮어쓰기_금지: 이미 있는 CLAUDE.md·settings.json·스킬·메모리·kb 는 덮어쓰지 않는다. 합치거나, 사용자에게 묻는다
설정_파일_백업: settings.json·CLAUDE.md 를 고치기 전에 같은 폴더에 {이름}.before-keep-ai-brain 으로 복사해 둔다. 스킬 폴더는 예외 — {CONFIG}/skills 안에 백업하면 스킬로 다시 읽히므로 {CONFIG}/backups/keep-ai-brain/{이름}/ 에 둔다 (2-3)
JSON_편집: settings.json·config.json 은 node 로 읽고 고쳐서 JSON.stringify 로 쓴다. 문자열 치환 금지. 쓴 뒤 다시 파싱하고 경로가 실제로 있는지(fs.existsSync) 확인한다 — 아직 만들기 전인 폴더(2-1 시점의 {TASKS} 등)는 그 폴더를 만든 단계가 끝난 뒤 확인한다
Windows: Bash heredoc 안에 백슬래시 경로를 넣지 않는다 — 조용히 깨진다(docs/windows-pitfalls.md 1장). 여러 줄은 스크립트 파일을 만들어 실행한다. md 를 스크립트로 쓰면 LF 로 쓴다
묻기: 1장 질문만 묻는다. 한 번에 하나씩, 추천안과 함께. 코드·명령으로 알 수 있는 것은 묻지 않는다
외부로_나가는_것: 스케줄러 등록·MCP 설치처럼 PC 상태를 바꾸는 것은 사용자가 "예" 한 것만
중간_실패: 한 단계가 실패하면 다음 단계로 넘어가지 말고 원인과 함께 멈춰서 보고한다. 단 사용자가 남기기로 한 기존 메모리 문제 때문에 점검 결과가 "문제 있음"(exit 1)인 것은 실패가 아니다 (2-2·2-6·3장)
```

이 문서에서 `{REPO}` = 이 SETUP.md 가 있는 폴더(clone 한 keep-ai-brain), `{CONFIG}` = Claude Code 설정 폴더.

**경로 쓰는 법 (전부 같은 규칙)**: 설정 파일·CLAUDE.md·명령에 넣는 경로는 **절대 경로**, 구분자는 **슬래시(`/`)** 로 쓴다 (Windows 도 `C:/Users/me/brain/kb`). 상대 경로는 실행한 폴더 기준으로 풀려 틀어진다. 명령에 넣을 때는 공백이 있을 수 있으니 **항상 따옴표**로 감싼다.

## 0. 자가점검 — 이 PC 를 먼저 본다

아래를 실제로 확인하고, 결과를 표로 사용자에게 보여 준다. ❌ 가 있으면 고치는 방법을 같이 말한다.

| # | 점검 | 확인 방법 | 기준 · 안 되면 |
|---|---|---|---|
| 1 | OS · 셸 | 환경 정보, `uname -a` 또는 `$PSVersionTable` | Windows 면 docs/windows-pitfalls.md 를 먼저 읽는다 |
| 2 | Node.js | `node -v` | 18 이상. 없으면 설치 안내하고 멈춘다 (점검 도구·hook·스케줄러가 node 로 돈다) |
| 3 | git | `git --version`, `git config --global user.name`, `user.email` | 없으면 설치 안내하고 멈춘다. 이름·이메일이 비면 1장에서 묻는다 |
| 4 | Claude Code 설정 폴더 `{CONFIG}` | 환경변수 `CLAUDE_CONFIG_DIR` 이 있으면 그 값, 없으면 홈의 `.claude` | 폴더가 있어야 한다. `{CONFIG}/skills`·`{CONFIG}/CLAUDE.md`·`{CONFIG}/settings.json` 이 있는지 적어 둔다 |
| 5 | 같은 이름 스킬 | `{CONFIG}/skills/` 에 consult · kb-harvest · compact-confirm · criteria · critic 이 있나 | 있으면 1장에서 묻는다 (건너뛰기 / 덮어쓰기 / 이름 바꿔 설치) |
| 6 | 메모리 폴더 | 이 세션 지시문에 지속 메모리 폴더 경로가 나와 있나 (예: `{CONFIG}/projects/…/memory`) | 있으면 그 폴더를 `{MEMORY}` 로 쓴다. 없으면 1장에서 묻는다 |
| 7 | 이미 쓰는 지식 폴더 | `{CONFIG}/CLAUDE.md` 와 지금 프로젝트의 `CLAUDE.md` 에 kb·notes·docs 같은 지식 폴더 언급이 있나 | 있으면 1장에서 "새로 만들기 / 그 폴더를 kb 로" 를 묻는다 |
| 8 | 웹 화면이 있는 프로젝트인가 | 지금 폴더나 사용자 CLAUDE.md 에 프론트엔드 흔적(package.json 의 react·vue·next, html 등) | 있으면 9 를 권장으로 올린다 |
| 9 | Playwright MCP | `claude mcp list` (설정 폴더에 `.claude.json` 등이 없으면 새로 만들 수 있다 — 보통은 이미 있다) | 웹 프로젝트면 **강력 권장** — ③ 전/후 비교에서 AI 가 화면을 직접 캡처하고 확인한다. 1장에서 묻는다 |
| 10 | (Windows) 줄바꿈 설정 | `git config --global core.autocrlf` | `true` 여도 괜찮다 — kb·메모리 저장소에 `.gitattributes` 로 LF 를 고정한다. 전역 설정은 바꾸지 않는다 |
| 11 | 기존 hook | `{CONFIG}/settings.json` 의 `hooks` 에 이미 있는 항목, 그 명령이 가리키는 파일이 있는지 | 고치지 않는다. 파일이 없는 hook 이 있으면 보고만 한다 |

## 1. 사용자에게 물을 것

0장 표를 보여 준 뒤, 아래를 **한 번에 하나씩** 묻는다. "물어볼 것 N개예요" 를 먼저 말한다. 0장으로 답이 정해진 질문은 건너뛴다.

| # | 질문 | 추천안 |
|---|---|---|
| Q1 | kb(지식 폴더)를 어디에 둘까요? | 홈 아래 `brain/kb` (예: `~/brain/kb`, Windows `C:\Users\{이름}\brain\kb`). 0장 7 에서 찾은 폴더가 있으면 그것도 선택지로 |
| Q2 | 작업 폴더(일 하나 = 폴더 하나, 그 일의 메모를 두는 곳 — 코드 저장소가 아니에요)는 어디에 둘까요? 프로젝트 저장소 **안**을 고르면 메모가 커밋에 섞인다고 말하고 밖을 권한다 | kb 폴더와 **나란히** 둔 `tasks` (kb 가 `~/brain/kb` 면 `~/brain/tasks`, 기존 폴더 `D:/notes` 를 kb 로 골랐으면 `D:/tasks`) |
| Q3 | (0장 6 에서 못 찾았을 때만) 메모리 폴더는 어디에 둘까요? | kb 와 나란히 둔 `memory` |
| Q4 | (0장 5 에서 겹칠 때만) 같은 이름 스킬이 있어요. 어떻게 할까요? 선택지마다 영향을 같이 말한다 — **건너뛰면** keep-ai-brain 흐름(CLAUDE.md 블록·다른 스킬)이 부르는 `/{이름}` 이 사용자의 옛 스킬로 가서 흐름이 어긋난다 · **덮어쓰면** 옛 스킬이 없어진다(백업은 `{CONFIG}/backups/keep-ai-brain/` 에 남긴다) · **이름 바꿔 설치**하면 둘 다 남는다 | **이름 바꿔 설치** (`kab-{이름}`, 예 `kab-consult`) — 기존 것도 지키고 흐름도 맞는다 |
| Q5 | 남의 코드나 레거시를 분석하면서 문제를 기록할 일이 많나요? (이슈 대장) | 아니면 "끔". 레거시 분석·인수인계면 "켬" |
| Q6 | AI 가 절대 하면 안 되는 명령이 있나요? 예: 운영 DB 주소, 강제 push, 읽기 전용 폴더 | "운영 DB 주소가 있으면 알려 주세요. 없으면 강제 push 만 막을게요" |
| Q7 | 자동 작업을 등록할까요? (1) 메모리 매일 자동 커밋 (2) 매주 뇌 점검 리포트 — 둘 다 / 하나만 / 안 함 | 둘 다 |
| Q8 | (0장 8·9 에서 해당할 때만) Playwright MCP 를 설치할까요? | 웹 프로젝트면 예 |
| Q9 | (0장 3 에서 비었을 때만) git 커밋에 쓸 이름·이메일 | — |

답을 다 받으면 **설치 계획**을 표로 한 번 보여 주고("어디에 무엇을 만들고, 어떤 파일에 무엇을 더하나"), 사용자가 "진행" 하면 2장을 한다.

## 2. 설치

단계마다 끝나면 확인 줄대로 확인하고 다음으로 간다. 경로는 1장 답으로 채운다: `{KB}` · `{TASKS}` · `{MEMORY}`.

### 2-1. kb

1. `{KB}` 가 없으면 `{REPO}/templates/kb/` 를 통째로 복사한다 (숨김 파일 `.gitattributes`·`.ignore`·`.gitignore` 포함). 이미 있는 폴더를 kb 로 쓰기로 했으면 **파일을 덮어쓰지 말고** 없는 것만 복사하고, 기존 INDEX.md 가 있으면 템플릿 INDEX.md 의 규칙 절을 합칠지 사용자에게 보여 주고 묻는다
2. `{REPO}/kb-tools/` 를 `{KB}/_tools/` 로 복사한다
3. `{KB}/_tools/config.json` 을 node 로 고친다: `memory.dir` = `{MEMORY}`, `tasks.dir` = `{TASKS}` (절대 경로·슬래시), `issues.enabled` = Q5. 이슈 대장을 켰으면 `{KB}/INDEX.md` ops 표의 `open-questions.md` 줄 **바로 아래**에 `| [issues.md](ops/issues.md) | **자동 생성** — 이슈 대장. 개발·수정 범위를 잡을 때 |` 를 더하고, 표 아래의 `> 이슈 대장을 켜면 …` 안내 문장은 지운다
4. `{KB}` 에서 `git init` (이미 git 이면 건너뜀) → `node _tools/check-kb.cjs` → 생긴 파일까지 `git add -A` → `git commit -m "keep-ai-brain kb 시작"` (새 저장소의 첫 커밋이라 `add -A` 를 써도 된다)

확인: `node {KB}/_tools/check-kb.cjs` 가 exit 0, "깨진 링크 : 0건"

### 2-2. 작업 폴더 · 메모리

1. `{TASKS}` 가 없으면 만든다. 양식은 `{REPO}/templates/task/` 에 있다 — 지금 복사하지 않는다 (일을 시작할 때 AI 가 쓴다)
2. `{MEMORY}` 가 없으면 만든다. `{MEMORY}/MEMORY.md` 가 없을 때만 `{REPO}/templates/memory/MEMORY.md` 를 복사한다. 있으면 건드리지 않는다
3. **`{MEMORY}/.git` 폴더가 없으면** `git init` → `{KB}/.gitattributes` 를 복사 → `git add -A` → `git commit -m "메모리 시작 스냅숏"`. (`git rev-parse` 로 판단하지 않는다 — 상위 폴더가 git 이면 "이미 git" 으로 잘못 보이고, 자동 커밋 등록은 `{MEMORY}/.git` 을 본다)

확인: `node "{KB}/_tools/check-memory.cjs"` 가 "문제 : 0건". 기존 메모리가 있었다면 나온 문제(목차에 없는 파일 등)를 사용자에게 보여 주고 고칠지 묻는다 — **설치 실패가 아니다.** 고치지 않기로 하면 3장(그리고 주간 점검을 켰으면 주간 리포트)에도 같은 문제가 나온다고 말해 둔다

### 2-3. 스킬

1. Q4 에서 "덮어쓰기" 한 스킬은 먼저 기존 폴더를 `{CONFIG}/backups/keep-ai-brain/{이름}/` 으로 복사한 뒤 원래 폴더를 지운다. 그 자리에 이미 백업이 있으면(다시 설치할 때) 덮지 말고 `{이름}-{yyMMddHHmm}/` 으로 둔다 — 처음 원본을 잃지 않게. **`{CONFIG}/skills/` 안에 백업하지 않는다** — Claude Code 는 폴더 이름과 상관없이 `skills/` 아래의 SKILL.md 를 읽어서 같은 이름 스킬이 둘이 된다
2. `{REPO}/skills/` 아래 다섯 폴더를 `{CONFIG}/skills/` 로 복사한다. Q4 에서 "건너뛰기" 한 것은 뺀다
3. "이름 바꿔 설치" 한 것은 폴더 이름과 SKILL.md 의 `name:` 을 바꾸고, **부르는 곳도 같이 바꾼다**: 설치한 스킬 **전부(이름을 바꾼 스킬 자신의 description 포함)** 와 2-4 에서 붙일 CLAUDE.md 블록에서 `/{옛 이름}` 을 `/{새 이름}` 으로 (예 `/consult` → `/kab-consult`). 바꾼 뒤 설치한 파일들에 `/{옛 이름}` 이 남았는지 검색한다

확인: `{CONFIG}/skills/{이름}/SKILL.md` 다섯 개(또는 고른 만큼)가 있고, `{CONFIG}/skills/` 아래에 같은 `name:` 을 가진 SKILL.md 가 둘 이상 없다. 새 세션부터 `/consult` 등이 보인다 — 이름을 바꿨으면 바꾼 이름(`/kab-consult`)으로 보이고, `/consult` 는 사용자의 옛 스킬이다

### 2-4. CLAUDE.md

1. `{CONFIG}/CLAUDE.md` 를 백업한다 (없으면 새로 만든다)
2. `{REPO}/templates/CLAUDE.md` 의 내용을 맨 끝에 빈 줄 하나를 두고 붙인다 — 첫 줄 HTML 주석은 빼고, 「keep-ai-brain 경로」 표의 `(설치 때 채움)` 을 실제 `{KB}`·`{TASKS}`·`{MEMORY}` 경로(절대 경로·슬래시)로 바꾼다. 2-3 에서 이름을 바꾼 스킬이 있으면 블록 안의 `/{옛 이름}` 도 바꾼다
3. 이미 `## keep-ai-brain` 절이 있으면 붙이지 말고 경로만 맞는지 본다
4. 사용자 CLAUDE.md 에 이 블록과 부딪히는 규칙(예: "질문하지 말고 바로 해")이 있으면 붙이기 전에 보여 주고 어느 쪽을 따를지 묻는다

확인: CLAUDE.md 에 경로 세 개가 실제 경로로 들어 있고, 그 폴더가 있다

### 2-5. 안전장치 hook

1. `{REPO}/hooks/` 의 `guard.mjs`·`guard.config.json` 두 파일을 `{CONFIG}/hooks/keep-ai-brain/` 로 복사한다 (`test-guard.cjs` 는 복사하지 않고 `{REPO}/hooks/` 에 있는 그대로 부른다 — 옆의 예시 설정을 쓰기 때문. 현재 폴더는 상관없다)
2. `guard.config.json` 을 Q6 답으로 고친다 (node 로). 들어 있는 항목은 **전부 예시**다 — 사용자가 고른 것만 남기고 나머지는 지운다. 강제 push 막기는 남기는 것이 기본이다. 막을 게 없는 칸은 빈 배열 (사용자가 전부 끄는 것도 된다 — 확인은 아래 자가시험으로)
3. `{CONFIG}/settings.json` 을 백업하고 node 로 `hooks.PreToolUse` 배열에 **항목을 더한다** (기존 항목은 고치지 않는다 — 0장 11 에서 본 문제는 보고만):
   ```json
   { "matcher": "Bash|PowerShell|Edit|Write|NotebookEdit",
     "hooks": [ { "type": "command", "command": "node \"{CONFIG}/hooks/keep-ai-brain/guard.mjs\"" } ] }
   ```
   경로는 실제 경로로, Windows 도 슬래시(`/`)로 쓴다

확인: 시험 스크립트로 hook 에 입력을 직접 넣어 본다 — 실제 명령은 실행하지 않는다. `echo '…' | node guard.mjs` 처럼 셸 파이프로 시험하지 않는다 (PowerShell 5.1 은 BOM 을 붙이는 등 셸마다 입력이 달라져서, "출력 없음" 이 차단 실패인지 입력이 깨진 것인지 구분이 안 된다).
```bash
node "{REPO}/hooks/test-guard.cjs" "{CONFIG}/hooks/keep-ai-brain/guard.mjs" --example --deny "git push -f origin main"
```
- 기본 시험(자가시험 막힘 · 평범한 명령 통과 · 깨진 입력 통과)과 `--example`(repo 예시 설정 사본으로 차단 동작)은 언제나 돌린다
- `--deny "명령"` 은 **설치한 설정**이 막는지 본다. Q6 에서 남긴 패턴마다 막혀야 할 명령을 하나씩 넣는다 (강제 push 를 남겼으면 위 예처럼). 차단 목록을 전부 비웠으면 `--deny` 를 빼고, 출력의 "차단 목록 비어 있음" 줄을 4장 표에 그대로 옮긴다
- 마지막 줄이 "전부 통과" 면 된다. 명령에 백슬래시가 들어가면 셸 대신 node 스크립트에서 test-guard.cjs 를 부른다
- 이 시험은 guard.mjs 자체만 본다. **실제 세션에서 hook 이 불리는지**는 4장 안내대로 새 세션에서 `echo keep-ai-brain-guard-selftest` 를 시켜 막히는지로 확인한다

### 2-6. 자동 작업 (Q7 에서 고른 것만)

- Windows:
  ```powershell
  powershell -ExecutionPolicy Bypass -File "{REPO}/scheduler/register-windows.ps1" -Kb "{KB}" -Memory "{MEMORY}"
  ```
  주간 점검만 고르면 `-Memory` 를 빼고, 메모리 커밋만 고르면 `-SkipWeekly` 를 붙인다
  스크립트는 `{REPO}` 를 가리키므로 **{REPO} 폴더를 지우거나 옮기면 안 된다** 고 사용자에게 말한다 (옮길 거면 `{REPO}/scheduler` 를 `{KB}/_tools/scheduler` 로 복사한 뒤 그 경로로 등록)
- macOS·Linux: `{REPO}/scheduler/crontab.example` 의 두 줄을 실제 경로로 채워 보여 주고, 사용자가 "예" 하면 `crontab -l` 에 더한다

확인: Windows 는 `Get-ScheduledTask -TaskName 'KeepAiBrain*'` 에 고른 만큼, `node "{REPO}/scheduler/weekly-check.cjs" "{KB}"` 를 한 번 돌려 `{KB}/_tools/reports/latest.md` 가 생김. 리포트가 "문제 있음" 이어도 2-2 에서 남기기로 한 메모리 문제뿐이면 정상이다

### 2-7. Playwright MCP (Q8 이 예일 때)

- `claude mcp add --help` 로 이 버전의 문법을 확인한 뒤, 사용자 범위로 추가한다. 보통: `claude mcp add playwright -s user -- npx @playwright/mcp@latest`
- Windows 에서 추가는 됐는데 새 세션에서 연결이 안 되면, 지우고(`claude mcp remove playwright -s user`) `-- cmd /c npx @playwright/mcp@latest` 로 다시 추가해 본다
- 브라우저 설치가 필요하다고 나오면 안내대로 한다 (수백 MB 내려받는다고 먼저 말한다)

확인: `claude mcp list` 에 playwright 가 보인다 (새 세션부터 쓸 수 있다)

## 3. 마지막 확인

```bash
node "{KB}/_tools/check-brain.cjs"
```

- 세 층 모두 "문제" 0 이면 설치 끝. 경고는 보여 주기만 한다
- 문제가 있으면 무엇이 왜 문제인지 보고하고 고칠지 묻는다. 2-2 에서 사용자가 남기기로 한 기존 메모리 문제는 설치 실패가 아니다 — 4장 표에 ⚠️ 로 적는다

## 4. 보고

아래 양식을 실제 경로·결과로 채운다. `/` 로 나뉜 칸은 해당하는 것만 남긴다 (hook 칸은 시험 결과 ✅ 와 목록 상태 하나를 둘 다 쓴다). 조건이 붙은 줄은 해당할 때만 남기고, 스킬 이름을 바꿔 설치했으면 안내 속 `compact-confirm` 폴더도 바꾼 이름으로 쓴다.

```markdown
**keep-ai-brain 설치를 끝냈어요.**

| 무엇 | 위치 | 결과 |
|---|---|---|
| kb | {KB} | ✅ 점검 0건, 첫 커밋 {해시} |
| 작업 폴더 | {TASKS} | ✅ |
| 메모리 | {MEMORY} | ✅ git 시작 / 기존 메모리 유지 / ⚠️ 기존 메모리 문제 {N}건 남김 ({내용} — 사용자가 고치지 않기로 함) |
| 스킬 | {CONFIG}/skills | ✅ 5개 (이름 바꿈: … / 건너뜀: … / 덮어씀: … — 옛 것은 {CONFIG}/backups/keep-ai-brain/) |
| CLAUDE.md | {CONFIG}/CLAUDE.md | ✅ 블록 추가 (백업: …) |
| hook | {CONFIG}/hooks/keep-ai-brain | ✅ test-guard 전부 통과 ({N}건) + 목록 상태 하나: 막는 것 {Q6 에서 남긴 것} / ⚠️ 차단 목록 비어 있음 — 지금은 자가시험 말고는 아무것도 막지 않아요 (settings.json 백업: …) |
| 기존 hook | {CONFIG}/settings.json | 문제 없음 / ⚠️ {명령} — 가리키는 파일이 없음, 손대지 않음 (0장 11) |
| 자동 점검 | 작업 스케줄러 / cron | ✅ 매일 19:30 · 매주 월 09:30 / 안 함 |
| Playwright | MCP | ✅ / 안 함 |

**이제 이렇게 쓰세요**
1. Claude Code 를 새로 시작하세요 (스킬·hook 이 새 세션부터 켜져요). 새 세션에서 "`echo keep-ai-brain-guard-selftest` 실행해 봐" 라고 하면 안전장치가 막는지 볼 수 있어요
2. 평소처럼 요청하면 AI 가 먼저 질문해요. 바로 하고 싶으면 "바로 해"
3. 세션을 끝내거나 compact 하기 전에 "compact 해도 돼?" — 이 일의 진행 상황을 작업 폴더에 남기고, 다른 일에도 쓸 사실이 있으면 kb 에 넣을지(/kb-harvest) 이어서 물어봐요. 하나만 기억하면 돼요
4. (Q7 에서 주간 점검을 골랐을 때만) 매주 월요일에 점검 리포트가 생겨요. 처리 안 된 문제가 있으면 다음 세션에서 AI 가 먼저 알려 줘요. "처리해줘" 하면 고치고, 경고는 고칠지 물어봐요

설치 전에 열려 있던 세션: 스킬·CLAUDE.md 블록이 안 보일 수 있어요. 그 세션의 대화를 남기고 싶으면 그 세션에서 "`{CONFIG}/CLAUDE.md` 의 keep-ai-brain 절과 `{CONFIG}/skills/compact-confirm/SKILL.md` 읽고 그대로 따라 해줘" 라고 하면 돼요 (kb-harvest 도 같은 방법)

일 하나를 끝내면 폴더가 어떻게 되는지, 대화는 어떻게 흘러가는지: `{REPO}/docs/example.md`

되돌리기: 아래 「되돌리기」 절
```

## 업데이트 — 이미 설치한 PC 에서 새 버전 받기

사용자가 "SETUP.md 의 업데이트 절 따라 해줘" 라고 하면 한다. **`git pull` 만으로는 설치본이 안 바뀐다** — 2장에서 스킬·hook·점검 도구를 `{CONFIG}`·`{KB}` 로 복사했기 때문이다 (자동 작업만 `{REPO}/scheduler` 를 직접 가리켜서 pull 로 바뀐다).

1. 경로: `{CONFIG}/CLAUDE.md` 「keep-ai-brain 경로」 표에서 `{KB}`·`{TASKS}`·`{MEMORY}`. 이름 바꿔 설치한 스킬(`kab-*`)이 있는지 `{CONFIG}/skills/` 를 본다
2. `git -C "{REPO}" rev-parse HEAD` 를 적어 두고 `git -C "{REPO}" pull` → `git -C "{REPO}" diff --stat {적어 둔 해시} HEAD` 로 바뀐 파일을 본다. 이미 pull 했으면 설치본과 `{REPO}` 를 파일마다 비교한다
3. 바뀐 것만 설치본에 덮어쓴다. 덮어쓰기 전에 설치본이 `{REPO}` 의 **옛 버전과 다르면**(사용자가 손으로 고친 것) diff 를 보여 주고 묻는다

| {REPO} | 설치본 | 어떻게 |
|---|---|---|
| `hooks/guard.mjs` | `{CONFIG}/hooks/keep-ai-brain/guard.mjs` | 덮어쓴다 |
| `skills/{이름}/` | `{CONFIG}/skills/{이름}/` | 덮어쓴다. 이름 바꿔 설치했으면 2-3 의 3번처럼 이름·부르는 곳도 바꾼다 |
| `kb-tools/*.cjs` | `{KB}/_tools/` | 덮어쓴다 |
| `kb-tools/config.json` | `{KB}/_tools/config.json` | **덮어쓰지 않는다** (사용자 값). 새 키가 생겼으면 그 키만 node 로 더한다 |
| `hooks/guard.config.json` | 같은 이름 | **덮어쓰지 않는다** (사용자가 고른 차단 목록) |
| `templates/CLAUDE.md` | `{CONFIG}/CLAUDE.md` 의 keep-ai-brain 절 | 바뀐 줄만 보여 주고 묻는다. 경로 표는 그대로 |
| `templates/kb/*` · `templates/memory/*` · `templates/task/*` | — | 건드리지 않는다 (이미 사용자 데이터). 새 양식은 다음에 만드는 작업 폴더부터 |

4. 확인: `node "{REPO}/hooks/test-guard.cjs" "{CONFIG}/hooks/keep-ai-brain/guard.mjs" --example` 가 전부 통과, `node "{KB}/_tools/check-brain.cjs"` 가 설치 때와 같은 결과. 보고는 "바꾼 파일 / 그대로 둔 파일 / 사용자에게 물은 것" 표로
5. "Claude Code 를 새로 시작하세요" 라고 말한다 — 스킬·hook 은 새 세션부터 바뀐다

## 되돌리기

| 무엇 | 방법 |
|---|---|
| CLAUDE.md · settings.json | `{이름}.before-keep-ai-brain` 백업으로 되돌린다 |
| 스킬 | `{CONFIG}/skills/` 에서 설치한 다섯 폴더를 지운다. 덮어쓴 스킬은 `{CONFIG}/backups/keep-ai-brain/{이름}/` 을 `{CONFIG}/skills/{이름}/` 으로 되돌린다 |
| hook | settings.json 에서 guard.mjs 항목을 빼고 `{CONFIG}/hooks/keep-ai-brain/` 를 지운다 |
| 자동 점검 (Windows) | `Unregister-ScheduledTask -TaskName KeepAiBrainMemorySnapshot -Confirm:$false` · `KeepAiBrainWeeklyCheck` 도 같이 |
| 자동 점검 (cron) | `crontab -e` 에서 두 줄을 지운다 |
| kb · 작업 폴더 · 메모리 | 사용자 데이터라 지우지 않는다. 지울지는 사용자가 정한다 |
