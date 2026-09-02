import { SentenceBreakdownCard } from './SentenceBreakdownCard'
import { GrammarFocusCard } from './GrammarFocusCard'
import { TipsCard } from './TipsCard'
import type { GenerateResponse, GrammarFocus, SentenceStructureSegment, VocabWord } from '@/types'

interface Props {
  sentence: GenerateResponse
  vocabList: VocabWord[]
  grammarFocus: GrammarFocus | null | undefined
  sentenceStructure: SentenceStructureSegment[] | null | undefined
}

/**
 * Composes analysis mode's right-rail cards. Each card owns its own
 * null-handling for the (possibly not-yet-populated) grammar-analysis
 * fields — this component just wires the already-fetched data through.
 */
export function AnalysisRightRail({ sentence, vocabList, grammarFocus, sentenceStructure }: Props) {
  return (
    <>
      <SentenceBreakdownCard segments={sentenceStructure} vocabList={vocabList} />
      <GrammarFocusCard grammarFocus={grammarFocus} />
      <TipsCard sentence={sentence} vocabList={vocabList} grammarFocus={grammarFocus} />
    </>
  )
}
