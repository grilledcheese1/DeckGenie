'use client'

interface Props {
  page: number
  totalPages: number
  shownCount: number
  totalCount: number
  onPageChange: (page: number) => void
}

/** Collapses to first/last two pages + a window around the current page,
 *  with `…` for any gap -- stays compact regardless of totalPages. */
function pageList(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const pages = new Set([1, 2, totalPages - 1, totalPages, page - 1, page, page + 1])
  const sorted = [...pages].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const result: (number | '…')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) result.push('…')
    result.push(p)
  })
  return result
}

export function VocabPagination({ page, totalPages, shownCount, totalCount, onPageChange }: Props) {
  const items = pageList(page, totalPages)

  return (
    <div className="flex items-center justify-between mt-4 text-xs flex-wrap gap-3" style={{ color: 'var(--text-tertiary)' }}>
      <p>Showing {shownCount} of {totalCount} words</p>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          ‹
        </button>

        {items.map((item, i) => item === '…' ? (
          <span key={`ellipsis-${i}`} className="px-1">…</span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className="w-7 h-7 rounded-lg flex items-center justify-center font-medium transition-colors"
            style={item === page
              ? { backgroundColor: 'var(--accent)', color: 'white' }
              : { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }
            }
          >
            {item}
          </button>
        ))}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          ›
        </button>
      </div>
    </div>
  )
}
