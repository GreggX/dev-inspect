import { h } from '../core/dom.js'
import type { GitInfo as GitInfoData } from '../hooks/use-metrics.js'

export function GitInfo(git: GitInfoData): HTMLElement {
  const commitItems = git.recent_commits.map((c) => {
    const hash = c.substring(0, 7)
    const msg = c.substring(8)
    return h('li', null,
      h('span', { className: 'hash' }, hash),
      msg,
    )
  })

  const commitList = h('ul', { className: 'commits' })
  for (const item of commitItems) {
    commitList.appendChild(item)
  }

  return h('div', null,
    h('div', { className: 'section-title' }, 'Git'),
    h('div', { className: 'git-info' },
      h('div', { className: 'git-stats' },
        h('div', { className: 'git-stat' },
          h('div', { className: 'value' }, String(git.uncommitted_files)),
          h('div', { className: 'label' }, 'Uncommitted'),
        ),
        h('div', { className: 'git-stat' },
          h('div', { className: 'value' }, String(git.files_changed)),
          h('div', { className: 'label' }, 'Files Changed'),
        ),
        h('div', { className: 'git-stat' },
          h('div', { className: 'value ins' }, `+${git.insertions}`),
          h('div', { className: 'label' }, 'Insertions'),
        ),
        h('div', { className: 'git-stat' },
          h('div', { className: 'value del' }, `-${git.deletions}`),
          h('div', { className: 'label' }, 'Deletions'),
        ),
      ),
      commitList,
    ),
  )
}
