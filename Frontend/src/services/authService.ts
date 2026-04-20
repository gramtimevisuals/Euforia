import { API_URL } from '../config';

export class AuthService {
  static signInWithOAuth(provider: 'google' | 'facebook' | 'apple') {
    if (provider === 'apple') {
      // Apple OAuth not configured — show a message
      alert('Apple sign-in is not available yet.');
      return;
    }
    // Redirect to backend OAuth route — backend handles the full flow
    window.location.href = `${API_URL}/api/auth/${provider}`;
  }

  static async signOut() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    return { error: null };
  }

  static async getCurrentUser() {
    const token = sessionStorage.getItem('token');
    const user = sessionStorage.getItem('user');
    if (token && user) return JSON.parse(user);
    return null;
  }
}
