#!/usr/bin/env node
/**
 * kb 점검 — 깨진 링크 + frontmatter 누락 + CRLF + 크기 경고
 *
 * 크기 경고(exit 코드 영향 없음): INDEX 한 줄 설명 글자 수 초과, INDEX·하위 목차(INDEX-*.md) 크기 초과,
 * 문서 크기 초과, INDEX 에 없는 문서. 기준값은 config.json 의 limits.
 *
 *   node _tools/check-kb.cjs                # kb 전체 점검 (kb 루트 = _tools 의 부모)
 *   node _tools/check-kb.cjs 다른/폴더      # 다른 폴더 점검
 *   node ... --links                        # 링크만
 *   node ... --fm                           # frontmatter 만
 *   node ... --fix-eol                      # CRLF 를 LF 로 고쳐서 저장
 *   node ... --no-collect                   # 자동 목록(질문·이슈) 다시 만들기 건너뜀
 *
 * kb 를 점검하면 먼저 collect-questions.cjs (이슈 대장을 켰으면 collect-issues.cjs 도) 를 돌려 자동 목록을 새로 만든다.
 * 문제가 있으면 exit 1 로 끝난다.
 *
 * CRLF 주의: 내용이 멀쩡해도 줄바꿈이 CRLF 면 frontmatter 검사가 헛돈다.
 * 그래서 검사 전에 메모리에서 LF 로 맞춰 보고, CRLF 인 파일은 따로 알려준다.
 */
const fs = require('fs');
const path = require('path');
const { CONFIG } = require('./lib-collect.cjs');

const BS = String.fromCharCode(92);
const BT = String.fromCharCode(96);           // 백슬래시·백틱 리터럴 회피
const LF = String.fromCharCode(10);
const CRLF = String.fromCharCode(13) + LF;
const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const KB_ROOT = path.resolve(__dirname, '..');
const ROOT = path.resolve(args.find(a => !a.startsWith('--')) || KB_ROOT);
const doLinks = !flags.includes('--fm');
const doFm = !flags.includes('--links');
const doFixEol = flags.includes('--fix-eol');

const REQUIRED = CONFIG.requiredFrontmatter;

function collect(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collect(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

function rel(p) { return path.relative(ROOT, p).split(path.sep).join('/'); }

// kb 를 점검할 때는 자동 목록을 먼저 다시 만든다 — 원문을 고치고 잊어도 목록이 낡지 않게.
let brokenCollect = false;
if (ROOT === KB_ROOT && !flags.includes('--no-collect')) {
  const { execFileSync } = require('child_process');
  const scripts = ['collect-questions.cjs'];
  if (CONFIG.issues.enabled) scripts.push('collect-issues.cjs');
  for (const s of scripts) {
    try { process.stdout.write(execFileSync(process.execPath, [path.join(__dirname, s)], { encoding: 'utf8' })); }
    catch (e) { console.log('자동 목록 실패: ' + s + ' — ' + (e.stderr || e.message).split(LF)[0]); brokenCollect = true; }
  }
}

const files = collect(ROOT, []).filter(f => !rel(f).startsWith('_tools/'));
if (!files.length) {
  console.log('md 파일이 없습니다: ' + ROOT);
  process.exit(0);
}

let brokenCount = 0;
let fmCount = 0;
let crlfCount = 0;

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  const issues = [];

  // --- 줄바꿈 ---
  if (text.includes(CRLF)) {
    text = text.split(CRLF).join(LF);
    crlfCount++;
    if (doFixEol) {
      fs.writeFileSync(file, text, 'utf8');
      issues.push('  CRLF → LF 로 고쳤음');
    } else {
      issues.push('  CRLF 줄바꿈 (--fix-eol 로 고칠 수 있음)');
    }
  }

  const lines = text.split(LF);

  // --- 링크 ---
  if (doLinks) {
    let inFence = false;
    lines.forEach((line, i) => {
      if (line.trimStart().startsWith(BT + BT + BT)) { inFence = !inFence; return; }
      if (inFence) return;
      // 인라인 코드 안의 링크는 링크가 아니다
      const scrubbed = line.split(BT).filter(function (_, idx) { return idx % 2 === 0; }).join(' ');
      const found = [...scrubbed.matchAll(/\[([^\]]*)\]\(([^)#\s]+)(#[^)]*)?\)/g)];
      for (const m of found) {
        const target = m[2].trim();
        if (/^(https?:|mailto:|tel:)/i.test(target)) continue;   // 외부 URL
        if (target.startsWith(BS + BS)) continue;                 // UNC 공유 경로
        if (target.startsWith('<')) continue;
        let abs;
        try { abs = path.resolve(path.dirname(file), decodeURIComponent(target)); }
        catch { abs = path.resolve(path.dirname(file), target); }
        if (!fs.existsSync(abs)) {
          issues.push('  링크 ' + (i + 1) + '행: ' + target);
          brokenCount++;
        }
      }
    });
  }

  // --- frontmatter ---
  // INDEX/README 는 목차라 지식 문서 규칙 대상이 아니다
  const base = path.basename(file).toUpperCase();
  const isIndex = base === 'INDEX.MD' || base === 'README.MD' || /^INDEX-.+\.MD$/.test(base);
  if (doFm && !isIndex) {
    if (!text.startsWith('---' + LF)) {
      issues.push('  frontmatter 없음');
      fmCount++;
    } else {
      const end = text.indexOf(LF + '---', 3);
      const block = end > 0 ? text.slice(4, end) : '';
      const missing = REQUIRED.filter(k => !new RegExp('^' + k + ':', 'm').test(block));
      if (missing.length) {
        issues.push('  frontmatter 누락 키: ' + missing.join(', '));
        fmCount++;
      }
    }
  }

  if (issues.length) {
    console.log('== ' + rel(file));
    issues.forEach(l => console.log(l));
  }
}

// --- 크기 경고 (exit 코드에는 영향 없음) ---
// AI 가 한 번에 못 읽는 크기가 되면 앞부분만 보고 판단하게 된다.
const ROW_MAX = CONFIG.limits.indexRowChars;
const DOC_MAX = CONFIG.limits.docKB * 1024;
const INDEX_MAX = CONFIG.limits.indexKB * 1024;
const warns = [];

for (const file of files) {
  const size = fs.statSync(file).size;
  if (size > DOC_MAX) warns.push('  문서 ' + Math.round(size / 1024) + 'KB > ' + CONFIG.limits.docKB + 'KB: ' + rel(file) + '  → 지금 상태 본문 / {이름}_history.md 로 나누기');
}

// INDEX = 루트 INDEX.md + 영역 하위 목차 INDEX-*.md. 각각 크기 제한, 하위 목차는 INDEX.md 에서 링크
const indexPath = path.join(ROOT, 'INDEX.md');
if (fs.existsSync(indexPath)) {
  const top = fs.readFileSync(indexPath, 'utf8').split(CRLF).join(LF);
  const subs = fs.readdirSync(ROOT).filter(n => /^INDEX-.+\.md$/.test(n)).sort();
  let idx = '';
  for (const name of ['INDEX.md', ...subs]) {
    const p = path.join(ROOT, name);
    const size = fs.statSync(p).size;
    if (size > INDEX_MAX) warns.push('  ' + name + ' ' + (size / 1024).toFixed(1) + 'KB > ' + CONFIG.limits.indexKB + 'KB  → 줄 줄이기 또는 하위 목차(INDEX-{영역}.md)로 나누기');
    if (name !== 'INDEX.md' && !top.includes('](' + name + ')')) warns.push('  INDEX.md 에서 링크 없음: ' + name);
    const text = name === 'INDEX.md' ? top : fs.readFileSync(p, 'utf8').split(CRLF).join(LF);
    idx += text + LF;
    text.split(LF).forEach((line, i) => {
      if (!line.startsWith('| [')) return;
      const cells = line.split(' | ');
      const desc = cells.slice(1).join(' | ').replace(/\s*\|\s*$/, '');
      const len = [...desc].length;
      if (len > ROW_MAX) warns.push('  ' + name + ' ' + (i + 1) + '행 설명 ' + len + '자 > ' + ROW_MAX + '자: ' + cells[0].slice(2));
    });
  }
  // INDEX(하위 목차 포함)에 없는 문서 (분류 폴더 바로 아래의 md·svg)
  for (const dir of CONFIG.kbDirs) {
    let names = [];
    try { names = fs.readdirSync(path.join(ROOT, dir)); } catch { continue; }
    for (const n of names) {
      if (!/\.(md|svg)$/.test(n)) continue;
      if (dir === 'ops' && /^(open-questions|issues)\.md$/.test(n)) continue;   // 자동 목록은 INDEX 에 고정 줄로 둔다
      if (!idx.includes('](' + dir + '/' + n + ')')) warns.push('  INDEX 에 없음: ' + dir + '/' + n);
    }
  }
}

if (warns.length) {
  console.log('== 크기 경고');
  warns.forEach(l => console.log(l));
}

console.log('');
console.log('검사 대상 : ' + ROOT + '  (md ' + files.length + '개)');
if (doLinks) console.log('깨진 링크 : ' + brokenCount + '건');
if (doFm) console.log('frontmatter 문제 : ' + fmCount + '건');
console.log('크기 경고 : ' + warns.length + '건 (exit 코드 영향 없음)');
if (crlfCount) {
  console.log('CRLF 줄바꿈 : ' + crlfCount + '건' + (doFixEol ? ' (고침)' : ' — node ... --fix-eol 로 고칠 것'));
}

process.exit(brokenCount + fmCount + (doFixEol ? 0 : crlfCount) > 0 || brokenCollect ? 1 : 0);
