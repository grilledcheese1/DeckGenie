'use client'

import { forwardRef, useRef } from 'react'
import { InkButton, type InkButtonHandle } from './InkButton'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /**
   * Decorative Chinese-styling icon rendered left of the label. Currently
   * only `"ink"` is supported — composes InkButton's enso ring + click
   * splash. Intended for the `primary` variant (the app's main CTA), but
   * not hard-gated to it.
   */
  icon?: 'ink'
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'rounded-lg px-3 py-1.5 text-xs',
  md: 'rounded-xl px-4 py-3 text-sm',
  lg: 'rounded-2xl px-4 py-4 text-sm',
}

// Base classes shared by every variant — lifted verbatim from the
// hand-rolled `active:scale-[0.98]` + `transition-all` pattern duplicated
// across dashboard/login/signup buttons today.
const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'

/**
 * Variant color/border/hover treatment.
 *
 * `secondary` and `ghost` reuse the codebase's existing `.hover-bg` /
 * `.hover-border` helper classes (see globals.css) since they're flat,
 * single-token backgrounds/borders those helpers were built for.
 *
 * `primary` and `danger` deliberately do NOT use `.hover-accent` /
 * `.hover-border` — `.hover-accent` forces `background-color` to
 * `var(--accent-hover)` with `!important`, which would blow away primary's
 * CTA gradient, and danger's border color is semantically red (error
 * tokens), not the neutral `var(--border-hover)` those helpers assume.
 * Instead they use Tailwind's non-color `hover:brightness-95` filter
 * utility, which doesn't conflict with the "no Tailwind color utilities"
 * convention since it isn't a color token.
 */
function variantStyle(variant: ButtonVariant): { style: React.CSSProperties; hoverClass: string } {
  switch (variant) {
    case 'primary':
      return {
        style: {
          backgroundImage: 'linear-gradient(90deg, var(--gradient-cta-from), var(--gradient-cta-to))',
          color: '#ffffff',
        },
        hoverClass: 'hover:brightness-95',
      }
    case 'danger':
      return {
        style: {
          backgroundColor: 'var(--error-bg)',
          border: '1px solid var(--error-border)',
          color: 'var(--error-text)',
        },
        hoverClass: 'hover:brightness-95',
      }
    case 'ghost':
      return {
        style: {
          backgroundColor: 'transparent',
          color: 'var(--text-secondary)',
        },
        hoverClass: 'hover:opacity-70',
      }
    case 'secondary':
    default:
      return {
        style: {
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
        },
        hoverClass: 'hover-bg',
      }
  }
}

/**
 * Shared button primitive. Replaces the hand-rolled
 * `active:scale-[0.98]` + inline-style button markup duplicated across
 * dashboard/login/signup/vocab call sites.
 *
 * `<Button variant="primary" icon="ink">Start practice</Button>` composes
 * InkButton automatically — no per-page GSAP code needed.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, className = '', style, children, onClick, type = 'button', ...rest },
  ref
) {
  const inkRef = useRef<InkButtonHandle>(null)
  const { style: variantStyles, hoverClass } = variantStyle(variant)

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    inkRef.current?.pulse()
    onClick?.(e)
  }

  return (
    <button
      ref={ref}
      className={`${BASE_CLASSES} ${SIZE_CLASSES[size]} ${hoverClass} ${className}`}
      style={{ ...variantStyles, ...style }}
      onClick={handleClick}
      type={type}
      {...rest}
    >
      {icon === 'ink' && <InkButton ref={inkRef} size={size === 'sm' ? 14 : 16} />}
      <span>{children}</span>
    </button>
  )
})
