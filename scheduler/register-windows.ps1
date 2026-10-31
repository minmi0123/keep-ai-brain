# keep-ai-brain - register Windows scheduled tasks. ASCII only (PowerShell 5.1 reads .ps1 as ANSI).
# Pass Korean paths as arguments, never inside this file.
#
#   powershell -ExecutionPolicy Bypass -File register-windows.ps1 -Kb "D:\brain\kb" -Memory "C:\Users\me\.claude\projects\x\memory"
#
# Registers:
#   KeepAiBrainMemorySnapshot  daily 19:30  -> memory-snapshot.cjs (commit memory folder if changed, no push)
#   KeepAiBrainWeeklyCheck     Monday 09:30 -> weekly-check.cjs   (report to <kb>\_tools\reports\latest.md)
# Both run as soon as possible if the PC was off (StartWhenAvailable).
# node and git are absolute paths: the task account may not have them on PATH.
#
# Undo:
#   Unregister-ScheduledTask -TaskName KeepAiBrainMemorySnapshot -Confirm:$false
#   Unregister-ScheduledTask -TaskName KeepAiBrainWeeklyCheck -Confirm:$false
param(
  [Parameter(Mandatory = $true)][string]$Kb,
  [string]$Memory = '',
  [string]$Node = '',
  [string]$Git = '',
  [string]$DailyAt = '19:30',
  [string]$WeeklyAt = '09:30',
  [switch]$SkipWeekly
)
# Only the memory snapshot: pass -Memory and -SkipWeekly. Only the weekly check: omit -Memory.

if (-not $Node) { $Node = (Get-Command node -ErrorAction SilentlyContinue).Source }
if (-not $Git) { $Git = (Get-Command git -ErrorAction SilentlyContinue).Source }
if (-not $Node -or -not (Test-Path $Node)) { Write-Output 'node not found. Pass -Node <path to node.exe>'; exit 1 }
if (-not (Test-Path $Kb)) { Write-Output "kb folder not found: $Kb"; exit 1 }

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew

# check everything first, so a failure never leaves a half-registered state
if ($Memory) {
  if (-not $Git -or -not (Test-Path $Git)) { Write-Output 'git not found. Pass -Git <path to git.exe>'; exit 1 }
  if (-not (Test-Path (Join-Path $Memory '.git'))) { Write-Output "memory folder has no .git (run git init in it first): $Memory"; exit 1 }
}
if ($SkipWeekly -and -not $Memory) { Write-Output 'nothing to register (-SkipWeekly without -Memory)'; exit 1 }

# weekly check
if (-not $SkipWeekly) {
  $weekly = Join-Path $here 'weekly-check.cjs'
  $a1 = New-ScheduledTaskAction -Execute $Node -Argument ('"' + $weekly + '" "' + $Kb + '"') -WorkingDirectory $here
  $t1 = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At $WeeklyAt
  Register-ScheduledTask -TaskName 'KeepAiBrainWeeklyCheck' -Action $a1 -Trigger $t1 -Settings $settings -Description 'keep-ai-brain weekly check -> <kb>\_tools\reports\latest.md' -Force | Out-Null
}

# daily memory snapshot (only if a memory folder is given)
if ($Memory) {
  $snap = Join-Path $here 'memory-snapshot.cjs'
  $a2 = New-ScheduledTaskAction -Execute $Node -Argument ('"' + $snap + '" "' + $Memory + '" "' + $Git + '"') -WorkingDirectory $here
  $t2 = New-ScheduledTaskTrigger -Daily -At $DailyAt
  Register-ScheduledTask -TaskName 'KeepAiBrainMemorySnapshot' -Action $a2 -Trigger $t2 -Settings $settings -Description 'keep-ai-brain memory snapshot (local git, no push)' -Force | Out-Null
}

Get-ScheduledTask -TaskName 'KeepAiBrain*' | Get-ScheduledTaskInfo | Select-Object TaskName, NextRunTime
