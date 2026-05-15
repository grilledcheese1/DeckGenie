'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="font-hanzi text-5xl mb-2 text-emerald-400">汉字</p>
          <p className="text-stone-400 text-sm tracking-widest uppercase">Practice</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-stone-400 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-600 focus:border-emerald-700 focus:outline-none transition-colors"
              placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-600 focus:border-emerald-700 focus:outline-none transition-colors"
              placeholder="••••••••" />
          </div>
          {error && <p className="text-red-400 text-xs bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium rounded-xl py-3 text-sm transition-colors">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-800" /></div>
          <div className="relative flex justify-center"><span className="bg-stone-950 px-3 text-xs text-stone-600">or</span></div>
        </div>
        <button onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl py-3 text-sm text-stone-200 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
        <p className="text-center text-xs text-stone-600 mt-6">
          No account? <Link href="/signup" className="text-emerald-500 hover:text-emerald-400">Create one</Link>
        </p>
      </div>
    </div>
  )
}
