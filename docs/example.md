# 예시 — 일 하나를 처음부터 끝까지

> 설치는 끝났는데 "그래서 내 프로젝트에선 뭘 어떻게 하지?" 싶을 때 보는 문서예요.
> 예: 웹 앱 `my-app` 의 통계 화면에 "변동폭" 설명 문구를 넣는 작은 일 하나.

## 1. 대화 순서

```text
[첫날]
1. 사용자: "my-app 통계 화면 변동폭 옆에 툴팁으로 설명 한 줄 넣어줘"
2. AI: kb/INDEX.md 부터 봄 (통계 문서는 아직 없음)
       → 작업 폴더 tasks/261031143000my-app-통계설명/ 을 만들고 이어하기.md 를 씀
       → my-app 저장소에서 개발. 변동폭 계산이 src/stats/range.ts:12 (최고값-최저값) 에 있다는 걸 찾음
       → 시험 데이터를 PowerShell 파이프로 JSON 으로 넘기다 한 번 막힘 (앞에 BOM 이 붙음) → node 로 넘겨서 해결
       → 화면 확인 → my-app 에 커밋
   AI: "툴팁 넣었어요. 모바일 화면은 아직 못 봤어요.
        이건 kb 에 남겨 둘까요? (PowerShell 파이프 BOM 함정, 변동폭 계산 위치)"      ← AI 가 먼저 권함
   사용자: "ㅇㅇ"
3. AI (/kb-harvest): kb/trouble/windows-ps-pipe.md 새로 쓰기, kb/overview/stats.md 에 계산 위치 한 줄,
       INDEX 에 한 줄 → kb 에 커밋
4. 사용자: "오늘은 여기까지"
5. AI: "내일 이어서 하려면 지금 상태를 정리해 둘까요?"                                 ← AI 가 먼저 권함
   사용자: "응"
6. AI (/compact-confirm): 이어하기.md 를 지금 상태로 덮어쓰고, 이력.md 에 오늘 경위를 쌓음
       "정리했어요. 남은 건 모바일 화면 확인이에요"

[다음 날, 새 세션]
7. 사용자: "어제 통계설명 이어서"
8. AI: tasks/261031143000my-app-통계설명/이어하기.md 부터 읽음
       → "어제 툴팁까지 넣었고, 남은 건 모바일 화면 확인이에요. 할까요?"
```

AI 가 먼저 묻기 전에 직접 "정리해 줘", "kb 에 남겨 줘" 라고 해도 돼요. 스킬 이름(`/compact-confirm`, `/kb-harvest`)은 몰라도 돼요.

## 2. 끝난 뒤 폴더 모습

```text
~/projects/my-app/                       ← 코드 (원래 git 저장소)
├── .git/
└── src/stats/...                        ← 2 에서 고친 곳. 커밋·push 는 여기에
                                            (이 저장소 안에는 keep-ai-brain 파일을 두지 않아요)
~/brain/
├── kb/                                  ← 여러 프로젝트 공용 사실
│   ├── INDEX.md                         ← 3 에서 한 줄 추가
│   ├── overview/stats.md                ← 3 에서 계산 위치 한 줄 추가
│   ├── trouble/windows-ps-pipe.md       ← 3 에서 새로 생김
│   ├── ops/open-questions.md            ← [확인필요] 자동 모음 (손으로 안 고쳐요)
│   └── _tools/reports/latest.md         ← 매주 점검 리포트
└── tasks/
    └── 261031143000my-app-통계설명/
        ├── 이어하기.md                  ← 지금 상태만 · "대상 저장소: ~/projects/my-app"
        └── 이력.md                      ← 6 에서 쌓은 경위
~/.claude/projects/…/memory/
├── MEMORY.md                            ← 한 줄 목차 (매 세션 자동으로 읽혀요)
└── prefer-tooltip.md                    ← "설명은 툴팁 선호" 처럼 다른 일에도 통하는 성향이면 여기
```

## 3. 어디에 커밋되나

| 폴더 | git | 누가 커밋 |
|---|---|---|
| `~/projects/my-app` | 원래 저장소 (push 함) | 개발할 때 AI·사용자 |
| `~/brain/kb` | 로컬 git (push 없음) | /kb-harvest 가 고친 파일만 |
| `~/brain/tasks` | git 아님 | — (이력.md 가 경위 기록) |
| memory | 로컬 git (push 없음) | 매일 자동 스냅숏 |

## 4. 무엇이 어느 층으로 가나

| 대화에서 나온 것 | 가는 곳 | 이유 |
|---|---|---|
| "툴팁까지 넣었고 모바일 확인이 남음" | 작업 폴더 이어하기.md | 이 일에만 필요한 지금 상태 |
| "설명은 툴팁 한 줄로" | 작업 폴더 이어하기.md 「지키는 결정」 | 이 일의 결정 |
| "PowerShell 파이프에 BOM 이 붙음" | kb trouble/ | 다른 일에서도 또 만날 사실 |
| "설명은 툴팁을 좋아함" | memory | 사용자 성향 — 모든 일에 통함 |
| 변동폭 계산 코드 위치 `src/stats/range.ts:12` | kb overview/stats.md (그 기능 문서) | 다음에 통계를 고칠 때 코드를 다시 안 뒤지게 |
