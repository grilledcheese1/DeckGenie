import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { count } = await supabase
          .from('vocab_list')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
        if (count === 0) return NextResponse.redirect(`${origin}/settings?firstRun=true`)
      }
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
