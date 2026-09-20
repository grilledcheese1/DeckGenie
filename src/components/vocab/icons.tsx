import type { SVGProps } from 'react'

/** Small icon set for the redesigned /vocabulary page — app convention:
 *  viewBox 0 0 24 24, stroke=currentColor, strokeWidth ~1.8, round caps
 *  (see e.g. src/components/ui/StatIcons.tsx). */
function base(props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> {
  return {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  }
}

const STAR_PATH = 'm12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8-4.3-4.1 5.9-.9L12 3Z'

export function StarIcon({ filled = false, ...props }: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg {...base(props)} fill={filled ? 'currentColor' : 'none'}>
      <path d={STAR_PATH} />
    </svg>
  )
}

export function MoreIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  )
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

/** Small sprout/leaf glyph for the "Small steps · Big progress" wordmark
 *  — same shape dashboard/page.tsx's local LeafIcon uses, duplicated here
 *  rather than imported (this codebase's existing convention: small icons
 *  are defined per-file, not centralized). */
export function LeafGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M5 21c8 0 14-6 14-14V5h-2C9 5 5 11 5 19v2Z" />
      <path d="M5 21c2.5-4 6-7 10.5-9" />
    </svg>
  )
}
