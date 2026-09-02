import type { WrongAnswer } from '@/types'

interface Props {
  item: WrongAnswer
  /**
   * Extra class names for the card root — `ReviewScreen` passes
   * `review-item` so its existing GSAP stagger-in selector
   * (`gsap.fromTo('.review-item', ...)`) keeps targeting these cards
   * unchanged. The new `/review` page passes nothing (it has no such
   * animation).
   */
  className?: string
}

/**
 * The "wrong answer" card markup — sentence/pinyin, your-answer vs
 * correct-answer, vocab chips — extracted out of `ReviewScreen` so both
 * the in-session review overlay (`ReviewScreen`, unchanged props/usage in
 * `practice/page.tsx`) and the new `/review` history page render the same
 * card instead of duplicating this markup. Purely presentational — no
 * GSAP refs of its own; `ReviewScreen`'s stagger-in animation targets it
 * from outside via the `.review-item` class name, not internal refs.
 */
export function WrongAnswerCard({ item, className = '' }: Props) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}
    >
      <p
        className="font-hanzi mb-1"
        style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: 'var(--text-primary)', lineHeight: 1.3 }}
      >
        {item.sentence_zh}
      </p>
      <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
        {item.sentence_py}
      </p>

      <div className="mb-4" style={{ height: '0.5px', background: 'var(--border)' }} />

      <div className="mb-3">
        <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
          Your answer
        </p>
        <p
          className="text-sm px-3 py-2 rounded-xl"
          style={{
            color: '#f87171',
            background: 'rgba(248,113,113,0.08)',
            border: '0.5px solid rgba(248,113,113,0.2)',
          }}
        >
          {item.user_answer || '(no answer)'}
        </p>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
          Correct answer
        </p>
        <p
          className="text-sm px-3 py-2 rounded-xl"
          style={{
            color: 'var(--accent-text)',
            background: 'var(--accent-subtle)',
            border: '0.5px solid var(--accent)',
          }}
        >
          {item.correct_answer}
        </p>
      </div>

      {item.vocab_used.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {item.vocab_used.map(zh => (
            <span
              key={zh}
              className="text-xs px-2 py-0.5 rounded-lg font-hanzi"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-tertiary)',
                border: '0.5px solid var(--border)',
              }}
            >
              {zh}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
