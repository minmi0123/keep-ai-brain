// keep-ai-brain 안전장치 — Claude Code PreToolUse hook.
// md 에 "하지 마" 라고 써도 AI 는 가끔 어긴다. hook 은 실행 직전에 기계적으로 막는다.
//
// 막는 것 (guard.config.json 에서 정한다):
//   1) commands        — 셸 명령(Bash·PowerShell)에 이 패턴이 들어가면 차단 (예: 운영 DB 주소)
//   2) commitMessage   — git commit 메시지(-m 또는 -F 파일)에 이 패턴이 들어가면 차단
//   3) protectedPaths  — 이 경로의 파일 수정(Edit·Write) + 그 경로에서의 git commit 차단 (예: 읽기 전용 작업 복사본)
//
// 판단할 수 없으면 아무것도 출력하지 않고 통과시킨다 (hook 이 고장 나도 작업은 멈추지 않게).
// 자가시험: 명령에 `keep-ai-brain-guard-selftest` 가 들어 있으면 설정과 상관없이 항상 막는다.
//   막을 목록이 비어 있어도 hook 이 붙어 돌고 있는지 확인할 수 있다 (시험 방법은 test-guard.cjs).
// 설치: settings.json 의 hooks.PreToolUse 에 `node {경로}/guard.mjs` 를 등록 (SETUP.md 참고).
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
let config;
try { config = JSON.parse(readFileSync(join(here, 'guard.config.json'), 'utf8')); } catch { process.exit(0); }

const rule = r => ({ re: new RegExp(r.pattern, r.flags || 'i'), reason: r.reason });
const commands = (config.commands || []).map(rule);
const commitMessage = (config.commitMessage || []).map(rule);
const protectedPaths = (config.protectedPaths || []).map(rule);
const COMMIT = /\bgit\b[^\n|;&]*?\bcommit\b(?!-)/;

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

// git commit -F 파일 / --file=파일 의 내용
function commitMessageFile(cmd, cwd) {
  const m = cmd.match(/(?:\s-F\s*|\s--file[=\s])\s*("([^"]+)"|'([^']+)'|(\S+))/);
  if (!m) return '';
  const p = resolve(cwd || '.', m[2] || m[3] || m[4]);
  try { return existsSync(p) ? readFileSync(p, 'utf8') : ''; } catch { return ''; }
}

let input;
// 앞의 BOM 은 뗀다 — PowerShell 5.1 에서 `'...' | node guard.mjs` 로 넘기면 붙어 온다
try { input = JSON.parse(readFileSync(0, 'utf8').replace(/^﻿/, '')); } catch { process.exit(0); }

const tool = input.tool_name || '';
const ti = input.tool_input || {};
const cwd = String(input.cwd || '').replace(/\\/g, '/');

if (tool === 'Bash' || tool === 'PowerShell') {
  const cmd = String(ti.command || '');
  if (cmd.includes('keep-ai-brain-guard-selftest')) deny('keep-ai-brain 안전장치 자가시험이에요. 이 메시지가 보이면 hook 이 정상으로 돌고 있어요.');
  for (const r of commands) if (r.re.test(cmd)) deny(r.reason);
  if (COMMIT.test(cmd)) {
    const msgFile = commitMessageFile(cmd, input.cwd);
    for (const r of commitMessage) if (r.re.test(cmd) || r.re.test(msgFile)) deny(r.reason);
    for (const r of protectedPaths) if (r.re.test(cwd) || r.re.test(cmd.replace(/\\/g, '/'))) deny(r.reason);
  }
}

if (tool === 'Edit' || tool === 'Write' || tool === 'NotebookEdit') {
  const p = String(ti.file_path || ti.notebook_path || '').replace(/\\/g, '/');
  for (const r of protectedPaths) if (r.re.test(p)) deny(r.reason);
}
