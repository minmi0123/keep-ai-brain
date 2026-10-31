/**
 * keep-ai-brain 점검 도구 공용 — 설정 읽기 · 문서 찾기 · 묶음 나누기 · git 날짜 · 표 칸 다듬기 · frontmatter · 파일 쓰기
 * collect-questions.cjs · collect-issues.cjs · check-*.cjs 가 같이 쓴다.
 *
 * 전제: 이 폴더(_tools)는 kb 루트 바로 아래에 있다. kb 루트 = 이 폴더의 부모.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const KB = path.resolve(__dirname, '..');
const today = new Date().toISOString().slice(0, 10);

// 설정 — config.json 이 없거나 키가 빠지면 기본값
const DEFAULTS = {
  kbDirs: ['overview', 'patterns', 'ops', 'trouble'],
  requiredFrontmatter: ['title', 'category', 'tags', 'summary', 'created', 'updated'],
  limits: { docKB: 50, indexKB: 40, indexRowChars: 150 },
  issues: { enabled: false, heading: '결함|이슈', notHeading: '결함\\s*아님|이슈\\s*아님' },
  memory: { dir: '', indexFile: 'MEMORY.md', indexMaxLines: 150, indexRowChars: 150, fileKB: 8, staleProjectDays: 30 },
  tasks: { dir: '', handoffFile: '이어하기.md', historyFile: '이력.md', handoffKB: 20, staleDays: 14 },
};
function loadConfig() {
  let user = {};
  try { user = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')); }
  catch { /* 없으면 기본값 */ }
  const cfg = { ...DEFAULTS, ...user };
  for (const k of ['limits', 'issues', 'memory', 'tasks']) cfg[k] = { ...DEFAULTS[k], ...(user[k] || {}) };
  return cfg;
}
const CONFIG = loadConfig();

const rel = p => path.relative(KB, p).split(path.sep).join('/');
// 원문 링크는 그 문서 기준 상대 경로라 목록에서는 깨진다 → 글자만 남긴다 (원문은 줄 번호 링크로 연다)
const clean = s => s.replace(/\[([^\]]*)\]\([^)\s]*\)/g, '$1').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
const cut = (s, max = 220) => (s.length > max ? s.slice(0, max - 1) + '…' : s);
const cell = (s, max) => cut(clean(s), max).replace(/\|/g, '\\|');

function walk(dir, out = []) {
  for (const n of fs.readdirSync(dir, { withFileTypes: true })) {
    if (n.name === '.git' || n.name === 'node_modules') continue;
    const p = path.join(dir, n.name);
    if (n.isDirectory()) walk(p, out);
    else if (n.name.endsWith('.md')) out.push(p);
  }
  return out;
}

// kb 지식 문서 전부 (자동 생성 목록은 뺀다)
const GENERATED = /^ops\/(open-questions|issues)(\.md|\/)/;
function kbDocs() {
  const out = [];
  for (const d of CONFIG.kbDirs) if (fs.existsSync(path.join(KB, d))) walk(path.join(KB, d), out);
  return out.filter(f => !GENERATED.test(rel(f)));
}

// 줄 번호(1부터) → 커밋 날짜(MM-DD). git 저장소가 아니거나 새 파일이면 오늘 날짜
function blameDates(repo, file) {
  const dates = {};
  let txt;
  try {
    txt = execFileSync('git', ['-C', repo, 'blame', '--line-porcelain', '--', path.relative(repo, file)],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    // 빈 칸으로 두면 커밋 뒤 다시 만들 때 날짜가 채워져 목록이 또 바뀐다 → 오늘로
    return new Proxy({}, { get: () => today.slice(5, 10) });
  }
  let line = 0, time = 0, uncommitted = false;
  for (const l of txt.split('\n')) {
    const h = /^[0-9a-f]{40} \d+ (\d+)/.exec(l);
    if (h) { line = +h[1]; uncommitted = /^0{40}/.test(l); continue; }
    if (l.startsWith('author-time ')) time = +l.slice(12);
    if (l.startsWith('\t')) dates[line] = (uncommitted ? today : new Date(time * 1000).toISOString()).slice(5, 10);
  }
  return dates;
}

// 묶음 = 첫 폴더. 그 아래 하위 폴더가 있으면 "폴더-하위폴더" (예: overview/payment/card.md → overview-payment)
function groupOf(r) {
  const parts = r.split('/');
  return parts.length > 2 ? parts[0] + '-' + parts[1] : parts[0];
}
const titleOf = g => g;

const fm = (title, summary, tags) => [
  '---', 'title: ' + title, 'category: ops', 'tags: [' + tags.join(', ') + ']',
  'summary: ' + summary, 'created: ' + today, 'updated: ' + today, '---', '',
].join('\n');

// items → {묶음: [...]}, 많은 순
function grouped(items) {
  const groups = {};
  for (const it of items) (groups[it.group] ||= []).push(it);
  return { groups, order: Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length) };
}

// 묶음 폴더를 비우고(없어진 묶음 파일 삭제) 다시 쓸 준비. 지운 파일 수를 돌려준다
function prepareOutDir(dir, groups) {
  fs.mkdirSync(dir, { recursive: true });
  let removed = 0;
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.md') && !groups[f.slice(0, -3)]) { fs.unlinkSync(path.join(dir, f)); removed++; }
  return removed;
}

// 내용이 같으면(날짜 줄만 다르면) 쓰지 않는다 — 날마다 git 에 변경이 생기지 않게.
// created 는 처음 만든 날을 지킨다. 썼으면 true
const UPDATED = /^updated: .*$/m;
const CREATED = /^created: .*$/m;
function writeIfChanged(file, text) {
  if (fs.existsSync(file)) {
    const old = fs.readFileSync(file, 'utf8');
    const oldCreated = (CREATED.exec(old) || [])[0];
    if (oldCreated) text = text.replace(CREATED, oldCreated);
    if (old.replace(UPDATED, '') === text.replace(UPDATED, '')) return false;
  }
  fs.writeFileSync(file, text, 'utf8');
  return true;
}

// 첫 줄이 '---' 인 frontmatter 블록 (없으면 '')
function frontmatter(text) {
  const t = text.replace(/\r\n/g, '\n');
  if (!t.startsWith('---\n')) return '';
  const end = t.indexOf('\n---', 3);
  return end > 0 ? t.slice(4, end) : '';
}

const daysSince = ms => Math.floor((Date.now() - ms) / 86400000);

module.exports = {
  KB, CONFIG, today, rel, clean, cut, cell, walk, kbDocs, blameDates, groupOf, titleOf, fm, grouped,
  prepareOutDir, writeIfChanged, frontmatter, daysSince,
};
