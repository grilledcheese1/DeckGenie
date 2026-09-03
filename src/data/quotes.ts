export interface Quote {
  zh: string
  py: string
  en: string
}

/**
 * Static idiom deck for `QuoteCard` — fully client-side, no backend. Seeded
 * from the Chinese idiom strings already hardcoded in `NeonSign` props
 * across login/signup/dashboard (`温故知新`, `循序渐进`, `融会贯通`, plus the
 * two longer ones below), with a few more written in the same
 * idiom-plus-English-gloss style.
 */
export const QUOTES: Quote[] = [
  { zh: '千里之行，始于足下', py: 'Qiān lǐ zhī xíng, shǐ yú zú xià', en: 'A journey of a thousand miles begins with a single step.' },
  { zh: '学而不思则罔，思而不学则殆', py: 'Xué ér bù sī zé wǎng, sī ér bù xué zé dài', en: 'Learning without thought is labor lost; thought without learning is perilous.' },
  { zh: '温故知新', py: 'Wēn gù zhī xīn', en: 'Review the old to learn the new.' },
  { zh: '循序渐进', py: 'Xún xù jiàn jìn', en: 'Proceed step by step, in due order.' },
  { zh: '融会贯通', py: 'Róng huì guàn tōng', en: 'Master through thorough synthesis.' },
  { zh: '熟能生巧', py: 'Shú néng shēng qiǎo', en: 'Practice makes perfect.' },
  { zh: '不积跬步，无以至千里', py: 'Bù jī kuǐ bù, wú yǐ zhì qiān lǐ', en: 'Without accumulating small steps, one cannot travel a thousand miles.' },
  { zh: '滴水穿石', py: 'Dī shuǐ chuān shí', en: 'Dripping water wears through stone — persistence pays off.' },
  { zh: '持之以恒', py: 'Chí zhī yǐ héng', en: 'Perseverance leads to success.' },
]
