'use client'

import { forwardRef, useRef } from 'react'
import { InkButton, type InkButtonHandle } from './InkButton'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

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
  /**
   * Arbitrary leading icon, rendered left of the label — distinct from
   * `icon="ink"` (which specifically composes InkButton's enso ring). Use
   * this for a plain decorative/semantic icon with no click animation.
   */
  leadingIcon?: React.ReactNode
  /** Optional smaller second line rendered under the label. */
  subtitle?: string
  /**
   * Optional trailing chevron, right-aligned via `justify-between` instead
   * of the default centered layout. `'right'` for ordinary navigation;
   * `'down'` to hint that the action reveals a bottom sheet rather than
   * navigating away.
   */
  trailingIcon?: 'right' | 'down'
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'rounded-lg px-3 py-1.5 text-xs',
  md: 'rounded-xl px-4 py-3 text-sm',
  lg: 'rounded-2xl px-4 py-4 text-sm',
  xl: 'rounded-2xl px-6 py-6 text-base',
}

// Base classes shared by every variant — lifted verbatim from the
// hand-rolled `active:scale-[0.98]` + `transition-all` pattern duplicated
// across dashboard/login/signup buttons today.
const BASE_CLASSES =
  'inline-flex items-center gap-2 font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'

const TRAILING_ICON_PATH: Record<'right' | 'down', string> = {
  right: 'M5 12h14M13 5l7 7-7 7',
  down: 'M12 5v14M5 13l7 7 7-7',
}

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
  { variant = 'primary', size = 'md', icon, leadingIcon, subtitle, trailingIcon, className = '', style, children, onClick, type = 'button', ...rest },
  ref
) {
  const inkRef = useRef<InkButtonHandle>(null)
  const { style: variantStyles, hoverClass } = variantStyle(variant)
  const justifyClass = trailingIcon ? 'justify-between' : 'justify-center'

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    inkRef.current?.pulse()
    onClick?.(e)
  }

  return (
    <button
      ref={ref}
      className={`${BASE_CLASSES} ${justifyClass} ${SIZE_CLASSES[size]} ${hoverClass} ${className}`}
      style={{ ...variantStyles, ...style }}
      onClick={handleClick}
      type={type}
      {...rest}
    >
      <span className="inline-flex items-center gap-2">
        {icon === 'ink' && <InkButton ref={inkRef} size={size === 'sm' ? 14 : size === 'xl' ? 22 : 16} />}
        {leadingIcon && <span className="inline-flex flex-shrink-0" aria-hidden="true">{leadingIcon}</span>}
        <span className={subtitle ? 'text-left' : undefined}>
          <span className="block">{children}</span>
          {subtitle && (
            <span className="block text-xs font-normal mt-0.5" style={{ opacity: 0.85 }}>
              {subtitle}
            </span>
          )}
        </span>
      </span>
      {trailingIcon && (
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          className="flex-shrink-0"
          aria-hidden="true"
        >
          <path d={TRAILING_ICON_PATH[trailingIcon]} />
        </svg>
      )}
    </button>
  )
})
