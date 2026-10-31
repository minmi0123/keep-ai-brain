> 언제 읽나: README 「하루 흐름」·「기억 3층」, SETUP.md 4장을 고칠 때

# 006 사용 예시가 없음 (만든 사람 의견)

```yaml
상태: 반영 (main 5e4f7dc) — README tree + docs/example.md
날짜: 2026-10-31
출처: 사용자(이 방법론을 만든 본인) 의견. 집 PC 설치 직후
대상: README.md 「기억 3층」·「하루 흐름」, SETUP.md 4장 「이제 이렇게 쓰세요」
심각도: 중 — 설치는 끝났는데 "그래서 내 프로젝트에선 뭘 어떻게 하지" 가 안 보임 (004·005 질문이 바로 이것 때문에 나옴)
```

## 증상

- README·SETUP 에는 규칙과 흐름 화살표만 있고, 실제 일 하나를 처음부터 끝까지 한 예시가 없다
- 3층(kb·memory·tasks)이 각각 무엇을 받는지는 표로 있지만, 일을 하고 나면 폴더가 **실제로 어떤 모양이 되는지** 보이지 않는다

## 제안 1: 폴더 tree 예시 (일 하나를 끝낸 뒤 모습)

토이 프로젝트에서 "로또 통계 설명 문구 추가" 를 한 세션 했다고 치면:

핵심: 코드는 원래 자리(각 git repo)에 그대로 있고, brain 은 그 옆에서 "기억" 만 맡는다. brain 안에 코드를 복사하지 않는다.

```text
C:/study/
├── toy/
│   └── lotto-lab/                       ← 실제 작업 폴더 (코드, git minmi0123/lotto-lab)
│       ├── .git/
│       ├── app/                         ← React + Vite. 개발(②)은 여기서 하고 여기에 커밋·push
│       └── ...                          ← 이 repo 안에는 keep-ai-brain 파일을 두지 않는다
│
└── brain/                               ← keep-ai-brain (repo 들과 따로, kb 만 로컬 git)
    ├── kb/                              ← 계속 쌓이는 사실 (AI 의 뇌). 여러 repo 공용
    │   ├── INDEX.md                     ← 입구. 문서마다 한 줄 안내
    │   ├── overview/glossary.md         ← 업무 용어
    │   ├── patterns/golden-files.md     ← 따라 쓸 모범 파일 (예: lotto-lab/app/src/... 경로를 가리킴)
    │   ├── trouble/
    │   │   └── windows-ps-pipe-json.md  ← kb-harvest 가 새로 만든 함정 기록
    │   ├── ops/open-questions.md        ← [확인필요] 자동 모음 (손으로 안 고침)
    │   └── _tools/                      ← 점검 도구 · reports/latest.md (주간 리포트)
    └── tasks/                           ← 일 하나 = 폴더 하나 (코드 아님, 작업 기록)
        └── 261031143000lotto-lab-통계설명/
            ├── 이어하기.md              ← 지금 상태만. 첫 줄에 대상 repo 경로 C:/study/toy/lotto-lab
            ├── 이력.md                  ← 경위 (compact-confirm 이 쌓음)
            └── 기준표.md                ← ①~⑤ 전체로 했을 때만 (/criteria)

C:/Users/godgo/.claude/projects/c--study/memory/   ← memory 층 (Claude 설정 폴더 쪽, 로컬 git)
├── MEMORY.md                            ← 한 줄 목차 (매 세션 자동으로 읽힘)
└── lotto-lab-neutral-copy.md            ← 사용자 성향·작업 규칙 하나 = 파일 하나
```

어디에 커밋되나:

| 폴더 | git | 누가 커밋 |
|---|---|---|
| `toy/lotto-lab` | 원격 repo (push 함) | 개발할 때 AI·사용자 |
| `brain/kb` | 로컬 git (push 없음) | kb-harvest |
| `brain/tasks` | git 아님 | — |
| memory | 로컬 git (push 없음) | 매일 19:30 자동 스냅숏 |

(README 에 넣을 때는 경로를 `~/projects/my-app`, `~/brain/...` 같은 일반 예시로 바꾼다)

## 제안 2: 대화 예시 (같은 일을 시간순으로)

```text
1. 사용자: "로또 랩 통계 화면에 변동폭 설명 추가해줘"
2. AI (/consult): "물어볼 것 2개예요. Q1 문구는 사이트에 넣을까 블로그에 넣을까? 추천: ..."
3. AI: "토이프로젝트라 2. 개발 후 검증만 추천해요" → 사용자 "ㅇㅇ 시작해"
4. AI: tasks/261031143000lotto-lab-통계설명/ 만들고 개발 → ③ 전/후 화면 비교
5. 사용자: "compact 해도 돼?"
6. AI (/compact-confirm): 이어하기.md 덮어쓰기 · 이력.md 쌓기 → "해도 돼요. 단 kb 에 남길 게 1개 있어요"
7. AI (/kb-harvest): kb/trouble/ 에 함정 1개 기록 + kb 커밋
8. 다음 날 새 세션: "어제 거 이어서" → AI 가 이어하기.md 부터 읽고 시작
```

## 제안 3: 넣을 자리

- README 「기억 3층」 바로 아래에 제안 1 tree (경로는 `~/brain/...` 같은 일반 예시로)
- README 「하루 흐름」 아래 또는 `docs/example.md` 에 제안 2
- SETUP.md 4장 보고 끝에 "예시는 docs/example.md" 한 줄
