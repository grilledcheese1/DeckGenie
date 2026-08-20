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

function LoginContent() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState<ThemeId>(loadSavedTheme)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        setError('Please confirm your email first — check your inbox for a confirmation link.')
      } else {
        setError(error.message)
      }
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <AuthLayout signMode={themeToSignMode(theme)}>
      <AuthCard subtitle="Practice">
        {/* Theme picker */}
        <div className="mb-8">
          <ThemePicker selected={theme} onChange={setTheme} />
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
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
            placeholder="••••••••"
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
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
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
            Continue with Google
          </span>
        </Button>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-tertiary)' }}>
          No account?{' '}
          <Link href="/signup" style={{ color: 'var(--accent)' }}>Create one</Link>
        </p>
      </AuthCard>
    </AuthLayout>
  )
}

export default function LoginPage() {
  return (
    <ThemedLayout>
      <LoginContent />
    </ThemedLayout>
  )
}
