// guard.mjs 시험 — 셸 파이프(echo … | node) 대신 이 스크립트로 입력을 넣는다.
// PowerShell 5.1 은 파이프에 BOM 을 붙이고, 셸마다 따옴표·백슬래시 처리가 달라서 "출력 없음" 이
// 차단 안 됨인지 입력이 깨진 것인지 구분이 안 된다. 여기서는 node 가 입력을 직접 넣는다.
//
// 쓰는 법:
//   node test-guard.cjs "<guard.mjs 경로>"                      기본 시험 (자가시험 막힘 · 평범한 명령 통과 · 깨진 입력 통과)
//   node test-guard.cjs "<guard.mjs 경로>" --example            + 이 스크립트 옆 guard.config.json(repo 예시 설정)으로 차단 동작 시험
//   node test-guard.cjs "<guard.mjs 경로>" --deny "명령" ...     + 설치한 설정이 이 명령을 막는지 (여러 번 써도 됨)
//   node test-guard.cjs "<guard.mjs 경로>" --allow "명령" ...    + 이 명령은 통과하는지
// 이 스크립트는 repo 의 hooks/ 에 있는 그대로 부른다 — --example 이 옆의 guard.config.json(예시 설정)을 쓴다. 현재 폴더는 상관없다.
// 결과는 표로 찍고, 하나라도 기대와 다르면 exit 1.
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const args = process.argv.slice(2);
const guard = args[0] && !args[0].startsWith('--') ? path.resolve(args[0]) : '';
if (!guard || !fs.existsSync(guard)) {
  console.error('guard.mjs 경로를 첫 인자로 주세요. 예: node test-guard.cjs "C:/Users/me/.claude/hooks/keep-ai-brain/guard.mjs"');
  process.exit(2);
}
const userDeny = [], userAllow = [];
let example = false;
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--example') example = true;
  else if (args[i] === '--deny' && args[i + 1] !== undefined) userDeny.push(args[++i]);
  else if (args[i] === '--allow' && args[i + 1] !== undefined) userAllow.push(args[++i]);
  else { console.error('모르는 인자: ' + args[i]); process.exit(2); }
}

const bash = command => ({ tool_name: 'Bash', tool_input: { command } });
const rows = [];
function run(file, want, label, input) {
  const raw = typeof input === 'string' ? input : JSON.stringify(input);
  const r = spawnSync(process.execPath, [file], { input: raw, encoding: 'utf8' });
  const got = r.stdout.includes('"deny"') ? '막힘' : '통과';
  rows.push({ ok: got === want && r.status === 0, want, got, label, exit: r.status });
}

// 1) 기본 — 설치한 guard.mjs 그대로
run(guard, '막힘', '자가시험 명령 (keep-ai-brain-guard-selftest)', bash('echo keep-ai-brain-guard-selftest'));
run(guard, '막힘', '자가시험 + 앞에 BOM (PowerShell 파이프 흉내)', '\uFEFF' + JSON.stringify(bash('echo keep-ai-brain-guard-selftest')));
run(guard, '통과', '평범한 명령 (git status)', bash('git status'));
run(guard, '통과', '깨진 입력 (JSON 아님) — hook 은 조용히 통과해야 정상', 'not json');
for (const c of userDeny) run(guard, '막힘', c, bash(c));
for (const c of userAllow) run(guard, '통과', c, bash(c));

// 2) --example — 예시 설정 사본으로 차단 동작 확인 (설치본 설정은 건드리지 않는다)
if (example) {
  const exampleConfig = path.join(__dirname, 'guard.config.json');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kab-guard-'));
  fs.copyFileSync(guard, path.join(tmp, 'guard.mjs'));
  fs.copyFileSync(exampleConfig, path.join(tmp, 'guard.config.json'));
  const g = path.join(tmp, 'guard.mjs');
  const cases = [
    ['막힘', bash('git push -f origin main')],
    ['막힘', bash('git push origin main --force')],
    ['막힘', bash('git push -uf origin main')],
    ['막힘', bash('git push origin +main')],
    ['통과', bash('git push origin main --force-with-lease')],
    ['통과', bash('git push -u origin feature-fix')],
    ['막힘', bash('mysql -h prod-db.example.com -u root')],
    ['막힘', { tool_name: 'PowerShell', tool_input: { command: 'psql -h 10.0.0.100 -U app' } }],
    ['막힘', bash('git commit -m "WIP: 임시"')],
    ['막힘', { tool_name: 'Bash', cwd: 'C:/work/readonly-copy/app', tool_input: { command: 'git commit -m "고침"' } }],
    ['막힘', { tool_name: 'Edit', tool_input: { file_path: 'C:\\work\\readonly-copy\\a.js' } }],
    ['통과', { tool_name: 'Edit', tool_input: { file_path: 'C:\\work\\app\\a.js' } }],
  ];
  for (const [want, input] of cases) run(g, want, '[예시 설정] ' + (input.tool_input.command || input.tool_input.file_path), input);
  fs.rmSync(tmp, { recursive: true, force: true });
}

// 설치한 설정 요약
let summary = '';
try {
  const cfg = JSON.parse(fs.readFileSync(path.join(path.dirname(guard), 'guard.config.json'), 'utf8'));
  const n = k => (cfg[k] || []).length;
  summary = `설치한 설정: commands ${n('commands')} · commitMessage ${n('commitMessage')} · protectedPaths ${n('protectedPaths')}`;
  if (!n('commands') && !n('commitMessage') && !n('protectedPaths')) summary += ' → 차단 목록 비어 있음 — 지금은 자가시험 말고는 아무것도 막지 않아요';
} catch {
  summary = '설치한 설정: guard.config.json 을 읽지 못함 — 이 상태면 hook 은 아무것도 막지 않아요 (자가시험도 통과로 나와요)';
}

console.log('| 결과 | 기대 | 실제 | 입력 |');
console.log('|---|---|---|---|');
for (const r of rows) console.log(`| ${r.ok ? 'OK' : 'FAIL'} | ${r.want} | ${r.got}${r.exit === 0 ? '' : ' (exit ' + r.exit + ')'} | ${r.label.replace(/\|/g, '\\|')} |`);
const fail = rows.filter(r => !r.ok).length;
console.log('');
console.log(summary);
console.log(fail ? `실패 ${fail}건` : `전부 통과 (${rows.length}건)`);
process.exit(fail ? 1 : 0);
