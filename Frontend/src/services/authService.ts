import { createClient } from '@supabase/supabase-js';
import { API_URL } from '../config';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://jlnqzfvzlrscwutavbmw.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsbnF6ZnZ6bHJzY3d1dGF2Ym13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MjAwNDksImV4cCI6MjA3MjQ5NjA0OX0.veshptBi1seXfj7RUYHwNT_6Pv1hKkwOi3EAEPxHYic'
);

export class AuthService {
  static async signInWithOAuth(provider: 'google' | 'facebook' | 'apple') {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error(`${provider} OAuth error:`, error);
      return { data: null, error };
    }
  }

  static async handleOAuthCallback() {
    try {
      const { data: { session, user }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      if (!session || !user) return { user: null, error: 'No session found' };

      // Send OAuth data to our backend
      const response = await fetch(`${API_URL}/api/auth/oauth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user, session })
      });

      const result = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        return { user: result.user, error: null };
      } else {
        throw new Error(result.message || 'OAuth callback failed');
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      return { user: null, error };
    }
  }

  static async signOut() {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  }

  static async getCurrentUser() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      return JSON.parse(user);
    }
    
    return null;
  }
}