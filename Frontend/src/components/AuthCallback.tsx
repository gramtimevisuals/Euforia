import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { API_URL } from '../config'
import { toast } from 'sonner'

interface AuthCallbackProps {
  onAuthSuccess: (user: any) => void
}

export function AuthCallback({ onAuthSuccess }: AuthCallbackProps) {
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          toast.error('Authentication failed')
          // Redirect back to home page
          window.location.href = '/'
          return
        }

        if (data.session) {
          console.log('OAuth session received:', data.session.user.email)
          
          // Send session to backend to create/update user
          const response = await fetch(`${API_URL}/api/auth/oauth/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user: data.session.user,
              session: data.session
            })
          })

          if (response.ok) {
            const result = await response.json()
            localStorage.setItem('token', result.token)
            localStorage.setItem('user', JSON.stringify(result.user))
            onAuthSuccess(result.user)
            toast.success('Welcome!')
            // Redirect to main app
            window.location.href = '/'
          } else {
            const errorData = await response.json()
            console.error('Backend OAuth error:', errorData)
            toast.error('Failed to complete authentication')
            window.location.href = '/'
          }
        } else {
          console.log('No session found, redirecting to home')
          window.location.href = '/'
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        toast.error('Authentication failed')
        window.location.href = '/'
      }
    }

    handleAuthCallback()
  }, [onAuthSuccess])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
        <p>Completing authentication...</p>
      </div>
    </div>
  )
}