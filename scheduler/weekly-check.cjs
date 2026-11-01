#!/usr/bin/env node
/**
 * 주간 뇌 점검 — kb · 메모리 · 작업 폴더를 점검해 리포트 md 를 남긴다. AI 를 부르지 않는다 (토큰 0).
 *
 *   node weekly-check.cjs <kb 폴더>
 *
 * 왜: kb 가 커지면 50KB 초과·INDEX 누락·목차 비대 같은 탐색 저하가 조용히 생긴다. 사람이 묻지 않아도 매주 보이게.
 * 결과: <kb>/_tools/reports/YYYY-MM-DD.md 와 latest.md (.gitignore 대상).
 * 리포트만 남기면 아무도 안 연다 → 맨 위 두 줄(결과·처리)을 AI 가 세션 시작 때 읽고, 처리 안 된 문제가 있으면
 * 먼저 알린다 (CLAUDE.md 블록 「시작할 때」). 처리 방법은 리포트 안에 적어 둔다. 고칠지는 사람이 정한다 — 자동 수정 없음.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const kb = process.argv[2] && path.resolve(process.argv[2]);
if (!kb) { console.error('사용법: node weekly-check.cjs <kb 폴더>'); process.exit(2); }
const brain = path.join(kb, '_tools', 'check-brain.cjs');
if (!fs.existsSync(brain)) { console.error('점검 도구가 없습니다: ' + brain); process.exit(1); }

const r = spawnSync(process.execPath, [brain], { cwd: kb, encoding: 'utf8' });
const now = new Date();   // 로컬 날짜 (toISOString 은 UTC 라 한국 오전 9시 전이면 하루 전 날짜가 된다)
const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map(n => String(n).padStart(2, '0')).join('-');
const ok = r.status === 0;
const out = (r.stdout || '') + (r.stderr || '');
const layers = (/문제 있는 층: (\d+개 \([^)]*\))/.exec(out) || [])[1] || '';
const report = [
  '# 뇌 점검 리포트 — ' + today, '',
  '> 결과: ' + (ok ? '문제 없음' : '문제 있음 — 층 ' + (layers || '?')),
  '> 처리: ' + (ok ? '필요 없음' : '안 함'), '',
  '## 처리 방법 (AI 가 따른다)', '',
  '- 언제: 사용자가 "점검 리포트 처리해줘" 라고 하거나, 세션 시작 때 위 처리 줄이 "안 함" 이라 알렸고 사용자가 하자고 했을 때',
  '1. 아래 출력의 **문제** 부터 원인을 찾아 고친다. kb 는 kb-harvest 의 「지킬 것」대로 (내가 고친 파일만 커밋), 메모리는 목차·파일을 맞춘다',
  '2. `node "' + brain.split(path.sep).join('/') + '"` 를 다시 돌려 문제가 0 인지 본다',
  '3. **경고**는 고치지 말고 표로 보여 주고 고칠지 사용자에게 묻는다 (크기·낡음은 사람이 판단할 일이 많다)',
  '4. 사용자가 일부러 남기기로 한 문제는 고치지 않는다',
  '5. 끝나면 이 파일과 같은 날짜 파일의 처리 줄을 `> 처리: 완료 (YYYY-MM-DD) — {고친 것 한 줄}` 로 바꾼다. 남긴 게 있으면 `— 남김: {무엇}` 을 덧붙인다',
  '',
  '## 점검 출력', '',
  '```text', out, '```', '',
].join('\n');

const outDir = path.join(kb, '_tools', 'reports');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, today + '.md'), report);
fs.writeFileSync(path.join(outDir, 'latest.md'), report);
console.log((ok ? '문제 없음' : '문제 있음') + ' → ' + path.join(outDir, today + '.md'));
process.exit(ok ? 0 : 1);
