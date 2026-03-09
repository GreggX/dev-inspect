/**
 * Collector runner — execSync wrapper with timeout and error handling
 */

import { execSync } from 'node:child_process'

export function run(cmd: string, cwd: string): { ok: boolean; stdout: string; stderr: string; duration_ms: number } {
  const start = performance.now()
  try {
    const stdout = execSync(cmd, { cwd, encoding: 'utf-8', timeout: 300_000, stdio: ['pipe', 'pipe', 'pipe'] })
    return { ok: true, stdout, stderr: '', duration_ms: Math.round(performance.now() - start) }
  } catch (e: any) {
    return {
      ok: false,
      stdout: e.stdout?.toString() ?? '',
      stderr: e.stderr?.toString() ?? '',
      duration_ms: Math.round(performance.now() - start),
    }
  }
}
