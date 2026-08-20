import { Card } from '@/components/ui/Card'
import type { GenerateResponse, GrammarFocus, VocabWord } from '@/types'

interface Props {
  sentence: GenerateResponse
  vocabList: VocabWord[]
  grammarFocus: GrammarFocus | null | undefined
}

/**
 * Client-side synthesized tips — NOT driven by any API data (the backend
 * deliberately does not generate tips; that's an explicit scope decision).
 * Instead this templates 1-3 short strings from data already fetched for
 * this component: `sentence.vocab_used` cross-referenced against
 * `vocabList` for low-accuracy words, plus one tip referencing
 * `grammarFocus.pattern` when it's available.
 *
 * Renders nothing when there's nothing worth surfacing.
 */
export function TipsCard({ sentence, vocabList, grammarFocus }: Props) {
  const tips: string[] = []

  for (const zh of sentence.vocab_used) {
    if (tips.length >= 2) break
    const word = vocabList.find(w => w.word_zh === zh)
    if (!word || word.times_seen <= 0) continue
    const accuracy = word.times_correct / word.times_seen
    if (accuracy < 0.5) {
      tips.push(`Review ${word.word_zh} (${word.pinyin}) — you've gotten this wrong before.`)
    }
  }

  if (grammarFocus && tips.length < 3) {
    tips.push(`Practice more sentences using ${grammarFocus.pattern}.`)
  }

  if (tips.length === 0) return null

  return (
    <Card padding="md">
      <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>
        Tips
      </p>
      <ul className="space-y-2">
        {tips.slice(0, 3).map((tip, i) => (
          <li key={i} className="text-xs leading-relaxed flex gap-2" style={{ color: 'var(--text-secondary)' }}>
            <span aria-hidden="true" style={{ color: 'var(--accent-text)' }}>•</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
