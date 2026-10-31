#!/usr/bin/env node
/**
 * 작업 폴더 점검 — 업무 단위 산출물 폴더(이어하기·이력)가 낡거나 잊히지 않았는지
 *
 *   node _tools/check-tasks.cjs             # config.json tasks.dir 아래 폴더 전부
 *   node _tools/check-tasks.cjs 폴더경로    # 다른 작업 폴더 모음 점검
 *
 * 작업 폴더 = tasks.dir 바로 아래 폴더 하나. 그 안의 이어하기.md(지금 상태만)·이력.md(경위)를 본다.
 * 끝난 작업 표시: 이어하기.md 에 "상태: 완료" (줄 맨 앞이나 머리말의 "·" 뒤). kb 에 옮겼으면 "kb 반영: 완료" (옮길 게 없으면 "kb 반영: 없음").
 *
 * 경고 (전부 exit 0 — 고칠지는 사람이 정한다):
 *   - 이어하기 없음: 파일이 있는데 이어하기.md 가 없다 → 다음 세션이 이어받을 수 없다
 *   - 낡음: 진행 중인데 이어하기.md 가 오래 안 바뀜 → 끝났으면 완료 표시, 아니면 갱신
 *   - 큼: 이어하기.md 가 너무 큼 → 경위는 이력.md 로 옮기고 지금 상태만 남기기
 *   - kb 미반영: 완료인데 "kb 반영" 줄이 없음 → /kb-harvest 로 남길 것 남기기
 *   - 이력 없음: 이어하기는 있는데 이력.md 가 없음 (가벼운 일이면 무시해도 됨)
 */
const fs = require('fs');
const path = require('path');
const { CONFIG, daysSince } = require('./lib-collect.cjs');

const T = CONFIG.tasks;
const arg = process.argv.slice(2).find(a => !a.startsWith('--'));
const DIR = arg ? path.resolve(arg) : (T.dir ? path.resolve(T.dir) : '');

if (!DIR) {
  console.log('작업 폴더 점검 건너뜀 — config.json 의 tasks.dir 이 비어 있습니다');
  process.exit(0);
}
if (!fs.existsSync(DIR)) {
  console.log('작업 폴더 모음이 없습니다: ' + DIR);
  process.exit(1);
}

// 줄 맨 앞이나 머리말 구분자(· |) 뒤의 "상태: 완료". HTML 주석(양식 안내문)은 지우고 본다
const DONE = /(^|[·|]\s*)[>\s]*\**상태\**\s*[:：]\s*\**(완료|끝|종료|done)/im;
const HARVESTED = /(^|[·|]\s*)[>\s]*\**kb\s*반영\**\s*[:：]/im;
const stripComments = t => t.replace(/<!--[\s\S]*?-->/g, '');

const rows = [];   // {name, kind, msg}
let active = 0, done = 0;
const folders = fs.readdirSync(DIR, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('.'));

for (const d of folders) {
  const dir = path.join(DIR, d.name);
  const handoff = path.join(dir, T.handoffFile);
  const history = path.join(dir, T.historyFile);
  const entries = fs.readdirSync(dir);
  if (!entries.length) continue;

  if (!fs.existsSync(handoff)) {
    rows.push({ name: d.name, kind: '이어하기 없음', msg: '파일 ' + entries.length + '개, ' + T.handoffFile + ' 없음 — 계속할 일이면 /compact-confirm 으로 만들기' });
    continue;
  }
  const text = stripComments(fs.readFileSync(handoff, 'utf8'));
  const st = fs.statSync(handoff);
  const age = daysSince(st.mtimeMs);
  const isDone = DONE.test(text);
  if (isDone) {
    done++;
    if (!HARVESTED.test(text)) rows.push({ name: d.name, kind: 'kb 미반영', msg: '완료 표시는 있는데 "kb 반영:" 줄이 없음 — /kb-harvest 후 "kb 반영: 완료"(또는 "없음")' });
    continue;
  }
  active++;
  if (age > T.staleDays) rows.push({ name: d.name, kind: '낡음', msg: T.handoffFile + ' ' + age + '일째 그대로 — 끝났으면 "상태: 완료", 아니면 갱신' });
  if (st.size > T.handoffKB * 1024) rows.push({ name: d.name, kind: '큼', msg: T.handoffFile + ' ' + (st.size / 1024).toFixed(1) + 'KB > ' + T.handoffKB + 'KB — 경위는 ' + T.historyFile + ' 로, 지금 상태만 남기기' });
  if (!fs.existsSync(history)) rows.push({ name: d.name, kind: '이력 없음', msg: T.historyFile + ' 없음 (가벼운 일이면 무시)' });
}

if (rows.length) {
  console.log('| 폴더 | 종류 | 내용 |');
  console.log('|---|---|---|');
  for (const r of rows) console.log('| ' + r.name + ' | ' + r.kind + ' | ' + r.msg + ' |');
}
console.log('');
console.log('작업 폴더 점검 : ' + DIR + '  (진행 중 ' + active + ' · 완료 ' + done + ')');
console.log('경고 : ' + rows.length + '건 (exit 코드 영향 없음)');
