import React, { useState } from 'react';
import { toast } from 'sonner';
import { API_URL } from '../config';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log('Attempting admin login with:', { email, password });

    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        localStorage.setItem('adminToken', data.token);
        toast.success('Admin login successful');
        onLoginSuccess();
      } else {
        toast.error(data.message || 'Invalid admin credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8 max-w-md w-full mx-4">
        <h2 className="text-3xl font-bold text-white text-center mb-8">Admin Login</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="email"
              placeholder="Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
              required
            />
          </div>
          
          <div>
            <input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-400 to-rose-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-pink-500 hover:to-rose-600 transition-all disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login as Admin'}
          </button>
        </form>
        
        <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-400/30 rounded-lg">
          <p className="text-yellow-300 text-sm text-center">
            Demo Credentials:<br />
            Email: admin@eventapp.com<br />
            Password: admin123
          </p>
        </div>
      </div>
    </div>
  );
}