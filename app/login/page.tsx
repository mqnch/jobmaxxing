'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-[#111111] border border-[rgba(255,255,255,0.1)] rounded-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[#f5f5f5]">
            sign in to jobmaxxing
          </h2>
          <p className="mt-2 text-center text-sm text-[#a0a0a0]">
            Supabase will send you a magic link to sign in
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
                message.includes('Check your email')
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
        </form>
      </div>
    </div>
  )
}
