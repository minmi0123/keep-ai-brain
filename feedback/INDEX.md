> 언제 읽나: keep-ai-brain 을 고치기 전. 다른 환경(집 PC 토이 프로젝트)에서 써 보고 모은 피드백 목록

# feedback 목차

## 금지 (먼저 읽는다)

- **이 브랜치(`feedback`)는 main 에 merge·rebase·cherry-pick 하지 않는다.** feedback 폴더는 main 에 절대 들어가면 안 된다
- 반영은 main 에서 해당 파일을 직접 고쳐 커밋한다. 여기에는 피드백 파일의 `상태:` 와 목차 상태 칸만 바꾸고, 반영한 main 커밋 해시를 적는다
- PR 을 만들 때 base 를 main 으로 한 feedback → main PR 은 만들지 않는다

- 피드백 하나 = 파일 하나 `{번호3자리}-{짧은이름}.md`. 이 표는 한 줄 안내만, 내용은 파일에
- 상태: `미반영` (새로 들어옴) · `반영` (고친 커밋 해시를 파일에 적음) · `보류` (이유를 파일에 적음)
- 반영하는 쪽은 상태 칸과 파일의 `상태:` 를 같이 고친다
- 출처 환경: Windows 11, PowerShell 5.1, Claude Code (VS Code 확장), Node 24, git 2.55

| # | 파일 | 대상 | 요약 | 상태 |
|---|---|---|---|---|
| 001 | [001-skill-backup-location.md](001-skill-backup-location.md) | SETUP.md 2-3 | 스킬 덮어쓰기 백업 위치가 없음. skills/ 안에 두면 스킬이 중복 로드됨 | 미반영 |
| 002 | [002-hook-test-powershell-pipe.md](002-hook-test-powershell-pipe.md) | SETUP.md 2-5 | echo 파이프 hook 시험이 PowerShell 5.1 에선 빈 출력 (거짓 실패) | 미반영 |
| 003 | [003-hook-test-empty-config.md](003-hook-test-empty-config.md) | SETUP.md 2-5 | Q6 "아무것도 안 막음" 이면 차단 동작을 확인할 방법이 없음 | 미반영 |
| 004 | [004-running-sessions-not-loaded.md](004-running-sessions-not-loaded.md) | SETUP.md 4장 | 설치 전에 열려 있던 세션엔 스킬·CLAUDE.md 가 안 들어감. 대처법 안내 없음 | 미반영 |
| 005 | [005-harvest-vs-compact-confirm.md](005-harvest-vs-compact-confirm.md) | SETUP.md 4장, README | 사용자가 세션 끝에 kb-harvest 와 compact-confirm 중 뭘 써야 하는지 헷갈림 | 미반영 |
