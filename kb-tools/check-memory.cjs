#!/usr/bin/env node
/**
 * 메모리 점검 — AI 메모리 폴더(사용자 성향·작업 규칙)가 망가지지 않았는지
 *
 *   node _tools/check-memory.cjs            # config.json memory.dir 점검
 *   node _tools/check-memory.cjs 폴더경로   # 다른 메모리 폴더 점검
 *
 * 문제 (exit 1):
 *   - 목차(MEMORY.md)의 링크가 가리키는 파일이 없음
 *   - 목차에 없는 메모리 파일 (AI 가 목차만 읽으므로 없는 것과 같다)
 *   - frontmatter 없음, name·description 빠짐
 * 경고 (exit 코드 영향 없음):
 *   - 목차 줄 수·한 줄 글자 수 초과 — 목차는 매 세션 통째로 읽힌다. 내용은 본문 파일에, 목차엔 한 줄 안내만
 *   - 메모리 파일 크기 초과 — 메모리 하나 = 사실 하나. 크면 나누거나 kb 로 옮긴다
 *   - 오래 안 바뀐 project(진행 중 일) 메모리 — 끝났거나 낡았을 수 있다
 *   - CRLF 줄바꿈
 */
const fs = require('fs');
const path = require('path');
const { CONFIG, frontmatter, daysSince } = require('./lib-collect.cjs');

const M = CONFIG.memory;
const arg = process.argv.slice(2).find(a => !a.startsWith('--'));
const DIR = arg ? path.resolve(arg) : (M.dir ? path.resolve(M.dir) : '');

if (!DIR) {
  console.log('메모리 점검 건너뜀 — config.json 의 memory.dir 이 비어 있습니다');
  process.exit(0);
}
if (!fs.existsSync(DIR)) {
  console.log('메모리 폴더가 없습니다: ' + DIR);
  process.exit(1);
}

const errors = [];
const warns = [];
const indexPath = path.join(DIR, M.indexFile);
const files = fs.readdirSync(DIR).filter(n => n.endsWith('.md') && n !== M.indexFile);

// --- 목차 ---
let linked = new Set();
if (!fs.existsSync(indexPath)) {
  errors.push('목차 파일 없음: ' + M.indexFile);
} else {
  const raw = fs.readFileSync(indexPath, 'utf8');
  if (raw.includes('\r\n')) warns.push(M.indexFile + ': CRLF 줄바꿈');
  // HTML 주석(양식 안내문)은 줄 수만 남기고 비운다 — 안내문 속 예시 링크를 진짜 링크로 읽지 않게
  const body = raw.replace(/\r\n/g, '\n').replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ''));
  const lines = body.split('\n');
  if (lines.length > M.indexMaxLines) warns.push(M.indexFile + ' ' + lines.length + '줄 > ' + M.indexMaxLines + '줄 — 끝난 일·합칠 수 있는 줄을 정리');
  lines.forEach((l, i) => {
    for (const m of l.matchAll(/\]\(([^)\s]+\.md)\)/g)) {
      const target = decodeURIComponent(m[1]);
      linked.add(path.basename(target));
      if (!fs.existsSync(path.join(DIR, target))) errors.push(M.indexFile + ' ' + (i + 1) + '행: 없는 파일 ' + target);
    }
    if (/^\s*[-*]\s+\[/.test(l)) {
      const len = [...l].length;
      if (len > M.indexRowChars) warns.push(M.indexFile + ' ' + (i + 1) + '행 ' + len + '자 > ' + M.indexRowChars + '자 — 내용은 본문 파일로, 목차엔 한 줄 안내만');
    }
  });
}

// --- 메모리 파일 ---
for (const n of files) {
  const p = path.join(DIR, n);
  const raw = fs.readFileSync(p, 'utf8');
  if (!linked.has(n)) errors.push('목차에 없음: ' + n);
  if (raw.includes('\r\n')) warns.push(n + ': CRLF 줄바꿈');
  const fm = frontmatter(raw);
  if (!fm) { errors.push(n + ': frontmatter 없음'); continue; }
  const missing = ['name', 'description'].filter(k => !new RegExp('^' + k + ':', 'm').test(fm));
  if (missing.length) errors.push(n + ': frontmatter 누락 키 ' + missing.join(', '));
  const size = fs.statSync(p).size;
  if (size > M.fileKB * 1024) warns.push(n + ' ' + (size / 1024).toFixed(1) + 'KB > ' + M.fileKB + 'KB — 메모리 하나 = 사실 하나. 나누거나 kb 로 옮기기');
  const type = (/^\s*type:\s*(\w+)/m.exec(fm) || [])[1];
  const age = daysSince(fs.statSync(p).mtimeMs);
  if (type === 'project' && age > M.staleProjectDays) warns.push(n + ': project 메모리 ' + age + '일째 그대로 — 아직 진행 중인지, 끝났으면 지우거나 kb 로');
}

if (errors.length) { console.log('== 문제'); errors.forEach(l => console.log('  ' + l)); }
if (warns.length) { console.log('== 경고'); warns.forEach(l => console.log('  ' + l)); }
console.log('');
console.log('메모리 점검 : ' + DIR + '  (파일 ' + files.length + '개)');
console.log('문제 : ' + errors.length + '건 · 경고 : ' + warns.length + '건 (경고는 exit 코드 영향 없음)');
process.exit(errors.length ? 1 : 0);
