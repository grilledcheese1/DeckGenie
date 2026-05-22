'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ThemePicker } from '@/components/ui/ThemePicker'
import { ThemedLayout } from '@/components/ui/ThemedLayout'
import { loadSavedTheme, type ThemeId } from '@/lib/theme'
import { NeonSign } from '@/components/ui/NeonSign'
import type { SignMode } from '@/components/ui/NeonSign'
import { NeonSignH } from '@/components/ui/NeonSignH'

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

  const signMode: SignMode =
    theme === 'vermillion-cream' ? 'vermillion' :
    theme === 'bamboo-light'     ? 'bamboo'     : 'neon'

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Neon signs — left of the login form. Adjust top/left/bottom values to reposition. */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ opacity: 0.13, zIndex: 0 }}
        aria-hidden="true"
      >
        {/*Left Side*/}
        <NeonSign english="DECKGENIE"  chinese="甲板精灵" color="#51C2BA" glowColor={signMode === 'neon' ? "rgba(0,255,245,0.35)" : undefined} size={4} delay={0} mode={signMode} fadeInDuration={1.5} className="absolute" style={{ left: '-40%', top: '6%' }} />
        <NeonSign english="PERSIST"  chinese="坚持" color="#51C2BA" glowColor={signMode === 'neon' ? "rgba(0,255,245,0.35)" : undefined} size={3} delay={1.4} mode={signMode} fadeInDuration={1.5} className="absolute" style={{ left: '-27%', top: '-41%' }} />
        <NeonSignH english="PROGRESS" chinese="进步" color="#51C2BA" glowColor={signMode === 'neon' ? "rgba(0,255,245,0.35)" : undefined}  size={2.5} delay={2.8} mode={signMode} fadeInDuration={1.5} className="absolute" style={{ left: '4%', bottom: '39%' }} />

        {/*Right Side*/}
        <NeonSign english="REFLECT" chinese="温故知新" color="#51C2BA" glowColor={signMode === 'neon' ? "rgba(0,255,245,0.35)" : undefined} size={3.5} delay={.5} mode={signMode} fadeInDuration={1.5} className="absolute" style={{ right: '-38%', top: '-102%' }} />
        <NeonSign english="ORDER" chinese="循序渐进" color="#51C2BA" glowColor={signMode === 'neon' ? "rgba(0,255,245,0.35)" : undefined}  size={2.2} delay={2.8} mode={signMode} fadeInDuration={1.5} className="absolute" style={{ left: '27%',  bottom: '170%' }} />
        <NeonSign english="LEARNING WITHOUT THINKING IS USELESS" chinese="学而不思则罔，思而不学则殆 " color="#51C2BA" glowColor={signMode === 'neon' ? "rgba(0,255,245,0.35)" : undefined}  size={1} delay={2.8} mode={signMode} fadeInDuration={1.5} className="absolute" style={{ left: '27%',  bottom: '168%' }} />

      </div>
      <div className="w-full max-w-sm relative" style={{ zIndex: 1 }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <p className="font-hanzi text-5xl mb-2" style={{ color: 'var(--hanzi-color)' }}>汉字</p>
          <p className="text-sm tracking-widest uppercase" style={{ color: 'var(--text-tertiary)' }}>Practice</p>
        </div>

        {/* Theme picker */}
        <div className="mb-8">
          <ThemePicker selected={theme} onChange={setTheme} />
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--input-focus)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--input-border)')}
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--input-focus)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--input-border)')}
            />
          </div>

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

          <button
            type="submit"
            disabled={loading}
            className="w-full font-medium rounded-xl py-3 text-sm transition-all disabled:opacity-50 active:scale-[0.98]"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
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
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 rounded-xl py-3 text-sm transition-all"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-tertiary)' }}>
          No account?{' '}
          <Link href="/signup" style={{ color: 'var(--accent)' }}>Create one</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <ThemedLayout>
      <LoginContent />
    </ThemedLayout>
  )
}
