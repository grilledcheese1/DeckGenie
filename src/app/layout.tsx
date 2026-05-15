import type { Metadata } from 'next'
import { Noto_Serif_SC, DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const notoSerifSC = Noto_Serif_SC({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-hanzi', display: 'swap' })

export const metadata: Metadata = {
  title: '汉字练习 — Chinese Vocab Practice',
  description: 'Learn Chinese vocabulary with AI-powered sentence practice',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${notoSerifSC.variable}`}>
      <body className="bg-stone-950 text-stone-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
