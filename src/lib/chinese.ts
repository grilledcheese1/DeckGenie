export function getToneFromPinyin(py: string): 1 | 2 | 3 | 4 | 0 {
  if (/[āēīōūǖ]/.test(py)) return 1
  if (/[áéíóúǘ]/.test(py)) return 2
  if (/[ǎěǐǒǔǚ]/.test(py)) return 3
  if (/[àèìòùǜ]/.test(py)) return 4
  return 0
}

export const TONE_LABELS: Record<number, string> = {
  1: '1st — ā',
  2: '2nd — á',
  3: '3rd — ǎ',
  4: '4th — à',
  0: 'Neutral',
}

export function segmentSentence(
  sentence: string,
  vocabUsed: string[]
): string[] {
  const words = [...vocabUsed].sort((a, b) => b.length - a.length)
  const segments: string[] = []
  let i = 0

  while (i < sentence.length) {
    const ch = sentence[i]

    if (/[。，？！、；：""''（）【】…—]/.test(ch)) {
      segments.push(ch)
      i++
      continue
    }

    let matched = false
    for (const word of words) {
      if (word.length > 1 && sentence.startsWith(word, i)) {
        segments.push(word)
        i += word.length
        matched = true
        break
      }
    }

    if (!matched) {
      segments.push(ch)
      i++
    }
  }

  return segments
}

export const RADICAL_MAP: Record<string, { radical: string; pinyin: string; meaning: string }> = {
  '喝': { radical: '口', pinyin: 'kǒu', meaning: 'Mouth — hints at words related to speaking, eating, or drinking.' },
  '吃': { radical: '口', pinyin: 'kǒu', meaning: 'Mouth — hints at words related to speaking, eating, or drinking.' },
  '说': { radical: '讠', pinyin: 'yán', meaning: 'Speech — appears in words related to language and communication.' },
  '看': { radical: '目', pinyin: 'mù', meaning: 'Eye — appears in words related to seeing and watching.' },
  '听': { radical: '口', pinyin: 'kǒu', meaning: 'Mouth — simplified form of 聽; the 口 component hints at sound and communication.' },
  '走': { radical: '走', pinyin: 'zǒu', meaning: 'Walk — appears in words related to movement and travel.' },
  '来': { radical: '木', pinyin: 'mù', meaning: 'Tree/wood — one of the most common radicals.' },
  '去': { radical: '厶', pinyin: 'sī', meaning: 'Private — a simple structural radical.' },
  '买': { radical: '乙', pinyin: 'yǐ', meaning: 'Second heavenly stem — structural radical.' },
  '喜': { radical: '口', pinyin: 'kǒu', meaning: 'Mouth — hints at expression and feeling.' },
  '爱': { radical: '心', pinyin: 'xīn', meaning: 'Heart — appears in words related to emotion and feeling.' },
  '想': { radical: '心', pinyin: 'xīn', meaning: 'Heart — appears in words related to thought and emotion.' },
  '觉': { radical: '见', pinyin: 'jiàn', meaning: 'See — appears in words related to perception.' },
  '家': { radical: '宀', pinyin: 'mián', meaning: 'Roof — appears in words related to home and shelter.' },
  '学': { radical: '子', pinyin: 'zǐ', meaning: 'Child — appears in words related to learning and youth.' },
  '好': { radical: '女', pinyin: 'nǚ', meaning: 'Woman — one of the most common radicals in Chinese.' },
  '妈': { radical: '女', pinyin: 'nǚ', meaning: 'Woman — appears in words for female family members.' },
  '姐': { radical: '女', pinyin: 'nǚ', meaning: 'Woman — appears in words for female family members.' },
  '她': { radical: '女', pinyin: 'nǚ', meaning: 'Woman — used in words referring to females.' },
  '他': { radical: '亻', pinyin: 'rén', meaning: 'Person — the standing person radical, very common.' },
  '你': { radical: '亻', pinyin: 'rén', meaning: 'Person — the standing person radical, very common.' },
  '们': { radical: '亻', pinyin: 'rén', meaning: 'Person — used here to form plurals.' },
  '做': { radical: '亻', pinyin: 'rén', meaning: 'Person — appears in words about human actions.' },
  '工': { radical: '工', pinyin: 'gōng', meaning: 'Work — appears in words related to labor and craft.' },
  '水': { radical: '水', pinyin: 'shuǐ', meaning: 'Water — appears in many words related to liquids.' },
  '河': { radical: '氵', pinyin: 'shuǐ', meaning: 'Water — the 3-drop water radical, very common.' },
  '海': { radical: '氵', pinyin: 'shuǐ', meaning: 'Water — the 3-drop water radical.' },
  '钱': { radical: '钅', pinyin: 'jīn', meaning: 'Metal/gold — appears in words about money and metals.' },
  '电': { radical: '电', pinyin: 'diàn', meaning: 'Electricity — appears in tech-related words.' },
  '书': { radical: '乙', pinyin: 'yǐ', meaning: 'Second heavenly stem — structural radical.' },
  '天': { radical: '大', pinyin: 'dà', meaning: 'Big/great — appears in words about sky and time.' },
  '日': { radical: '日', pinyin: 'rì', meaning: 'Sun/day — appears in words about time and brightness.' },
  '月': { radical: '月', pinyin: 'yuè', meaning: 'Moon/month — appears in words about time.' },
  '年': { radical: '干', pinyin: 'gān', meaning: 'Dry/trunk — structural component.' },
  '人': { radical: '人', pinyin: 'rén', meaning: 'Person — one of the most fundamental radicals.' },
  '大': { radical: '大', pinyin: 'dà', meaning: 'Big — a primary radical representing size.' },
  '小': { radical: '小', pinyin: 'xiǎo', meaning: 'Small — a primary radical representing size.' },
  '上': { radical: '一', pinyin: 'yī', meaning: 'One — a simple directional character.' },
  '下': { radical: '一', pinyin: 'yī', meaning: 'One — a simple directional character.' },
  '中': { radical: '丨', pinyin: 'gǔn', meaning: 'Vertical stroke — a simple structural radical.' },
}
