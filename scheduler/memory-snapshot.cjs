#!/usr/bin/env node
/**
 * 메모리 자동 커밋 — 메모리 폴더(로컬 git)에 바뀐 게 있으면 "auto snapshot YYYY-MM-DD" 로 커밋한다. push 는 하지 않는다.
 *
 *   node memory-snapshot.cjs <메모리 폴더> [git 실행 파일 경로]
 *
 * 왜: AI 는 작업 중 메모리를 수시로 고친다. "요청할 때만 커밋" 이면 기록에 구멍이 생기고, 잘못 지운 메모리를 되돌릴 수 없다.
 * 스케줄러(매일)가 부른다. 결과는 메모리 폴더의 부모에 memory-snapshot.log 로 쌓는다 (메모리 폴더 안에 두면 매번 변경이 생긴다).
 * 메모리 폴더가 git 저장소가 아니면 아무것도 하지 않고 exit 1 (SETUP.md 가 git init 한다).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const dir = process.argv[2] && path.resolve(process.argv[2]);
const git = process.argv[3] || 'git';
if (!dir) { console.error('사용법: node memory-snapshot.cjs <메모리 폴더> [git 경로]'); process.exit(2); }

const logFile = path.join(path.dirname(dir), 'memory-snapshot.log');
// 로그·커밋 날짜는 이 PC 의 현지 시각 (스케줄러 등록 시각과 맞게)
const pad = n => String(n).padStart(2, '0');
const local = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const log = msg => {
  const d = new Date();
  const line = local(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + ' ' + msg;
  console.log(line);
  try { fs.appendFileSync(logFile, line + '\n'); } catch { /* 로그 실패는 무시 */ }
};
const run = args => execFileSync(git, ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

try {
  if (!fs.existsSync(path.join(dir, '.git'))) { log('git 저장소가 아님: ' + dir); process.exit(1); }
  run(['add', '-A']);
  try { run(['diff', '--cached', '--quiet']); log('바뀐 것 없음'); process.exit(0); }
  catch { /* exit 1 = 바뀐 게 있음 */ }
  run(['commit', '-q', '-m', 'auto snapshot ' + local(new Date())]);
  // show --stat 은 첫 커밋(HEAD~1 없음)에서도 된다
  const stat = run(['show', '--stat', '--format=%h %s', 'HEAD']).trim().split('\n');
  log('커밋: ' + stat[0] + ' (' + stat[stat.length - 1].trim() + ')');
} catch (e) {
  log('실패: ' + String(e.stderr || e.message).split('\n')[0]);
  process.exit(1);
}
