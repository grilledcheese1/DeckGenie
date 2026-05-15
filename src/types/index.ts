export interface Settings {
  id: string
  user_id: string
  starting_hsk: 1 | 2 | 3 | 4 | 5 | 6
  strictness: 1 | 2 | 3
  sentences_per_round: number
  rounds_before_unlock: number
  words_per_unlock: number
  show_pinyin: 'always' | 'tap' | 'never'
  show_hints: 'before' | 'after' | 'never'
  created_at: string
  updated_at: string
}

export interface VocabWord {
  id: string
  user_id: string
  word_zh: string
  pinyin: string
  english: string
  pos: 'noun' | 'verb' | 'adjective' | 'adverb' | 'other'
  topic: string
  hsk_level: 1 | 2 | 3 | 4 | 5 | 6
  unlocked_at: string
  times_seen: number
  times_correct: number
}

export interface Progress {
  id: string
  user_id: string
  rounds_completed: number
  sentences_completed: number
  current_round_sentences: number
  current_round_number: number
  accuracy_history: AccuracyEntry[]
  rolling_accuracy: number
  updated_at: string
}

export interface AccuracyEntry {
  date: string
  accuracy: number
}

export interface CorpusWord {
  zh: string
  py: string
  en: string
  pos: 'noun' | 'verb' | 'adjective' | 'adverb' | 'other'
  topic: string
  hsk: 1 | 2 | 3 | 4 | 5 | 6
}

export interface GenerateResponse {
  sentence_zh: string
  sentence_py: string
  vocab_used: string[]
}

export interface GradeRequest {
  user_answer: string
  sentence_zh: string
  sentence_py: string
  strictness: 1 | 2 | 3
  vocab_used?: string[]
}

export interface GradeResponse {
  correct: boolean
  score: number
  feedback: string
  correct_answer: string
}

export interface WordsRequest {
  pos?: string
  topic?: string
  hsk_level?: number
  exclude_zh: string[]
  count: number
}

export interface WordsResponse {
  words: CorpusWord[]
}

export type PinyinMode = 'showing' | 'hidden'

export interface SentenceState {
  sentence: GenerateResponse | null
  pinyinMode: PinyinMode
  userAnswer: string
  grade: GradeResponse | null
  status: 'loading' | 'ready' | 'submitted' | 'graded'
}
