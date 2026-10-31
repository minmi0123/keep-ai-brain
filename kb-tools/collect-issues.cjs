#!/usr/bin/env node
/**
 * 이슈 대장 — kb 문서마다 흩어진 결함·이슈 표(E12·PQ15·A1 …)를 한 목록으로  (선택 기능: config.json issues.enabled)
 *
 *   node _tools/collect-issues.cjs
 *
 * 만드는 것 (자동 생성 — 손으로 고치지 않는다):
 *   ops/issues.md               묶음별 개수 · 보안 키워드 수 · 상태 표시 수
 *   ops/issues/{묶음}.md        문서별 이슈 표 (번호 · 요약 · 위치 · 상태 · 보안 · 추가일)
 *   ops/issues/security.md      보안·개인정보 키워드가 든 이슈만 모은 표
 *
 * 왜: 코드를 분석하다 발견했지만 이번 범위가 아니라 고치지 않은 문제를 kb 에 적어 둔다.
 *     문서 수백 개에 흩어지면 같은 문제를 또 적거나, 고칠 때 범위를 못 잡는다.
 *
 * 모으는 곳: 제목이 config issues.heading(기본 "결함|이슈")에 맞는 절 안의
 *   ① 머리글 첫 칸이 '#'·'번호' 인 표의 줄   ② "- PP8 · …" 처럼 번호로 시작하는 목록 줄
 * 번호는 문서마다 따로 매긴다(A1 이 여러 문서에 있다) → 대장에서는 문서 + 번호로 구분한다.
 */
const fs = require('fs');
const path = require('path');
const { KB, CONFIG, rel, clean, cut, cell, kbDocs, blameDates, groupOf, titleOf, fm: fmBase, grouped, prepareOutDir, writeIfChanged } = require('./lib-collect.cjs');

const OUT_DIR = path.join(KB, 'ops', 'issues');
const OUT_SUMMARY = path.join(KB, 'ops', 'issues.md');
const SECURITY_FILE = 'security';

const ISSUE_HEADING = new RegExp(CONFIG.issues.heading);
const NOT_ISSUE_HEADING = new RegExp(CONFIG.issues.notHeading);
// E12 · PQ15 · R-N1 · 8.1 · 3
const ID = /^[A-Z]{0,4}(-[A-Z]{1,3})?\d+([-.]\d+)?[a-z]?$/;
const LIST_ID = /^\s*[-*]\s+\**([A-Z]{1,4}\d+(?:-\d+)?)\**\s*[·:.—–-]\s*(.*)$/;
// 줄 안에 적힌 상태 (표에 상태 칸이 없을 때)
const STATUS_WORD = /(해소|고쳐짐|수정됨|수정 완료|반영됨|철회|정정|해결)/;
// 보안·개인정보 키워드 — 키워드로 고른 것이라 판정이 아니다. 너무 흔한 말(세션·인증 단독)은 넣지 않는다
const SECURITY = /개인정보|마스킹|평문|암호화|복호화|API 키|암호 키|인증 없이|인증이 없|권한|CORS|토큰|PII|인젝션|XSS|CSRF|비밀번호|주민번호|카드번호|변조/;
const SUMMARY_MAX = 140;

function summaryOf(text) {
  const g = /^\[[^\]]+\] /.exec(text);                         // 등급 머리
  const body = g ? text.slice(g[0].length) : text;
  const b = /\*\*([^*]+)\*\*/.exec(body);
  return cut((g ? g[0] : '') + clean(b ? b[1] : body), SUMMARY_MAX);
}

const items = [];   // {group, doc, link, line, id, section, summary, where, status, security, date}
for (const file of kbDocs()) {
  const r = rel(file);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  if (!lines.some(l => ISSUE_HEADING.test(l))) continue;
  const dates = blameDates(KB, file);
  let level = 0, section = '', inFence = false;
  let table = null;   // 지금 읽는 표 {issue, whereCol, statusCol, gradeCol}
  lines.forEach((l, i) => {
    if (l.trimStart().startsWith('```')) { inFence = !inFence; return; }
    if (inFence) return;
    const h = /^(#{1,6})\s+(.*)/.exec(l);
    if (h) {
      if (level && h[1].length <= level) level = 0;
      if (ISSUE_HEADING.test(h[2]) && !NOT_ISSUE_HEADING.test(h[2])) { level = h[1].length; section = clean(h[2]); }
      table = null;
      return;
    }
    if (!level) return;
    const push = (id, content, where, status) => items.push({
      group: groupOf(r), doc: r, link: '../../' + r, line: i + 1, id, section,
      summary: summaryOf(content), where: cut(clean(where || ''), 80),
      status: clean(status || '') || ((STATUS_WORD.exec(content) || [])[1] || ''),
      security: SECURITY.test(content), date: dates[i + 1] || '',
    });
    if (!l.startsWith('|')) {
      table = null;
      const m = LIST_ID.exec(l);
      if (m) push(m[1], m[2], '', '');
      return;
    }
    const cells = l.split('|').slice(1, -1).map(s => s.trim());
    if (/^[-:\s]*$/.test(cells.join(''))) return;              // 구분 줄
    if (!table) {                                                // 머리글
      const name = cells.map(c => clean(c));
      table = {
        issue: name[0] === '#' || name[0] === '번호',
        whereCol: name.findIndex(c => /^(위치|근거|코드 위치)$/.test(c)),
        statusCol: name.findIndex(c => /^(상태|확인)$/.test(c)),
        gradeCol: name.findIndex(c => /^(등급|심각도)$/.test(c)),   // 높음·중·낮음 — 요약 앞에 붙인다
      };
      return;
    }
    if (!table.issue) return;
    const rawId = clean(cells[0]);
    const id = rawId.replace(/\s*\(.*\)$/, '');
    if (!ID.test(id)) return;
    const note = (/\((.*)\)$/.exec(rawId) || [])[1] || '';     // "A1(정정)" 의 정정
    const grade = table.gradeCol > 0 ? clean(cells[table.gradeCol] || '').replace(/\s*\(.*$/, '') : '';
    push(id, (grade ? '[' + grade + '] ' : '') + (cells[1] || ''), table.whereCol > 0 ? cells[table.whereCol] : '',
      (table.statusCol > 0 ? cells[table.statusCol] : '') || note);
  });
}

// --- 쓰기 ---
const fm = (title, summary) => fmBase(title, summary, ['이슈', '이슈대장', '자동생성']);
const { groups, order } = grouped(items);
let changed = prepareOutDir(OUT_DIR, { ...groups, [SECURITY_FILE]: true });

const HEAD = '| 번호 | 요약 | 위치 | 상태 | 보안 | 추가일 |';
const row = it => '| [' + it.id + '](' + it.link + '#L' + it.line + ') | ' + cell(it.summary, SUMMARY_MAX) + ' | ' +
  cell(it.where, 80) + ' | ' + cell(it.status, 30) + ' | ' + (it.security ? '✓' : '') + ' | ' + it.date + ' |';
const intro = '> 언제 읽나: 이 묶음 이슈를 다시 볼 때, 같은 이슈를 또 적기 전에, 개발·수정 범위를 잡을 때. **자동 생성 — 이 파일을 고치지 말고 원래 문서를 고친 뒤 `node _tools/collect-issues.cjs`.** 목록: [issues.md](../issues.md)';

for (const g of order) {
  const list = groups[g];
  const byDoc = {};
  for (const it of list) (byDoc[it.doc] ||= []).push(it);
  const out = [fm('이슈 대장 — ' + titleOf(g), titleOf(g) + ' 문서의 이슈 ' + list.length + '개(보안 키워드 ' + list.filter(i => i.security).length + '). 자동 생성(collect-issues.cjs) — 손으로 고치지 않는다'),
    '# 이슈 대장 — ' + titleOf(g), '', intro, ''];
  for (const doc of Object.keys(byDoc)) {
    out.push('## ' + doc + ' (' + byDoc[doc].length + ')', '', HEAD, '|---|---|---|---|---|---|');
    for (const it of byDoc[doc]) out.push(row(it));
    out.push('');
  }
  changed += writeIfChanged(path.join(OUT_DIR, g + '.md'), out.join('\n'));
}

const sec = items.filter(i => i.security);
{
  const out = [fm('이슈 대장 — 보안·개인정보 키워드', '보안·개인정보 키워드가 든 이슈 ' + sec.length + '개. 키워드로 고른 것(판정 아님). 자동 생성(collect-issues.cjs)'),
    '# 이슈 대장 — 보안·개인정보 키워드', '', intro, '',
    '> 키워드(개인정보·마스킹·평문·암호화·인증·권한·CORS·토큰·PII 등)로 고른 것이다. 보안 이슈라는 판정이 아니고, 빠진 것도 있을 수 있다.', ''];
  const { groups: sg, order: so } = grouped(sec);
  for (const g of so) {
    out.push('## ' + titleOf(g) + ' (' + sg[g].length + ')', '', '| 문서 | 번호 | 요약 | 위치 | 추가일 |', '|---|---|---|---|---|');
    for (const it of sg[g]) out.push('| ' + it.doc + ' | [' + it.id + '](' + it.link + '#L' + it.line + ') | ' + cell(it.summary, SUMMARY_MAX) + ' | ' + cell(it.where, 60) + ' | ' + it.date + ' |');
    out.push('');
  }
  changed += writeIfChanged(path.join(OUT_DIR, SECURITY_FILE + '.md'), out.join('\n'));
}

const total = items.length;
const docsN = new Set(items.map(i => i.doc)).size;
const sum = [fm('이슈 대장', 'kb 이슈 표 ' + total + '개(문서 ' + docsN + ', 보안 키워드 ' + sec.length + ')를 묶음별로. 자동 생성(collect-issues.cjs) — 손으로 고치지 않는다'),
  '# 이슈 대장', '',
  '> 언제 읽나: 어느 영역에 이슈가 몰려 있는지 볼 때, 개발·수정 범위를 잡을 때, 같은 이슈를 또 적기 전에.',
  '',
  '**먼저 볼 주의**',
  '- 자동 생성 — 이 파일과 `issues/` 는 고치지 않는다. 다시 만들기: `node _tools/collect-issues.cjs`',
  '- 정본은 원래 문서의 이슈 표. 상태가 바뀌면(고쳐짐·철회) 원래 표를 고치고 다시 만든다',
  '- 발견한 이슈를 고칠지는 사람이 정한다. AI 는 기록하고, 이번 작업 범위 밖이면 고치지 않는다',
  '- 번호는 문서마다 따로 매긴다 — 같은 번호(A1 등)가 여러 문서에 있다. 문서 + 번호로 구분',
  '- 모으는 곳: 제목에 "결함"·"이슈" 가 든 절 안의 `| # |`·`| 번호 |` 표 줄과 `- PP8 · …` 꼴 목록 줄. 상태 칸이 없으면 내용 속 "해소·정정·철회·고쳐짐" 을 상태로 보인다',
  '- 보안 ✓ 는 키워드로 고른 것(판정 아님) → [issues/security.md](issues/security.md)',
  '',
  '| 묶음 | 이슈 | 문서 | 보안 키워드 | 상태 표시 | 최근 추가일 |', '|---|---|---|---|---|---|'];
for (const g of order) {
  const list = groups[g];
  const latest = list.map(i => i.date).filter(d => /^\d/.test(d)).sort().pop() || '';
  sum.push('| [' + titleOf(g) + '](issues/' + g + '.md) | ' + list.length + ' | ' + new Set(list.map(i => i.doc)).size + ' | ' +
    list.filter(i => i.security).length + ' | ' + list.filter(i => i.status).length + ' | ' + latest + ' |');
}
sum.push('| **합계** | **' + total + '** | **' + docsN + '** | **' + sec.length + '** | **' + items.filter(i => i.status).length + '** | |', '');
changed += writeIfChanged(OUT_SUMMARY, sum.join('\n'));

console.log('이슈 ' + total + '개, 문서 ' + docsN + ', 보안 키워드 ' + sec.length + ' → ' + rel(OUT_SUMMARY) + ' (바뀐 파일 ' + changed + ')');
