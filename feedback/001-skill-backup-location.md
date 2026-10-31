> 언제 읽나: SETUP.md 2-3 (스킬 설치)·Q4 를 고칠 때

# 001 스킬 덮어쓰기 백업 위치가 정해져 있지 않음

```yaml
상태: 미반영
날짜: 2026-10-31
출처: 집 PC 첫 설치 (기존 consult 스킬이 있었고, 사용자가 Q4 에서 "덮어쓰기" 선택)
대상: SETUP.md:49 (Q4 "덮어쓰면 ... 백업은 남긴다"), SETUP.md:81 (2-3 1번)
심각도: 중 — 잘못 두면 조용히 스킬이 두 개가 됨
```

## 증상

- Q4 는 "덮어쓰면 옛 스킬이 없어진다(백업은 남긴다)" 라고 말하지만, 2-3 에 백업 절차·위치가 없다
- 설정 파일 백업 규칙(`{이름}.before-keep-ai-brain`, 같은 폴더)을 그대로 적용하면 `{CONFIG}/skills/consult.before-keep-ai-brain/SKILL.md` 가 된다
- Claude Code 는 `skills/` 아래 폴더의 SKILL.md 를 폴더 이름과 상관없이 읽는다 → `name: consult` 인 스킬이 두 개 로드될 수 있다 [확인필요: 실제 중복 시 어느 쪽이 이기는지는 시험 안 함]

## 이번에 한 것

- 백업을 skills 밖에 둠: `{CONFIG}/backups/keep-ai-brain/consult/`
- 그 뒤 원래 폴더를 지우고 새 consult 복사

## 제안

- SETUP.md 2-3 에 "덮어쓰기 한 스킬은 `{CONFIG}/backups/keep-ai-brain/{이름}/` 으로 복사한 뒤 지우고 설치한다. `skills/` 안에 백업하지 않는다 (스킬로 다시 읽힌다)" 추가
- 「지킬 것」 의 `설정_파일_백업` 에 "스킬 폴더는 예외 — 위 위치" 한 줄
- 「되돌리기」 표의 스킬 줄에 "덮어쓴 스킬은 backups 에서 되돌린다" 추가
