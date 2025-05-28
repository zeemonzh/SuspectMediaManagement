'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await signIn(email, password)

    if (error) {
      setError(error)
      setLoading(false)
    } else {
      // Redirect will be handled by the auth state change
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-suspect-body flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 page-container">
        <div className="animate-fade-in-up">
          <div className="mx-auto h-20 w-20 flex items-center justify-center animate-scale-in">
            <div className="relative">
              <Image
                src="/logo.png"
                alt="SuspectCheats Logo"
                width={80}
                height={80}
                className="object-contain rounded-full shadow-2xl shadow-suspect-primary/30 border-2 border-suspect-primary/20 hover:shadow-suspect-primary/50 hover:border-suspect-primary/40 transition-all duration-300 hover:scale-105 animate-glow"
                priority
              />
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-suspect-primary/20 to-purple-500/20 blur-sm opacity-60 animate-pulse"></div>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-suspect-text animate-slide-up stagger-1">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-suspect-gray-400 animate-slide-up stagger-2">
            Access your SuspectCheats dashboard
          </p>
        </div>

        <form className="mt-8 space-y-6 animate-fade-in-up stagger-3" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-300 px-4 py-3 rounded animate-slide-up">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="animate-slide-up stagger-4">
              <label htmlFor="email" className="block text-sm font-medium text-suspect-text mb-2">
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
                className="input-field w-full"
                placeholder="Enter your email"
              />
            </div>
            
            <div className="animate-slide-up stagger-5">
              <label htmlFor="password" className="block text-sm font-medium text-suspect-text mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div className="animate-slide-up stagger-6">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center animate-fade-in stagger-6">
            <p className="text-suspect-gray-400">
              Don't have an account?{' '}
              <Link href="/register" className="text-suspect-primary hover:text-suspect-primary/80 transition-colors duration-200">
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
} 