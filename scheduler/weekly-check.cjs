#!/usr/bin/env node
/**
 * 주간 뇌 점검 — kb · 메모리 · 작업 폴더를 점검해 리포트 md 를 남긴다. AI 를 부르지 않는다 (토큰 0).
 *
 *   node weekly-check.cjs <kb 폴더>
 *
 * 왜: kb 가 커지면 50KB 초과·INDEX 누락·목차 비대 같은 탐색 저하가 조용히 생긴다. 사람이 묻지 않아도 매주 보이게.
 * 결과: <kb>/_tools/reports/YYYY-MM-DD.md 와 latest.md (.gitignore 대상).
 * 리포트를 보고 AI 에게 "점검 리포트 처리해줘" 라고 하면 된다.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const kb = process.argv[2] && path.resolve(process.argv[2]);
if (!kb) { console.error('사용법: node weekly-check.cjs <kb 폴더>'); process.exit(2); }
const brain = path.join(kb, '_tools', 'check-brain.cjs');
if (!fs.existsSync(brain)) { console.error('점검 도구가 없습니다: ' + brain); process.exit(1); }

const r = spawnSync(process.execPath, [brain], { cwd: kb, encoding: 'utf8' });
const today = new Date().toISOString().slice(0, 10);
const ok = r.status === 0;
const report = [
  '# 뇌 점검 리포트 — ' + today, '',
  '> 결과: ' + (ok ? '문제 없음 (경고만 확인)' : '**문제 있음** — 아래 "문제" 부터'),
  '> 처리: AI 에게 "점검 리포트 처리해줘" — 문제를 고치고, 경고는 고칠지 같이 정한다', '',
  '```text', (r.stdout || '') + (r.stderr || ''), '```', '',
].join('\n');

const outDir = path.join(kb, '_tools', 'reports');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, today + '.md'), report);
fs.writeFileSync(path.join(outDir, 'latest.md'), report);
console.log((ok ? '문제 없음' : '문제 있음') + ' → ' + path.join(outDir, today + '.md'));
process.exit(ok ? 0 : 1);
