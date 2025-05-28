'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [tiktokUsername, setTiktokUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'streamer'>('streamer')
  const [invitationKey, setInvitationKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    if (!username.trim()) {
      setError('Username is required')
      setLoading(false)
      return
    }

    if (role === 'streamer' && !tiktokUsername.trim()) {
      setError('TikTok username is required for streamer accounts')
      setLoading(false)
      return
    }

    if (role === 'admin' && !invitationKey.trim()) {
      setError('Invitation key is required for admin accounts')
      setLoading(false)
      return
    }

    const { error } = await signUp(email, password, role, username, invitationKey, tiktokUsername)

    if (error) {
      setError(error)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-suspect-body flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="card p-8">
            <div className="text-green-400 text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-suspect-text mb-4">Account Created!</h2>
            <p className="text-suspect-gray-400 mb-4">
              Please check your email to verify your account, then sign in.
            </p>
            <p className="text-suspect-gray-400 text-sm">
              Redirecting to login page...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-suspect-body flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-20 w-20 flex items-center justify-center">
            <div className="relative">
              <Image
                src="/logo.png"
                alt="SuspectCheats Logo"
                width={80}
                height={80}
                className="object-contain rounded-full shadow-2xl shadow-suspect-primary/30 border-2 border-suspect-primary/20 hover:shadow-suspect-primary/50 hover:border-suspect-primary/40 transition-all duration-300 hover:scale-105"
                priority
              />
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-suspect-primary/20 to-purple-500/20 blur-sm opacity-60 animate-pulse"></div>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-suspect-text">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-suspect-gray-400">
            Join the SuspectCheats platform
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-suspect-text mb-2">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('streamer')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    role === 'streamer'
                      ? 'border-suspect-primary bg-suspect-primary/10'
                      : 'border-suspect-gray-600 hover:border-suspect-gray-500'
                  }`}
                >
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-suspect-text">Streamer</h3>
                    <p className="text-xs text-suspect-gray-400">View stats, track goals</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    role === 'admin'
                      ? 'border-suspect-primary bg-suspect-primary/10'
                      : 'border-suspect-gray-600 hover:border-suspect-gray-500'
                  }`}
                >
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-suspect-text">Admin</h3>
                    <p className="text-xs text-suspect-gray-400">Manage platform</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Admin Invitation Key Field - moved to top */}
            {role === 'admin' && (
              <div>
                <label htmlFor="invitationKey" className="block text-sm font-medium text-suspect-text mb-2">
                  Admin Invitation Key
                </label>
                <input
                  id="invitationKey"
                  name="invitationKey"
                  type="text"
                  required
                  value={invitationKey}
                  onChange={(e) => setInvitationKey(e.target.value)}
                  className="input-field w-full"
                  placeholder="Enter your invitation key"
                />
                <p className="text-xs text-suspect-gray-400 mt-1">
                  Admin accounts require a valid invitation key
                </p>
              </div>
            )}

            {/* TikTok Username Field - moved above username for streamers */}
            {role === 'streamer' && (
              <div>
                <label htmlFor="tiktokUsername" className="block text-sm font-medium text-suspect-text mb-2">
                  TikTok Username
                </label>
                <input
                  id="tiktokUsername"
                  name="tiktokUsername"
                  type="text"
                  autoComplete="off"
                  required
                  value={tiktokUsername}
                  onChange={(e) => setTiktokUsername(e.target.value)}
                  className="input-field w-full"
                  placeholder="Enter your TikTok username"
                />
                <p className="text-xs text-suspect-gray-400 mt-1">
                  This will be used to track your TikTok streams
                </p>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-suspect-text mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field w-full"
                placeholder="Choose a username"
              />
            </div>

            <div>
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
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-suspect-text mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full"
                placeholder="Create a password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-suspect-text mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field w-full"
                placeholder="Confirm your password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-suspect-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="text-suspect-primary hover:text-suspect-primary/80">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
} 