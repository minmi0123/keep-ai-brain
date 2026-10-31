#!/usr/bin/env node
/**
 * 미확인 질문 모으기 — kb 에 흩어진 [확인필요]·[추가확인필요]·[이미지 확인필요] 를 한 목록으로
 *
 *   node _tools/collect-questions.cjs
 *
 * 만드는 것 (자동 생성 — 손으로 고치지 않는다):
 *   ops/open-questions.md            묶음별 개수 + 묶음 문서 링크
 *   ops/open-questions/{묶음}.md     문서별 질문 표 (줄 · 절 · 내용 · 추가일)
 *
 * 왜: AI 는 모르는 것을 추측하지 말고 [확인필요] 로 남긴다. 그 표시가 문서 수백 개에 흩어지면 아무도 못 찾는다.
 * 답을 받으면 목록이 아니라 원래 자리를 고치고(태그 지우고 답과 확인 날짜) 이 스크립트를 다시 돌린다.
 * 추가일 = 그 줄을 마지막으로 바꾼 커밋 날짜 (git blame). git 이 아니거나 커밋 전이면 오늘.
 */
const fs = require('fs');
const path = require('path');
const { KB, rel, clean, cell, kbDocs, blameDates, groupOf, titleOf, fm: fmBase, grouped, prepareOutDir, writeIfChanged } = require('./lib-collect.cjs');

const OUT_DIR = path.join(KB, 'ops', 'open-questions');
const OUT_SUMMARY = path.join(KB, 'ops', 'open-questions.md');

const MARK = /확인\s?필요/;
// 태그 사용법을 설명하는 줄은 질문이 아니다
const RULE_LINE = /추측하지 않고|태그는|태그로|로 표시|으로 표시|표시하고|표시 후|표시한다|남긴다\s*\(|\[확인필요\]\s*(로|으로|를|은|는)\s/;
// 이미 풀린 질문 ("[추가확인필요] 해소", 취소선)
const RESOLVED = /해소|해결됨|\(해결\)|자체 정정|^~~|~~[^~]*확인\s?필요[^~]*~~|~~[^~]+~~\s*→|→\s*(\S+\s)?(해소|해결|완료|확인)/;
// 질문 절 안에 같이 든 질문 아닌 줄 ("[문서-코드 불일치] …", "[정정 …] …") — 질문 태그가 따로 없으면 뺀다
const NOT_QUESTION = /^\s*(\[문서-코드 불일치|\[정정)/;
const Q_TAG = /\[[^\]]*확인\s?필요[^\]]*\]/;
// 제목 전체가 질문 표시인 절 (예 "### 7-2. [추가확인필요]") — 그 아래 목록 줄을 모은다
const Q_HEADING = /^[\d.\-\s]*(\[문서-코드 불일치\]\s*·\s*)?\[?추가\s?확인\s?필요\]?\s*(\d+\s*)?(\(이동\))?\s*$/;
// 절 제목 꼴 ("결함 후보 · [추가확인필요]") 은 질문 한 개가 아니다
const TITLE_STYLE = /·\s*\[?추가\s?확인\s?필요\]?\s*$/;

const items = [];   // {group, doc, link, line, section, text, date}
for (const file of kbDocs()) {
  const r = rel(file);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  if (!lines.some(l => MARK.test(l))) continue;
  const dates = blameDates(KB, file);
  let section = '', underQ = 0;   // underQ = '추가확인필요' 제목의 수준 (그 아래 목록 줄을 질문으로)
  let inFence = false;
  lines.forEach((l, i) => {
    if (l.trimStart().startsWith('```')) inFence = !inFence;
    const h = !inFence && /^(#{1,6})\s+(.*)/.exec(l);
    if (h) {
      if (underQ && h[1].length <= underQ) underQ = 0;
      const prev = section;
      section = clean(h[2]);
      if (Q_HEADING.test(section)) { underQ = h[1].length; return; }
      // 제목 안에 든 질문 하나 (예 "## 7. 배치 (주기 [추가확인필요])")
      if (Q_TAG.test(h[2]) && !TITLE_STYLE.test(section) && !RESOLVED.test(h[2]))
        items.push({ group: groupOf(r), doc: r, link: '../../' + r, line: i + 1, section: prev, text: section, date: dates[i + 1] || '' });
      return;
    }
    const isItem = /^\s*([-*]|\d+[.)]|\|)\s/.test(l) && !/^\s*\|[\s:|-]+\|\s*$/.test(l) && !/^\s*\|\s*(#|번호|항목|질문|내용)\s*\|/.test(l);
    const hit = MARK.test(l) && !RULE_LINE.test(l) && !RESOLVED.test(l);
    if (!hit && !(underQ && isItem)) return;
    let text = l.trim();
    if (text.startsWith('|')) text = text.replace(/^\||\|$/g, '').split('|').map(s => s.trim()).filter(Boolean).join(' · ');
    else text = text.replace(/^([-*]|\d+[.)])\s+/, '');
    if (RESOLVED.test(text) || (NOT_QUESTION.test(text) && !Q_TAG.test(text))) return;
    items.push({ group: groupOf(r), doc: r, link: '../../' + r, line: i + 1, section, text, date: dates[i + 1] || '' });
  });
}

// --- 쓰기 ---
const fm = (title, summary) => fmBase(title, summary, ['확인필요', '질문목록', '자동생성']);
const { groups, order } = grouped(items);
let changed = prepareOutDir(OUT_DIR, groups);

for (const g of order) {
  const list = groups[g];
  const byDoc = {};
  for (const it of list) (byDoc[it.doc] ||= []).push(it);
  const out = [fm('미확인 질문 — ' + titleOf(g), titleOf(g) + ' 문서에 남은 확인필요 ' + list.length + '개. 자동 생성(collect-questions.cjs) — 손으로 고치지 않는다'),
    '# 미확인 질문 — ' + titleOf(g), '',
    '> 언제 읽나: 이 묶음의 [확인필요] 를 사용자에게 묻거나 직접 다시 확인할 때. **자동 생성 — 이 파일을 고치지 말고 원래 자리를 고친 뒤 `node _tools/collect-questions.cjs`.** 목록: [open-questions.md](../open-questions.md)', ''];
  for (const doc of Object.keys(byDoc)) {
    const rows = byDoc[doc];
    out.push('## ' + doc + ' (' + rows.length + ')', '', '| 줄 | 절 | 내용 | 추가일 |', '|---|---|---|---|');
    for (const it of rows) out.push('| [' + it.line + '](' + it.link + '#L' + it.line + ') | ' + cell(it.section) + ' | ' + cell(it.text) + ' | ' + it.date + ' |');
    out.push('');
  }
  changed += writeIfChanged(path.join(OUT_DIR, g + '.md'), out.join('\n'));
}

const total = items.length;
const sum = [fm('미확인 질문 목록', 'kb 의 [확인필요]·[추가확인필요] ' + total + '개를 묶음별로. 자동 생성(collect-questions.cjs) — 손으로 고치지 않는다'),
  '# 미확인 질문 목록', '',
  '> 언제 읽나: 사용자에게 몰아서 물을 질문을 고를 때, 같은 걸 또 [확인필요] 로 남기기 전에.',
  '',
  '**먼저 볼 주의**',
  '- 자동 생성 — 이 파일과 `open-questions/` 는 고치지 않는다. 다시 만들기: `node _tools/collect-questions.cjs`',
  '- 답을 받으면 **원래 자리**를 고친다: 태그를 지우고 답 + `(사용자 확인 MM-DD)`. 그다음 다시 만든다',
  '- 모으는 표시: `[추가확인필요…]`·`[확인필요…]`·`[이미지 확인필요…]`, 그리고 제목에 "추가확인필요" 가 든 절 아래 목록 줄. 태그 사용법 설명 줄은 뺀다',
  '- 추가일 = 그 줄을 마지막으로 바꾼 커밋 날짜(MM-DD)',
  '',
  '| 묶음 | 질문 | 문서 | 최근 추가일 |', '|---|---|---|---|'];
for (const g of order) {
  const list = groups[g];
  const docs = new Set(list.map(i => i.doc)).size;
  const latest = list.map(i => i.date).filter(d => /^\d/.test(d)).sort().pop() || '';
  sum.push('| [' + titleOf(g) + '](open-questions/' + g + '.md) | ' + list.length + ' | ' + docs + ' | ' + latest + ' |');
}
sum.push('| **합계** | **' + total + '** | **' + new Set(items.map(i => i.doc)).size + '** | |', '');
changed += writeIfChanged(OUT_SUMMARY, sum.join('\n'));

console.log('질문 ' + total + '개, 묶음 ' + order.length + '개 → ' + rel(OUT_SUMMARY) + ' (바뀐 파일 ' + changed + ')');
