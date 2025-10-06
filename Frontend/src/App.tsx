import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import Homepage from './components/Homepage';
import EventDiscovery from './components/EventDiscovery';
import FreeUserProfile from './components/FreeUserProfile';
import UserProfile from './components/UserProfile';
import CreateEvent from './components/CreateEvent';
import AdminDashboard from './components/AdminDashboard';
import PremiumSubscription from './components/PremiumSubscription';
import SettingsScreen from './components/SettingsScreen';
import UpdateNotification from './components/UpdateNotification';
import { AuthCallback } from './components/AuthCallback';
import { useLiveUpdates } from './hooks/useLiveUpdates';
import { currencyService } from './services/currencyService';
import CurrencySelector from './components/CurrencySelector';
import { API_URL } from './config';
import './index.css';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  is_premium: boolean;
  is_admin?: boolean;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [currentView, setCurrentView] = useState<'events' | 'profile' | 'premium' | 'settings' | 'create' | 'admin'>('events');
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [currency, setCurrency] = useState(currencyService.getCurrentCurrency());
  
  // Enable live updates
  useLiveUpdates();

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setLocationPermission('granted');
        },
        (error) => {
          console.log('Location access denied');
          setLocationPermission('denied');
          // Don't set a dummy location - let the app handle no location gracefully
        }
      );
    } else {
      console.log('Geolocation not supported');
      setLocationPermission('denied');
    }
  };

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
  };

  const handleUpgrade = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/users/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        setCurrentView('events');
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentView('events');
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }

    if (userLocation) {
      currencyService.detectCurrencyFromLocation(userLocation.latitude, userLocation.longitude)
        .then(() => setCurrency(currencyService.getCurrentCurrency()));
    }
    requestLocation();
  }, []);

  const isAuthCallback = window.location.pathname === '/auth/callback';

  if (isAuthCallback) {
    return (
      <>
        <AuthCallback onAuthSuccess={handleAuthSuccess} />
        <Toaster position="top-right" />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Homepage onAuthSuccess={handleAuthSuccess} />
        <Toaster position="top-right" />
        <UpdateNotification />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8">
                  {/* Logo placeholder - replace with your logo */}
                </div>
                <h1 className="text-2xl font-bold text-white">
                  Euforia
                </h1>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentView('events')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    currentView === 'events'
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Discover Events
                </button>
                <button
                  onClick={() => setCurrentView('profile')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    currentView === 'profile'
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setCurrentView('create')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    currentView === 'create'
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Create Event
                </button>
                <button
                  onClick={() => setCurrentView('settings')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    currentView === 'settings'
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Settings
                </button>
                {user.is_admin && (
                  <button
                    onClick={() => setCurrentView('admin')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      currentView === 'admin'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Admin
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <CurrencySelector onCurrencyChange={setCurrency} />
              <span className="text-white/70">Welcome, {user.firstName}!</span>
              <span className="px-3 py-1 text-black text-xs font-medium rounded-full flex items-center space-x-1 bg-gradient-to-r from-[#FB8B24] to-[#DDAA52] shadow-lg">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>All Features</span>
              </span>
            </div>
          </div>
        </div>
      </nav>

      {locationPermission === 'denied' && (
        <div className="bg-pink-100 border-b border-pink-300 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-black font-medium">Location Access Needed</p>
                <p className="text-black/70 text-sm">Enable location to discover events near you</p>
              </div>
            </div>
            <button
              onClick={requestLocation}
              className="bg-gradient-to-r from-pink-400 to-rose-500 text-white px-4 py-2 rounded-lg hover:from-pink-500 hover:to-rose-600 transition-all shadow-lg flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span>Enable Location</span>
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'events' && (
          <EventDiscovery 
            userLocation={userLocation} 
            currency={currency}
          />
        )}
        {currentView === 'profile' && (
          <UserProfile user={user} onLogout={handleLogout} />
        )}
        {currentView === 'create' && (
          <CreateEvent />
        )}
        {currentView === 'settings' && (
          <SettingsScreen user={user} onUpgrade={handleUpgrade} />
        )}
        {currentView === 'admin' && user.is_admin && (
          <AdminDashboard />
        )}
      </main>

      <Toaster position="top-right" />
    </div>
  );
}

export default App;