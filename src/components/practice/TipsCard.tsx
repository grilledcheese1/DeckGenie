import { Card } from '@/components/ui/Card'
import type { GenerateResponse, GrammarFocus, VocabWord } from '@/types'

interface Props {
  sentence: GenerateResponse
  vocabList: VocabWord[]
  grammarFocus: GrammarFocus | null | undefined
}

interface Tip {
  icon: 'review' | 'practice' | 'learn'
  title: string
  description: string
}

const ICON_STYLE: Record<Tip['icon'], { bg: string; color: string }> = {
  review:   { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  practice: { bg: 'rgba(56,189,248,0.15)', color: '#38bdf8' },
  learn:    { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
}

function TipIcon({ icon }: { icon: Tip['icon'] }) {
  if (icon === 'review') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
    )
  }
  if (icon === 'practice') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.5" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" />
    </svg>
  )
}

// Sentence-type patterns worth a targeted "practice more like this" nudge —
// checked in this order so the most specific/least common pattern wins.
const SENTENCE_TYPE_TIPS: Array<{ particle: string; pinyin: string; title: string; description: string }> = [
  { particle: '吗', pinyin: 'ma', title: 'Practice question sentences', description: 'Try more sentences ending with 吗 (ma).' },
  { particle: '过', pinyin: 'guo', title: 'Practice past experience', description: 'Try more sentences using 过 (guo).' },
  { particle: '了', pinyin: 'le', title: 'Practice completed actions', description: 'Try more sentences using 了 (le).' },
  { particle: '呢', pinyin: 'ne', title: 'Practice follow-up questions', description: 'Try more sentences ending with 呢 (ne).' },
]

/**
 * Client-side synthesized tips — NOT driven by any API data (the backend
 * deliberately does not generate tips; that's an explicit scope decision).
 * Instead this templates up to 3 tips from data already fetched for this
 * component: `sentence.vocab_used` cross-referenced against `vocabList` for
 * a weak word to review, `sentence.sentence_zh` for a recognizable grammar
 * particle worth more practice, and `vocab_used` words missing from
 * `vocabList` entirely (i.e. not yet tracked) as "new words to learn".
 *
 * Renders nothing when there's nothing worth surfacing.
 */
export function TipsCard({ sentence, vocabList, grammarFocus }: Props) {
  const tips: Tip[] = []

  const weakWord = sentence.vocab_used
    .map(zh => vocabList.find(w => w.word_zh === zh))
    .find(w => w && w.times_seen > 0 && w.times_correct / w.times_seen < 0.5)
  if (weakWord) {
    tips.push({
      icon: 'review',
      title: `Review ${weakWord.word_zh} (${weakWord.pinyin})`,
      description: 'Make sure you recognize it in different contexts.',
    })
  }

  const sentenceType = SENTENCE_TYPE_TIPS.find(t => sentence.sentence_zh.includes(t.particle))
  if (sentenceType) {
    tips.push({ icon: 'practice', title: sentenceType.title, description: sentenceType.description })
  } else if (grammarFocus) {
    tips.push({
      icon: 'practice',
      title: 'Practice this pattern',
      description: `Try more sentences using ${grammarFocus.pattern}.`,
    })
  }

  const newWords = sentence.vocab_used.filter(zh => !vocabList.some(w => w.word_zh === zh))
  if (newWords.length > 0) {
    tips.push({
      icon: 'learn',
      title: 'Learn new words',
      description: newWords.slice(0, 3).join('、'),
    })
  }

  if (tips.length === 0) return null

  return (
    <Card padding="md">
      <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>
        Tips to improve
      </p>
      <div className="space-y-3">
        {tips.slice(0, 3).map((tip, i) => (
          <div key={i} className="flex items-start gap-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: ICON_STYLE[tip.icon].bg, color: ICON_STYLE[tip.icon].color }}
            >
              <TipIcon icon={tip.icon} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {tip.title}
              </p>
              <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {tip.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
