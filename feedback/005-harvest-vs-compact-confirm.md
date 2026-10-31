> 언제 읽나: README 「하루 흐름」·SETUP.md 4장·kb-harvest/compact-confirm 의 description 을 고칠 때

# 005 세션을 끝낼 때 kb-harvest 와 compact-confirm 중 뭘 쓸지 헷갈림

```yaml
상태: 반영 (main 5e4f7dc) — compact-confirm 이 kb 후보가 있으면 /kb-harvest 를 이어서 묻게 함
날짜: 2026-10-31
출처: 집 PC. 사용자(이 방법론을 만든 본인)가 lotto-lab 세션을 정리하려고 "kb-harvest 쓰면 되는 거지?" 라고 물음
대상: SETUP.md:160 (4장 사용법 3번), README.md 「하루 흐름」, skills/kb-harvest/SKILL.md·skills/compact-confirm/SKILL.md description
심각도: 하 — 둘 다 돌리면 되지만, 하나만 돌리면 진행 상황(compact-confirm 몫) 또는 재사용 사실(kb-harvest 몫)이 빠짐
```

## 증상

- 4장 사용법에는 compact-confirm 만 있고 kb-harvest 는 없다. README 하루 흐름에는 둘이 이어져 있지만 "둘 다 한다" 는 게 한눈에 안 들어옴
- 만든 사람도 헷갈렸으니, 처음 쓰는 사람은 더 헷갈릴 것

## 구분 (현재 설계 기준)

| 스킬 | 남기는 것 | 어디에 |
|---|---|---|
| compact-confirm | 이 일의 지금 상태·다음 할 일·경위 | `{TASKS}/{작업}/이어하기.md`·`이력.md` |
| kb-harvest | 다른 일에도 다시 쓸 사실 (확인한 동작·함정·바로잡은 사실) | `{KB}` |

## 제안

- 4장 사용법 3번을 "세션을 끝낼 때 '정리해줘' 한 마디 → compact-confirm 이 돌고, kb 에 남길 게 있으면 kb-harvest 까지 이어서 묻는다" 로
- compact-confirm 마지막 단계에 "kb 로 옮길 후보가 있으면 /kb-harvest 를 이어서 할지 묻기" 를 넣으면 사용자는 하나만 기억하면 됨 [확인필요: compact-confirm SKILL.md 에 이미 비슷한 단계가 있는지 반영 전에 확인]
