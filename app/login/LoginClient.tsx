'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginClient() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
    } else {
      setMessage('check your email for the magic link!')
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-[#111111] border border-[rgba(255,255,255,0.1)] rounded-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[#f5f5f5]">
            sign in to jobmaxxing
          </h2>
          <p className="mt-2 text-center text-sm text-[#a0a0a0]">
            Choose a sign in method below
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-[rgba(255,255,255,0.1)] bg-[#0a0a0a] placeholder-[#a0a0a0] text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors"
              placeholder="Email address"
            />
          </div>

          {message && (
            <div
              className={`text-sm ${
                message.includes('check your email')
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}
            >
              {message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sending...' : 'Send magic link'}
            </button>
          </div>

          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-[rgba(255,255,255,0.1)] w-full"></div>
            <span className="absolute px-3 bg-[#111111] text-xs text-[#888888] uppercase tracking-wider">
              or
            </span>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-[rgba(255,255,255,0.1)] rounded-md bg-[#0a0a0a] text-sm font-medium text-[#f5f5f5] hover:bg-[rgba(255,255,255,0.05)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.187 4.114-3.52 0-6.38-2.858-6.38-6.38s2.86-6.38 6.38-6.38c1.54 0 2.94.55 4.03 1.46l3.05-3.05C18.98 2.16 15.84 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.89 0 10.8-4.26 10.8-11.24 0-.67-.06-1.32-.17-1.955H12.24z"
                />
              </svg>
              Sign in with Google
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

