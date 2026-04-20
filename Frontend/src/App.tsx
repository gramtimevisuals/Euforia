import { useState, useEffect } from 'react';
import { Box, Flex, Button, Text, Badge, useColorModeValue, HStack, VStack, Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';
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
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/users/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        sessionStorage.setItem('user', JSON.stringify(userData));
        setCurrentView('events');
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
    setCurrentView('events');
  };

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (token && savedUser) {
      // Validate token with backend before trusting it
      fetch(`${API_URL}/api/users/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => {
        if (res.ok) {
          setUser(JSON.parse(savedUser));
        } else {
          // Token invalid or expired — clear everything and show login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
        }
      }).catch(() => {
        // Network error — still trust local token so app works offline
        setUser(JSON.parse(savedUser));
      });
    }

    if (userLocation) {
      currencyService.detectCurrencyFromLocation(userLocation.latitude, userLocation.longitude)
        .then(() => setCurrency(currencyService.getCurrentCurrency()));
    }
    requestLocation();

    const handleNavigateToCreate = () => setCurrentView('create');
    const handleNavigateToEvents = () => setCurrentView('events');

    window.addEventListener('navigateToCreate', handleNavigateToCreate);
    window.addEventListener('navigateToEvents', handleNavigateToEvents);

    return () => {
      window.removeEventListener('navigateToCreate', handleNavigateToCreate);
      window.removeEventListener('navigateToEvents', handleNavigateToEvents);
    };
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
    <Box minH="100vh" bg="#000000">
      <Box bg="whiteAlpha.100" backdropFilter="blur(10px)" borderBottom="1px" borderColor="whiteAlpha.200">
        <Box maxW="7xl" mx="auto" px={[4, 6, 8]}>
          <Flex justify="space-between" align="center" h={16} direction={['column', 'column', 'row']} py={[4, 4, 0]}>
            <HStack spacing={[4, 6, 8]} mb={[2, 2, 0]}>
              <HStack spacing={3}>
                <Box w={8} h={8}>
                  {/* Logo placeholder */}
                </Box>
                <Text fontSize={['lg', 'xl', '2xl']} fontWeight="bold" color="white">
                  Euforia
                </Text>
              </HStack>
              <HStack spacing={[1, 2, 4]} flexWrap="wrap">
                <Button
                  onClick={() => setCurrentView('events')}
                  variant={currentView === 'events' ? 'solid' : 'ghost'}
                  colorScheme={currentView === 'events' ? 'whiteAlpha' : undefined}
                  color={currentView === 'events' ? 'white' : 'whiteAlpha.700'}
                  _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                  size={['xs', 'sm', 'sm']}
                >
                  Events
                </Button>
                <Button
                  onClick={() => setCurrentView('profile')}
                  variant={currentView === 'profile' ? 'solid' : 'ghost'}
                  colorScheme={currentView === 'profile' ? 'whiteAlpha' : undefined}
                  color={currentView === 'profile' ? 'white' : 'whiteAlpha.700'}
                  _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                  size={['xs', 'sm', 'sm']}
                >
                  Profile
                </Button>
                <Button
                  onClick={() => setCurrentView('create')}
                  variant={currentView === 'create' ? 'solid' : 'ghost'}
                  colorScheme={currentView === 'create' ? 'whiteAlpha' : undefined}
                  color={currentView === 'create' ? 'white' : 'whiteAlpha.700'}
                  _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                  size={['xs', 'sm', 'sm']}
                >
                  Create
                </Button>
                <Button
                  onClick={() => setCurrentView('settings')}
                  variant={currentView === 'settings' ? 'solid' : 'ghost'}
                  colorScheme={currentView === 'settings' ? 'whiteAlpha' : undefined}
                  color={currentView === 'settings' ? 'white' : 'whiteAlpha.700'}
                  _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                  size={['xs', 'sm', 'sm']}
                >
                  Settings
                </Button>
                {user.is_admin && (
                  <Button
                    onClick={() => setCurrentView('admin')}
                    variant={currentView === 'admin' ? 'solid' : 'ghost'}
                    bgGradient={currentView === 'admin' ? 'linear(to-r, purple.500, pink.500)' : undefined}
                    color={currentView === 'admin' ? 'white' : 'whiteAlpha.700'}
                    _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                    size={['xs', 'sm', 'sm']}
                  >
                    Admin
                  </Button>
                )}
              </HStack>
            </HStack>
            
            <HStack spacing={[2, 3, 4]} mt={[2, 2, 0]}>
              <Text color="whiteAlpha.700" fontSize={['xs', 'sm', 'md']} display={['none', 'block', 'block']}>Welcome, {user.firstName}!</Text>
              <Badge
                px={[2, 3, 3]}
                py={1}
                color="black"
                fontSize={['2xs', 'xs', 'xs']}
                fontWeight="medium"
                borderRadius="full"
                bgGradient="linear(to-r, brand.500, accent.500)"
                boxShadow="lg"
              >
                <HStack spacing={1}>
                  <Box w={[2, 3, 3]} h={[2, 3, 3]} bg="currentColor" borderRadius="full" />
                  <Text display={['none', 'block', 'block']}>All Features</Text>
                  <Text display={['block', 'none', 'none']}>Pro</Text>
                </HStack>
              </Badge>
            </HStack>
          </Flex>
        </Box>
      </Box>

      {locationPermission === 'denied' && (
        <Alert status="warning" bg="pink.100" borderBottom="1px" borderColor="pink.300">
          <Box maxW="7xl" mx="auto" w="full">
            <Flex justify="space-between" align="center">
              <HStack spacing={3}>
                <AlertIcon color="pink.500" />
                <VStack align="start" spacing={0}>
                  <AlertTitle color="black" fontWeight="medium">Location Access Needed</AlertTitle>
                  <AlertDescription color="blackAlpha.700" fontSize="sm">
                    Enable location to discover events near you
                  </AlertDescription>
                </VStack>
              </HStack>
              <Button
                onClick={requestLocation}
                bgGradient="linear(to-r, pink.400, red.500)"
                color="white"
                _hover={{ bgGradient: 'linear(to-r, pink.500, red.600)' }}
                boxShadow="lg"
                size="sm"
                leftIcon={<Box w={3} h={3} bg="currentColor" borderRadius="full" />}
              >
                Enable Location
              </Button>
            </Flex>
          </Box>
        </Alert>
      )}

      <Box as="main" maxW="7xl" mx="auto" px={[4, 6, 8]} py={8}>
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
          <SettingsScreen user={user} onUpgrade={handleUpgrade} onLogout={handleLogout} />
        )}
        {currentView === 'admin' && user.is_admin && (
          <AdminDashboard />
        )}
      </Box>

      <Toaster position="top-right" />
    </Box>
  );
}

export default App;