#!/usr/bin/env node
/**
 * 뇌 전체 점검 — kb · 메모리 · 작업 폴더 세 층을 한 번에
 *
 *   node _tools/check-brain.cjs
 *
 * 차례로 check-kb.cjs (자동 목록 포함) → check-memory.cjs → check-tasks.cjs 를 돌린다.
 * 주간 자동 점검(스케줄러)은 이 파일 하나만 부르면 된다.
 * 하나라도 문제(exit 1)면 exit 1.
 */
const path = require('path');
const { spawnSync } = require('child_process');

const failed = [];
for (const [title, script] of [['kb', 'check-kb.cjs'], ['메모리', 'check-memory.cjs'], ['작업 폴더', 'check-tasks.cjs']]) {
  console.log('');
  console.log('########## ' + title + ' ##########');
  const r = spawnSync(process.execPath, [path.join(__dirname, script)], { stdio: 'inherit' });
  if (r.status !== 0) failed.push(title);
}
console.log('');
console.log(failed.length ? `문제 있는 층: ${failed.length}개 (${failed.join(', ')}) — 위 "문제" 를 먼저 고치기` : '세 층 모두 문제 없음 (경고는 위에서 확인)');
process.exit(failed.length ? 1 : 0);
