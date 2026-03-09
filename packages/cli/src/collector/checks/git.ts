/**
 * Check: Git stats collection
 */

import type { GitStats } from '../types.js'
import { run } from '../runner.js'

export function collectGit(root: string): GitStats {
  const branch = run('git rev-parse --abbrev-ref HEAD', root).stdout.trim()
  const diffStat = run('git diff --stat HEAD', root).stdout
  const statusOut = run('git status --porcelain', root).stdout
  const logOut = run('git log --oneline -5', root).stdout

  const lines = diffStat.split('\n').filter(Boolean)
  const summaryLine = lines.at(-1) ?? ''
  const insertions = parseInt(summaryLine.match(/(\d+) insertion/)?.[1] ?? '0')
  const deletions = parseInt(summaryLine.match(/(\d+) deletion/)?.[1] ?? '0')
  const filesChanged = parseInt(summaryLine.match(/(\d+) file/)?.[1] ?? '0')

  return {
    branch,
    files_changed: filesChanged,
    insertions,
    deletions,
    uncommitted_files: statusOut.split('\n').filter(Boolean).length,
    recent_commits: logOut.split('\n').filter(Boolean).slice(0, 5),
  }
}
