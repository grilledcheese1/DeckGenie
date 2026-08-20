'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ThemePicker } from '@/components/ui/ThemePicker'
import { ThemedLayout } from '@/components/ui/ThemedLayout'
import { TextInput } from '@/components/ui/TextInput'
import { GoogleIcon } from '@/components/ui/GoogleIcon'
import { Button } from '@/components/ui/Button'
import { loadSavedTheme, themeToSignMode, type ThemeId } from '@/lib/theme'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthCard } from '@/components/auth/AuthCard'

function SignupContent() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [theme, setTheme] = useState<ThemeId>(loadSavedTheme)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('rate limit') || error.status === 429) {
        setError('Too many attempts — please wait a few minutes, or log in if you already have an account.')
      } else if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already exists')) {
        setError('This email is already registered. Try logging in instead.')
      } else {
        setError(error.message)
      }
      setLoading(false)
    } else if (data.session) {
      // Email confirmation is disabled — user is immediately logged in.
      // Brand-new account has no vocab yet, so route through onboarding to seed it
      // (mirrors the /auth/callback OAuth path).
      window.location.href = '/settings?firstRun=true'
    } else {
      // Email confirmation is enabled — confirmation email sent
      setConfirmationSent(true)
      setLoading(false)
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  const signMode = themeToSignMode(theme)

  if (confirmationSent) {
    return (
      <AuthLayout signMode={signMode} variant="confirmation">
        <AuthCard centered>
          <div
            className="rounded-2xl p-6"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Check your email</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              We sent a confirmation link to{' '}
              <span style={{ color: 'var(--text-primary)' }}>{email}</span>.
              Click it to activate your account and you&apos;ll be logged in automatically.
            </p>
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--text-tertiary)' }}>
            Already confirmed?{' '}
            <Link href="/login" style={{ color: 'var(--accent)' }}>Log in</Link>
          </p>
        </AuthCard>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout signMode={signMode}>
      <AuthCard subtitle="Create account">
        {/* Theme picker */}
        <div className="mb-8">
          <ThemePicker selected={theme} onChange={setTheme} />
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
          <TextInput
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="min 8 characters"
          />

          {error && (
            <p
              className="text-xs rounded-lg px-3 py-2"
              style={{
                backgroundColor: 'var(--error-bg)',
                border: '1px solid var(--error-border)',
                color: 'var(--error-text)',
              }}
            >
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" icon="ink" size="lg" disabled={loading} className="w-full">
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: 'var(--border)' }} />
          </div>
          <div className="relative flex justify-center">
            <span
              className="px-3 text-xs"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}
            >
              or
            </span>
          </div>
        </div>

        {/* Google */}
        <Button variant="secondary" size="lg" className="w-full" onClick={handleGoogle}>
          <span className="inline-flex items-center gap-3">
            <GoogleIcon size={16} />
            Sign up with Google
          </span>
        </Button>

        <div className="mt-3">
          <Link
            href="/login"
            className="w-full flex items-center justify-center font-medium rounded-2xl py-4 text-sm transition-all"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            Already have an account? Log in →
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}

export default function SignupPage() {
  return (
    <ThemedLayout>
      <SignupContent />
    </ThemedLayout>
  )
}
