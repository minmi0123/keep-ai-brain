> 언제 읽나: SETUP.md 2-5 확인 절차, docs/windows-pitfalls.md 를 고칠 때

# 002 hook 시험 명령(echo 파이프)이 PowerShell 5.1 에서 빈 출력

```yaml
상태: 반영 (main 5e4f7dc) — 원인 확인: PowerShell 5.1 파이프가 앞에 BOM(U+FEFF)을 붙임. guard.mjs 가 BOM 을 떼고, 시험은 hooks/test-guard.cjs
날짜: 2026-10-31
출처: 집 PC 첫 설치. AI 가 PowerShell 툴로 시험
대상: SETUP.md:108 (echo '...' | node guard.mjs)
심각도: 중 — 정상 설치를 "차단 안 됨" 으로 오판하게 만듦 (반대로, 고장 난 hook 과 구분이 안 됨)
```

## 증상

- 예시 설정(강제 push 차단 포함)이 들어 있는 guard.mjs 사본에 PowerShell 에서 아래를 넣음
  `'{"tool_name":"Bash","tool_input":{"command":"git push -f origin main"}}' | node guard.mjs`
- 출력이 비었음 (deny 없음)
- 같은 입력을 node 스크립트에서 `spawnSync(process.execPath, [guard], { input: JSON.stringify(...) })` 로 넣으니 `"permissionDecision":"deny"` 가 정상으로 나옴

## 원인

- [확인필요] PowerShell 5.1 이 네이티브 프로그램에 파이프할 때의 인코딩·BOM 문제로 보임. guard.mjs 는 JSON 파싱에 실패하면 조용히 통과(exit 0, 출력 없음)하도록 짜여 있어서 증상이 "출력 없음" 으로만 보인다

## 제안

- 2-5 확인을 셸 echo 대신 node 시험 스크립트로 통일. 예: `hooks/test-guard.cjs` 를 repo 에 넣고 `node test-guard.cjs "{CONFIG}/hooks/keep-ai-brain/guard.mjs"` 가 각 케이스의 deny/통과를 표로 출력
- 그 스크립트에 "깨진 JSON → 통과" 케이스도 넣어, 입력이 안 들어간 경우와 차단 안 된 경우를 구분
- docs/windows-pitfalls.md 3장에 "PowerShell 5.1 에서 `문자열 | node x` 로 JSON 을 넘기면 받는 쪽이 파싱 실패할 수 있다 → 입력은 파일이나 node spawn 으로" 추가
