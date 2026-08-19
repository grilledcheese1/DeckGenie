'use client'

import { forwardRef, useId } from 'react'

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

/**
 * Extracts the `onFocus`/`onBlur` border-color-swap pattern duplicated
 * across every login/signup input (border goes `var(--input-border)` ->
 * `var(--input-focus)` on focus, and back on blur).
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, className = '', style, id, onFocus, onBlur, ...rest },
  ref
) {
  // Falls back to a generated id so <label htmlFor> stays correctly
  // associated with the input even when the caller doesn't pass one.
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-xs mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors ${className}`}
        style={{
          backgroundColor: 'var(--input-bg)',
          border: '1px solid var(--input-border)',
          color: 'var(--text-primary)',
          ...style,
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'var(--input-focus)'
          onFocus?.(e)
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--input-border)'
          onBlur?.(e)
        }}
        {...rest}
      />
    </div>
  )
})
