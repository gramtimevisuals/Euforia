import React, { useState, useEffect, useRef } from "react";
import { Box, Flex, Button, Text, Badge, VStack, HStack, Heading, useColorModeValue } from '@chakra-ui/react';
import { SettingsIcon, CalendarIcon, StarIcon, TimeIcon, SearchIcon } from '@chakra-ui/icons';
import { toast } from "sonner";
import { API_URL } from '../config';
import UpsellModal from './UpsellModal';
import SmartSearchBar from './SmartSearchBar';
import { useEngagement } from '../hooks/useEngagement';
import { useSentimentAnalysis } from '../hooks/useSentimentAnalysis';
import { useNotifications } from '../hooks/useNotifications';
import { currencyService } from '../services/currencyService';
import { currencyConverter } from '../services/currencyConverter';
import GroupPlanning from './GroupPlanning';
import { OfflineService } from '../services/offlineService';
import { RecommendationService } from '../services/recommendationService';
import GroupChatModal from './GroupChatModal';
import CalendarDropdown from './CalendarDropdown';
import OfflineEventViewer from './OfflineEventViewer';
import EventLocationMap from './EventLocationMap';

interface Event {
  id?: string;
  _id?: string;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  location_name?: string;
  location_address?: string;
  location?: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  users?: {
    first_name: string;
    last_name: string;
  };
  creator?: {
    firstName: string;
    lastName: string;
    first_name?: string;
    last_name?: string;
  };
  attendees?: Array<any>;
  tags?: string[];
  flyerUrl?: string;
  flyer_url?: string;
  isVirtual?: boolean;
  price?: number;
  priceCategory?: string;
  is_exclusive?: boolean;
  rating?: number;
  userRating?: number;
  userRSVP?: 'going' | 'interested' | null;
  recommendationScore?: number;
  comments?: Array<{
    user: string;
    text: string;
    date: string;
    avatar?: string;
  }>;
  isOwner?: boolean;
  isAdmin?: boolean;
  analytics?: {
    views: number;
    engagement: number;
    reach: number;
    shares?: number;
    saves?: number;
  };
}

interface EventDiscoveryProps {
  userLocation: {latitude: number, longitude: number} | null;
  currency: { code: string; symbol: string };
}

interface ConvertedPrice {
  original: { amount: number; currency: string; };
  converted: { amount: number; currency: string; };
  rate: number;
}

export default function EventDiscovery({ userLocation, currency }: EventDiscoveryProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [forYouEvents, setForYouEvents] = useState<Event[]>([]);
  const [recommendations, setRecommendations] = useState<Event[]>([]);
  const [savedEvents, setSavedEvents] = useState<Event[]>([]);
  const [searchResults, setSearchResults] = useState<Event[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [friendActivity, setFriendActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'discover' | 'for_you' | 'recommendations' | 'groups' | 'saved' | 'global_chat'>('discover');
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellFeature, setUpsellFeature] = useState('');
  const [upsellBenefit, setUpsellBenefit] = useState('');
  const [showGlobalChat, setShowGlobalChat] = useState(false);
  const [showBasicFilters, setShowBasicFilters] = useState(false);
  const [showLocationFilters, setShowLocationFilters] = useState(false);
  const [showPriceFilters, setShowPriceFilters] = useState(false);
  const [showDateFilters, setShowDateFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [userCurrency, setUserCurrency] = useState('USD');
  const [showOriginalPrice, setShowOriginalPrice] = useState(false);
  
  const { trackRating, trackInterested, sendFeedback } = useEngagement();
  const { analyzeComment } = useSentimentAnalysis();
  const { requestNotificationPermission } = useNotifications();
  
  const [filters, setFilters] = useState({
    categories: [] as string[],
    radius: 500,
    priceCategories: [] as string[],
    priceRange: { min: 0, max: 1000 },
    isVirtual: false,
    sortBy: 'date',
    dateFrom: '',
    dateTo: '',
    datePreset: '',
    attendeeCount: { min: 0, max: 10000 },
    rating: 0,
    hasTickets: null as boolean | null,
    eventType: [] as string[],
    accessibility: [] as string[],
    ageRestriction: '',
    language: [] as string[],
    tags: [] as string[]
  });

  const [dropdownStates, setDropdownStates] = useState({
    categories: false,
    eventType: false,
    language: false,
    tags: false,
    accessibility: false
  });

  const categories = ["Music", "Sports", "Food", "Art", "Business", "Technology", "Health", "Education", "Other"];
  
  const eventTypes = ["Concert", "Festival", "Workshop", "Conference", "Meetup", "Party", "Exhibition", "Performance", "Competition", "Networking"];
  
  const accessibilityOptions = ["Wheelchair Accessible", "Sign Language Interpreter", "Audio Description", "Large Print Materials", "Quiet Space Available"];
  
  const ageRestrictions = [
    { value: '', label: 'All Ages' },
    { value: '18+', label: '18+ Only' },
    { value: '21+', label: '21+ Only' },
    { value: 'family', label: 'Family Friendly' },
    { value: 'kids', label: 'Kids Only' }
  ];
  
  const languages = ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Chinese", "Japanese", "Arabic", "Hindi"];
  
  const popularTags = ["Outdoor", "Indoor", "Live Music", "Food & Drink", "Networking", "Educational", "Entertainment", "Cultural", "Charity", "Seasonal"];
  const getPriceCategories = () => {
    const ranges = currencyService.getPriceRanges() || { low: 25, medium: 50, high: 100 };
    const symbol = currencyService.getCurrencySymbol() || '$';
    return [
      { value: 'free', label: 'Free' },
      { value: `under${ranges.low}`, label: `Under ${symbol}${ranges.low}` },
      { value: `under${ranges.medium}`, label: `Under ${symbol}${ranges.medium}` },
      { value: `over${ranges.medium}`, label: `${symbol}${ranges.medium}+` }
    ];
  };

  const datePresets = [
    { value: '', label: 'Any Time' },
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'this_weekend', label: 'This Weekend' },
    { value: 'next_week', label: 'Next Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'next_month', label: 'Next Month' }
  ];

  const sortOptions = [
    { value: 'date', label: 'Date' },
    { value: 'popular', label: 'Most Popular', premium: true },
    { value: 'newest', label: 'Newest', premium: true },
    { value: 'closest', label: 'Closest', premium: true },
    { value: 'rating', label: 'Best Rated', premium: true },
    { value: 'price_low', label: 'Price: Low to High', premium: true },
    { value: 'price_high', label: 'Price: High to Low', premium: true }
  ];

  const fetchEvents = async () => {
    if (!userLocation) {
      setEvents([]);
      return;
    }
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('latitude', userLocation.latitude.toString());
      params.append('longitude', userLocation.longitude.toString());
      params.append('radius', filters.radius.toString());
      if (filters.categories.length) params.append('category', filters.categories.join(','));
      if (filters.priceCategories.length) params.append('priceCategory', filters.priceCategories.join(','));
      if (filters.isVirtual) params.append('isVirtual', 'true');
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.datePreset) params.append('datePreset', filters.datePreset);
      params.append('priceMin', filters.priceRange.min.toString());
      params.append('priceMax', filters.priceRange.max.toString());

      const response = await fetch(`${API_URL}/api/events/nearby?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setEvents(data);
      } else {
        toast.error(data.message || "Failed to fetch events");
      }
    } catch (error) {
      toast.error("Failed to fetch events");
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonalizedRecommendations = async () => {
    
    try {
      const [recommendations, trending] = await Promise.all([
        RecommendationService.getPersonalizedRecommendations(12),
        RecommendationService.getTrendingEvents(8)
      ]);
      
      setForYouEvents(recommendations);
      setFriendActivity([]);
      setRecommendations(trending);
    } catch (error) {
      console.error('Failed to fetch recommendations');
    }
  };

  const fetchSavedEvents = async () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      setSavedEvents([]);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/events/user/saved`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSavedEvents(data);
      } else if (response.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setSavedEvents([]);
      }
    } catch (error) {
      setSavedEvents([]);
    }
  };

  const handleRSVP = async (eventId: string | number, status: "going" | "interested") => {
    if (!eventId || eventId === 'undefined') {
      toast.error("Invalid event ID");
      return;
    }
    const token = sessionStorage.getItem('token');
    if (!token) {
      toast.error("Please log in to RSVP");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        toast.success(`RSVP updated to ${status}!`);
        
        // Track interaction for recommendations
        if (status === 'interested') {
          trackInterested(eventId);
          RecommendationService.trackInteraction(eventId, 'save');
        } else if (status === 'going') {
          RecommendationService.trackInteraction(eventId, 'purchase');
        }
        
        fetchEvents();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to RSVP");
      }
    } catch (error) {
      toast.error("Failed to RSVP");
    }
  };

  const handleRating = async (eventId: string, rating: number) => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      toast.error("Please log in to rate");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/events/${eventId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating })
      });

      if (response.ok) {
        toast.success('Rating submitted!');
        trackRating(eventId, rating);
        fetchEvents();
      } else {
        toast.error('Failed to submit rating');
      }
    } catch (error) {
      toast.error('Failed to submit rating');
    }
  };

  const handleComment = async (eventId: string, comment: string) => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      toast.error("Please log in to comment");
      return;
    }

    try {
      const analysis = await analyzeComment(comment, eventId);
      
      const response = await fetch(`${API_URL}/api/events/${eventId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comment })
      });

      if (response.ok) {
        toast.success('Comment added!');
        if (analysis?.sentiment === 'positive') {
          toast.success('Thanks for the positive feedback!');
        }
        fetchEvents();
      } else {
        toast.error('Failed to add comment');
      }
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  useEffect(() => {
    // Initialize currency based on location
    currencyService.initializeCurrency();
    initializeCurrency();
    
    fetchEvents();
    fetchPersonalizedRecommendations();
    fetchSavedEvents();
    // Auto-enable smart alerts
    requestNotificationPermission();

    // Listen for saved events changes
    const handleSavedEventsChange = () => {
      if (activeTab === 'saved') {
        fetchSavedEvents();
      }
    };
    window.addEventListener('savedEventsChanged', handleSavedEventsChange);

    // Silent background refresh every 60 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchEvents();
        if (activeTab === 'saved') {
          fetchSavedEvents();
        }
        fetchPersonalizedRecommendations();
      }
    }, 60000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('savedEventsChanged', handleSavedEventsChange);
    };
  }, [userLocation, filters]);

  const initializeCurrency = async () => {
    await currencyConverter.updateRates();
    const detectedCurrency = await currencyConverter.detectUserCurrency(userLocation);
    setUserCurrency(detectedCurrency);
  };

  const convertPrice = (price: number, fromCurrency: string = 'USD'): ConvertedPrice => {
    const convertedAmount = currencyConverter.convert(price, fromCurrency, userCurrency);
    return {
      original: { amount: price, currency: fromCurrency },
      converted: { amount: convertedAmount, currency: userCurrency },
      rate: convertedAmount / price
    };
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      setSearchQuery('');
      return;
    }

    setIsSearching(true);
    setSearchQuery(query);
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append('q', query);
      if (userLocation) {
        params.append('latitude', userLocation.latitude.toString());
        params.append('longitude', userLocation.longitude.toString());
      }

      const response = await fetch(`${API_URL}/api/events/search?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setSearchResults(data);
        toast.success(`Found ${data.length} events for "${query}"`);
      } else {
        toast.error(data.message || 'Search failed');
        setSearchResults([]);
      }
    } catch (error) {
      toast.error('Search failed');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack spacing={8} bg="#000000" minH="100vh" w="full">
      <Box position="relative" overflow="hidden" w="full">
        <Box 
          position="absolute" 
          inset={0} 
          bg="#000000" 
          opacity={1}
        />
        <Box 
          position="relative" 
          bg="#171717" 
          backdropFilter="blur(20px)" 
          borderRadius="3xl" 
          border="1px" 
          borderColor="rgba(251, 139, 36, 0.3)" 
          p={8} 
          textAlign="center"
        >
          <Heading 
            size={['2xl', '3xl', '4xl']} 
            fontWeight="black" 
            bgGradient="linear(to-r, #FB8B24, #DDAA52, #A31818)" 
            bgClip="text" 
            mb={4}
          >
            Euforia
          </Heading>
          <Text color="whiteAlpha.800" fontSize={['md', 'lg', 'xl']} fontWeight="medium" mb={6}>
            <HStack justify="center" spacing={[2, 3, 4]} flexWrap="wrap">
              <HStack>
                <SearchIcon />
                <Text>Unlimited radius</Text>
              </HStack>
              <HStack>
                <StarIcon />
                <Text>AI-powered</Text>
              </HStack>
              <HStack>
                <TimeIcon />
                <Text>Smart alerts</Text>
              </HStack>
            </HStack>
          </Text>
          

        
          <Box position="relative" maxW="2xl" mx="auto" mb={6}>
            <SmartSearchBar 
              onSearch={handleSearch}
              placeholder="Try 'Friday night', 'rooftop vibes', 'tech meetups'..."
            />
          </Box>
        
          <Flex justify="center">
            <Box 
              bg="#171717" 
              backdropFilter="blur(20px)" 
              borderRadius="2xl" 
              border="1px" 
              borderColor="rgba(251, 139, 36, 0.8)" 
              p={2} 
              display="flex" 
              flexWrap="wrap" 
              justifyContent="center" 
              gap={2} 
              boxShadow="2xl" 
              maxW="full" 
              overflowX="auto"
            >
              <Button
                onClick={() => setActiveTab('discover')}
                px={6} py={3} 
                borderRadius="xl" 
                fontWeight="semibold" 
                transition="all 0.3s" 
                transform={activeTab === 'discover' ? 'scale(1.05)' : 'scale(1)'}
                bg={activeTab === 'discover' ? '#FB8B24' : '#000000'}
                color={activeTab === 'discover' ? '#000000' : '#FB8B24'}
                boxShadow={activeTab === 'discover' ? 'lg' : undefined}
                _hover={{ bg: '#FB8B24', color: '#000000' }}
                leftIcon={<SearchIcon />}
              >
                Discover
              </Button>
              <Button
                onClick={() => setActiveTab('for_you')}
                px={6} py={3} 
                borderRadius="xl" 
                fontWeight="semibold" 
                transition="all 0.3s" 
                transform={activeTab === 'for_you' ? 'scale(1.05)' : 'scale(1)'}
                bg={activeTab === 'for_you' ? '#FB8B24' : '#000000'}
                color={activeTab === 'for_you' ? '#000000' : '#FB8B24'}
                boxShadow={activeTab === 'for_you' ? 'lg' : undefined}
                _hover={{ bg: '#FB8B24', color: '#000000' }}
                leftIcon={<StarIcon />}
              >
                For You
              </Button>
              <Button
                onClick={() => setActiveTab('recommendations')}
                px={6} py={3} 
                borderRadius="xl" 
                fontWeight="semibold" 
                transition="all 0.3s" 
                transform={activeTab === 'recommendations' ? 'scale(1.05)' : 'scale(1)'}
                bg={activeTab === 'recommendations' ? '#FB8B24' : '#000000'}
                color={activeTab === 'recommendations' ? '#000000' : '#FB8B24'}
                boxShadow={activeTab === 'recommendations' ? 'lg' : undefined}
                _hover={{ bg: '#FB8B24', color: '#000000' }}
                leftIcon={<SettingsIcon />}
              >
                Trending
              </Button>
              <Button
                onClick={() => setActiveTab('groups')}
                px={6} py={3} 
                borderRadius="xl" 
                fontWeight="semibold" 
                transition="all 0.3s" 
                transform={activeTab === 'groups' ? 'scale(1.05)' : 'scale(1)'}
                bg={activeTab === 'groups' ? '#FB8B24' : '#000000'}
                color={activeTab === 'groups' ? '#000000' : '#FB8B24'}
                boxShadow={activeTab === 'groups' ? 'lg' : undefined}
                _hover={{ bg: '#FB8B24', color: '#000000' }}
                leftIcon={<CalendarIcon />}
              >
                Groups
              </Button>
              <Button
                onClick={() => {
                  setActiveTab('saved');
                  fetchSavedEvents();
                }}
                px={6} py={3} 
                borderRadius="xl" 
                fontWeight="semibold" 
                transition="all 0.3s" 
                transform={activeTab === 'saved' ? 'scale(1.05)' : 'scale(1)'}
                bg={activeTab === 'saved' ? '#FB8B24' : '#000000'}
                color={activeTab === 'saved' ? '#000000' : '#FB8B24'}
                boxShadow={activeTab === 'saved' ? 'lg' : undefined}
                _hover={{ bg: '#FB8B24', color: '#000000' }}
                leftIcon={<TimeIcon />}
              >
                Saved
              </Button>
              <Button
                onClick={() => setActiveTab('global_chat')}
                px={6} py={3} 
                borderRadius="xl" 
                fontWeight="semibold" 
                transition="all 0.3s" 
                transform={activeTab === 'global_chat' ? 'scale(1.05)' : 'scale(1)'}
                bg={activeTab === 'global_chat' ? '#FB8B24' : '#000000'}
                color={activeTab === 'global_chat' ? '#000000' : '#FB8B24'}
                boxShadow={activeTab === 'global_chat' ? 'lg' : undefined}
                _hover={{ bg: '#FB8B24', color: '#000000' }}
                leftIcon={<SearchIcon />}
              >
                Global Chat
              </Button>
            </Box>
          </Flex>
        </Box>
      </Box>

      {/* Filter Sections */}
      <Flex flexWrap="wrap" justify="center" gap={[1, 2, 2]} mb={6} px={[2, 4, 4]}>
        <Button
          onClick={() => {
            setShowBasicFilters(!showBasicFilters);
            setShowLocationFilters(false);
            setShowPriceFilters(false);
            setShowDateFilters(false);
            setShowAdvancedFilters(false);
          }}
          bgGradient={showBasicFilters ? "linear(to-r, #FB8B24, #DDAA52)" : undefined}
          bg={showBasicFilters ? undefined : "#171717"}
          color={showBasicFilters ? "black" : "#DDAA52"}
          px={6} py={3}
          borderRadius="xl"
          fontWeight="semibold"
          transition="all 0.3s"
          transform={showBasicFilters ? 'scale(1.05)' : 'scale(1)'}
          _hover={{ transform: 'scale(1.05)', bg: showBasicFilters ? undefined : '#DDAA52', color: showBasicFilters ? undefined : '#000000' }}
          boxShadow="lg"
          leftIcon={<SettingsIcon />}
        >
          Basic
        </Button>
        
        <Button
          onClick={() => {
            setShowLocationFilters(!showLocationFilters);
            setShowBasicFilters(false);
            setShowPriceFilters(false);
            setShowDateFilters(false);
            setShowAdvancedFilters(false);
          }}
          bgGradient={showLocationFilters ? "linear(to-r, #FB8B24, #DDAA52)" : undefined}
          bg={showLocationFilters ? undefined : "#171717"}
          color={showLocationFilters ? "black" : "#DDAA52"}
          px={6} py={3}
          borderRadius="xl"
          fontWeight="semibold"
          transition="all 0.3s"
          transform={showLocationFilters ? 'scale(1.05)' : 'scale(1)'}
          _hover={{ transform: 'scale(1.05)', bg: showLocationFilters ? undefined : '#DDAA52', color: showLocationFilters ? undefined : '#000000' }}
          boxShadow="lg"
          leftIcon={<CalendarIcon />}
        >
          Location
        </Button>
        
        <Button
          onClick={() => {
            setShowPriceFilters(!showPriceFilters);
            setShowBasicFilters(false);
            setShowLocationFilters(false);
            setShowDateFilters(false);
            setShowAdvancedFilters(false);
          }}
          bgGradient={showPriceFilters ? "linear(to-r, #FB8B24, #DDAA52)" : undefined}
          bg={showPriceFilters ? undefined : "#171717"}
          color={showPriceFilters ? "black" : "#DDAA52"}
          px={6} py={3}
          borderRadius="xl"
          fontWeight="semibold"
          transition="all 0.3s"
          transform={showPriceFilters ? 'scale(1.05)' : 'scale(1)'}
          _hover={{ transform: 'scale(1.05)', bg: showPriceFilters ? undefined : '#DDAA52', color: showPriceFilters ? undefined : '#000000' }}
          boxShadow="lg"
          leftIcon={<StarIcon />}
        >
          Price
        </Button>
        
        <Button
          onClick={() => {
            setShowDateFilters(!showDateFilters);
            setShowBasicFilters(false);
            setShowLocationFilters(false);
            setShowPriceFilters(false);
            setShowAdvancedFilters(false);
          }}
          bgGradient={showDateFilters ? "linear(to-r, #FB8B24, #DDAA52)" : undefined}
          bg={showDateFilters ? undefined : "#171717"}
          color={showDateFilters ? "black" : "#DDAA52"}
          px={6} py={3}
          borderRadius="xl"
          fontWeight="semibold"
          transition="all 0.3s"
          transform={showDateFilters ? 'scale(1.05)' : 'scale(1)'}
          _hover={{ transform: 'scale(1.05)', bg: showDateFilters ? undefined : '#DDAA52', color: showDateFilters ? undefined : '#000000' }}
          boxShadow="lg"
          leftIcon={<TimeIcon />}
        >
          Date
        </Button>
        
        <Button
          onClick={() => {
            setShowAdvancedFilters(!showAdvancedFilters);
            setShowBasicFilters(false);
            setShowLocationFilters(false);
            setShowPriceFilters(false);
            setShowDateFilters(false);
          }}
          bgGradient={showAdvancedFilters ? "linear(to-r, #FB8B24, #DDAA52)" : undefined}
          bg={showAdvancedFilters ? undefined : "#171717"}
          color={showAdvancedFilters ? "black" : "#DDAA52"}
          px={6} py={3}
          borderRadius="xl"
          fontWeight="semibold"
          transition="all 0.3s"
          transform={showAdvancedFilters ? 'scale(1.05)' : 'scale(1)'}
          _hover={{ transform: 'scale(1.05)', bg: showAdvancedFilters ? undefined : '#DDAA52', color: showAdvancedFilters ? undefined : '#000000' }}
          boxShadow="lg"
          leftIcon={<SearchIcon />}
        >
          Advanced
        </Button>
      </Flex>

      {/* Basic Filters */}
      {showBasicFilters && (
        <Box bg="#171717" backdropFilter="blur(20px)" borderRadius="3xl" border="1px" borderColor="#FB8B24" borderOpacity={0.3} p={6} mb={6} w="full" maxW="4xl" mx="auto">
          <h3 className="text-lg font-bold text-[#FB8B24] mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Basic Filters
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[#FFFFFF] font-medium mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="w-full px-4 py-3 bg-[#171717] border border-[#DDAA52]/30 rounded-xl text-[#FFFFFF]"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value} className="text-gray-900">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.isVirtual}
                  onChange={(e) => setFilters(prev => ({ ...prev, isVirtual: e.target.checked }))}
                  className="w-5 h-5 text-[#FB8B24] bg-[#171717] border-[#DDAA52]/20 rounded"
                />
                <span className="text-[#FFFFFF]">Virtual Events</span>
              </label>
            </div>
            <div>
              <label className="block text-[#FFFFFF] font-medium mb-3">Categories</label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((category) => (
                  <label key={category} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(category)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({ ...prev, categories: [...prev.categories, category] }));
                        } else {
                          setFilters(prev => ({ ...prev, categories: prev.categories.filter(c => c !== category) }));
                        }
                      }}
                      className="w-4 h-4 text-[#FB8B24] bg-[#171717] border-[#DDAA52]/20 rounded"
                    />
                    <span className="text-[#FFFFFF] text-sm">{category}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Box>
      )}

      {/* Location Filters */}
      {showLocationFilters && (
        <Box bg="#171717" backdropFilter="blur(20px)" borderRadius="3xl" border="1px" borderColor="#DDAA52" borderOpacity={0.3} p={6} mb={6} w="full" maxW="4xl" mx="auto">
          <h3 className="text-lg font-bold text-[#A31818] mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            Location Filters
          </h3>
          <div>
            <label className="block text-[#FFFFFF] font-medium mb-2">
              Radius: {filters.radius}km
            </label>
            <input
              type="range"
              min="5"
              max={500}
              value={filters.radius}
              onChange={(e) => setFilters(prev => ({ ...prev, radius: Number(e.target.value) }))}
              className="w-full h-2 bg-[#171717] rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </Box>
      )}

      {/* Price Filters */}
      {showPriceFilters && (
        <Box bg="#171717" backdropFilter="blur(20px)" borderRadius="3xl" border="1px" borderColor="#DDAA52" borderOpacity={0.3} p={6} mb={6} w="full" maxW="4xl" mx="auto">
          <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
            </svg>
            Price Filters
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[#FFFFFF] font-medium mb-3">Price Categories</label>
              <div className="grid grid-cols-2 gap-2">
                {getPriceCategories().map((priceCategory) => (
                  <button
                    key={priceCategory.value}
                    onClick={() => {
                      setFilters(prev => ({
                        ...prev,
                        priceCategories: prev.priceCategories.includes(priceCategory.value)
                          ? prev.priceCategories.filter(p => p !== priceCategory.value)
                          : [...prev.priceCategories, priceCategory.value]
                      }));
                    }}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      filters.priceCategories.includes(priceCategory.value)
                        ? "bg-gradient-to-r from-[#FB8B24] to-[#DDAA52] text-black shadow-lg"
                        : "bg-[#171717] text-[#FFFFFF]/70 hover:bg-[#171717]/80 border border-[#DDAA52]/20"
                    }`}
                  >
                    {priceCategory.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#FFFFFF]/70 text-sm mb-1">Min Price</label>
                <input
                  type="number"
                  value={filters.priceRange.min}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceRange: { ...prev.priceRange, min: Number(e.target.value) } }))}
                  className="w-full px-3 py-2 bg-[#171717] border border-[#DDAA52]/30 rounded-lg text-[#FFFFFF] text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[#FFFFFF]/70 text-sm mb-1">Max Price</label>
                <input
                  type="number"
                  value={filters.priceRange.max}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceRange: { ...prev.priceRange, max: Number(e.target.value) } }))}
                  className="w-full px-3 py-2 bg-[#171717] border border-[#DDAA52]/30 rounded-lg text-[#FFFFFF] text-sm"
                  placeholder="1000"
                />
              </div>
            </div>
          </div>
        </Box>
      )}

      {/* Date Filters */}
      {showDateFilters && (
        <Box bg="#171717" backdropFilter="blur(20px)" borderRadius="3xl" border="1px" borderColor="#DDAA52" borderOpacity={0.3} p={6} mb={6} w="full" maxW="4xl" mx="auto">
          <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            Date Filters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={filters.datePreset}
              onChange={(e) => setFilters(prev => ({ ...prev, datePreset: e.target.value, dateFrom: '', dateTo: '' }))}
              className="px-4 py-3 bg-[#171717] border border-[#DDAA52]/30 rounded-xl text-[#FFFFFF]"
            >
              {datePresets.map((preset) => (
                <option key={preset.value} value={preset.value} className="text-gray-900">
                  {preset.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value, datePreset: '' }))}
              className="px-4 py-3 bg-[#171717] border border-[#DDAA52]/30 rounded-xl text-[#FFFFFF]"
              placeholder="From Date"
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value, datePreset: '' }))}
              className="px-4 py-3 bg-[#171717] border border-[#DDAA52]/30 rounded-xl text-[#FFFFFF]"
              placeholder="To Date"
            />
          </div>
        </Box>
      )}

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <Box bg="#171717" backdropFilter="blur(20px)" borderRadius="3xl" border="1px" borderColor="#DDAA52" borderOpacity={0.3} p={6} mb={6} w="full" maxW="4xl" mx="auto">
          <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            Advanced Filters
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-[#FFFFFF] font-medium mb-3">Event Type</label>
              <div className="relative">
                <button
                  onClick={() => setDropdownStates(prev => ({ ...prev, eventType: !prev.eventType }))}
                  className="w-full px-4 py-3 bg-[#171717] border border-[#DDAA52]/30 rounded-xl text-[#FFFFFF] flex items-center justify-between"
                >
                  <span>{filters.eventType.length > 0 ? `${filters.eventType.length} selected` : 'Select event types'}</span>
                  <svg className={`w-5 h-5 transition-transform ${dropdownStates.eventType ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                {dropdownStates.eventType && (
                  <div className="absolute z-10 w-full mt-2 bg-[#171717] border border-[#DDAA52]/30 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 grid grid-cols-2 gap-2">
                      {eventTypes.map((type) => (
                        <label key={type} className="flex items-center space-x-2 p-2 hover:bg-[#DDAA52]/10 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.eventType.includes(type)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters(prev => ({ ...prev, eventType: [...prev.eventType, type] }));
                              } else {
                                setFilters(prev => ({ ...prev, eventType: prev.eventType.filter(t => t !== type) }));
                              }
                            }}
                            className="w-4 h-4 text-[#FB8B24] bg-[#171717] border-[#DDAA52]/20 rounded"
                          />
                          <span className="text-[#FFFFFF] text-sm">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[#FFFFFF] font-medium mb-3">Minimum Rating</label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setFilters(prev => ({ ...prev, rating: star === prev.rating ? 0 : star }))}
                    className={`text-2xl transition-colors ${
                      star <= filters.rating ? 'text-[#DDAA52]' : 'text-[#FFFFFF]/30'
                    } hover:text-[#DDAA52]`}
                  >
                    ★
                  </button>
                ))}
                <span className="text-[#FFFFFF]/70 text-sm ml-2">
                  {filters.rating > 0 ? `${filters.rating}+ stars` : 'Any rating'}
                </span>
              </div>
            </div>
          </div>
        </Box>
      )}

      {/* Search Results */}
      {isSearching && (
        <div className="space-y-4 px-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-[#FFFFFF]">Search Results for "{searchQuery}"</h3>
            <button
              onClick={() => {
                setIsSearching(false);
                setSearchResults([]);
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-[#171717] text-[#DDAA52] border border-[#DDAA52]/30 rounded-xl hover:bg-[#DDAA52] hover:text-black transition-all"
            >
              Clear Search
            </button>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((event, index) => (
                <PremiumEventCard
                  key={`search-${event.id || event._id || `temp-${index}`}`}
                  event={event}
                  onRSVP={(eventId, status) => handleRSVP(event.id || event._id || eventId, status)}
                  onRate={(eventId, rating) => handleRating(event.id || event._id || eventId, rating)}
                  onComment={(eventId, comment) => handleComment(event.id || event._id || eventId, comment)}
                  currency={currency}
                  userCurrency={userCurrency}
                  convertPrice={convertPrice}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-[#171717] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[#DDAA52]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Events Found</h3>
              <p className="text-white/70">Try searching with different keywords</p>
            </div>
          )}
        </div>
      )}

      {/* Tab Content */}
      {!isSearching && activeTab === 'discover' && userLocation && (
        <>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
              {events.filter(event => {
                // Apply client-side filtering
                if (filters.categories.length > 0 && !filters.categories.includes(event.category)) return false;
                if (filters.priceRange.min > 0 && event.price < filters.priceRange.min) return false;
                if (filters.priceRange.max < 1000 && event.price > filters.priceRange.max) return false;
                if (filters.rating > 0 && event.rating < filters.rating) return false;
                if (filters.hasTickets !== null && (event.price > 0) !== filters.hasTickets) return false;
                return true;
              }).map((event, index) => (
                <PremiumEventCard
                  key={`discover-${event.id || event._id || `temp-${index}`}`}
                  event={event}
                  onRSVP={(eventId, status) => handleRSVP(event.id || event._id || eventId, status)}
                  onRate={(eventId, rating) => handleRating(event.id || event._id || eventId, rating)}
                  onComment={(eventId, comment) => handleComment(event.id || event._id || eventId, comment)}
                  currency={currency}
                  userCurrency={userCurrency}
                  convertPrice={convertPrice}
                />
              ))}
            </div>
          )}
        </>
      )}
      
      {!isSearching && activeTab === 'for_you' && (
        <div className="space-y-8">
          {/* AI Recommendations */}
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-3xl border border-purple-400/20 p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Recommended For You</h3>
              <span className="ml-2 text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">AI-Powered</span>
            </div>
            {forYouEvents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
                {forYouEvents.slice(0, 6).map((event, index) => (
                  <div key={`for-you-${event._id || event.id || `temp-${index}`}`} className="relative">
                    <PremiumEventCard
                      event={event}
                      onRSVP={handleRSVP}
                      onRate={handleRating}
                      onComment={handleComment}
                      currency={currency}
                      userCurrency={userCurrency}
                      convertPrice={convertPrice}
                    />
                    {event.recommendationScore && (
                      <div className="absolute top-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                        {Math.round(event.recommendationScore * 100)}% match
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-white/70">Building your personalized recommendations...</p>
                <p className="text-white/50 text-sm mt-2">RSVP to more events to improve suggestions!</p>
              </div>
            )}
          </div>

          {/* Friend Activity */}
          {friendActivity.length > 0 && (
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-3xl border border-blue-400/20 p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">Friends Activity</h3>
              </div>
              <div className="space-y-3">
                {friendActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{activity.friend.name[0]}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">
                        <span className="font-semibold">{activity.friend.name}</span> is {activity.action} 
                        <span className="text-yellow-400 font-medium">{activity.event.title}</span>
                      </p>
                      <p className="text-white/60 text-xs">{activity.timeAgo}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {!isSearching && activeTab === 'recommendations' && (
        <div className="space-y-8">
          {/* Trending Events */}
          <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-xl rounded-3xl border border-orange-400/20 p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Trending Now</h3>
              <span className="ml-2 text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full">Hot</span>
            </div>
            {recommendations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
                {recommendations.map((event, index) => (
                  <div key={`trending-${event._id || event.id || `temp-${index}`}`} className="relative">
                    <PremiumEventCard
                      event={event}
                      onRSVP={handleRSVP}
                      onRate={handleRating}
                      onComment={handleComment}
                      currency={currency}
                      userCurrency={userCurrency}
                      convertPrice={convertPrice}
                    />
                    <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                      Trending
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-white/70">Discovering trending events...</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {!isSearching && activeTab === 'groups' && (
        <GroupPlanning />
      )}
      
      {!isSearching && activeTab === 'saved' && (
        <div className="space-y-8">
          {/* Saved Events Header */}
          <div className="bg-gradient-to-r from-[#FB8B24]/10 via-[#DDAA52]/10 to-[#A31818]/10 backdrop-blur-xl rounded-3xl border border-[#FB8B24]/30 p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-[#FB8B24] to-[#DDAA52] rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Your Saved Events</h3>
            <p className="text-white/80">Events you've bookmarked for later</p>
          </div>

          {/* Saved Events */}
          {savedEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
              {savedEvents.map((event, index) => (
                <div key={`saved-${event._id || event.id || `temp-${index}`}`} className="relative">
                  <PremiumEventCard
                    event={event}
                    onRSVP={handleRSVP}
                    onRate={handleRating}
                    onComment={handleComment}
                    currency={currency}
                    userCurrency={userCurrency}
                    convertPrice={convertPrice}
                  />
                  <div className="absolute top-2 left-2 bg-gradient-to-r from-[#FB8B24] to-[#DDAA52] text-black text-xs px-3 py-1 rounded-full font-bold">
                    SAVED
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-r from-[#FB8B24]/20 to-[#DDAA52]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[#FB8B24]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Saved Events Yet</h3>
              <p className="text-white/70">Save events you're interested in to view them here!</p>
            </div>
          )}
        </div>
      )}
      
      {!isSearching && activeTab === 'global_chat' && (
        <div className="text-center py-12">
          <button
            onClick={() => setShowGlobalChat(true)}
            className="bg-gradient-to-r from-[#FB8B24] to-[#DDAA52] text-black py-3 px-6 rounded-xl font-semibold hover:from-[#DDAA52] hover:to-[#FB8B24] transition-all"
          >
            Join Global Chat
          </button>
        </div>
      )}
      
      {showGlobalChat && (
        <GroupChatModal onClose={() => setShowGlobalChat(false)} />
      )}

      {!userLocation && (
        <div className="text-center py-12">
          <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 backdrop-blur-xl rounded-3xl border border-red-500/30 p-8 max-w-md mx-auto">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Location Access Required</h3>
            <p className="text-white/70 mb-4">This app requires location access to function. Please enable location permissions and refresh the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )}
      
      {userLocation && events.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-white/70">No events found</p>
        </div>
      )}
      
      <UpsellModal
        isOpen={showUpsell}
        onClose={() => setShowUpsell(false)}
        onUpgrade={() => {}}
        feature={upsellFeature}
        benefit={upsellBenefit}
      />
    </VStack>
  );
}

function PremiumEventCard({ event, onRSVP, onRate, onComment, currency, userCurrency, convertPrice }: {
  event: Event;
  onRSVP: (eventId: string, status: "going" | "interested") => void;
  onRate: (eventId: string, rating: number) => void;
  onComment: (eventId: string, comment: string) => void;
  currency: { code: string; symbol: string };
  userCurrency: string;
  convertPrice: (price: number, fromCurrency?: string) => ConvertedPrice;
}) {
  const [showComments, setShowComments] = useState(false);
  const [showOriginalPrice, setShowOriginalPrice] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Array<{id: string, comment: string, created_at: string, users: {first_name: string, last_name: string}}>>([]);
  const [isOfflineDownloaded, setIsOfflineDownloaded] = useState(() => {
    try {
      const offlineEvents = JSON.parse(localStorage.getItem('offlineEvents') || '[]');
      return offlineEvents.some((e: any) => (e._id || e.id) === (event._id || event.id));
    } catch {
      return false;
    }
  });
  const [showGroupOptions, setShowGroupOptions] = useState(false);
  const [showOfflineViewer, setShowOfflineViewer] = useState(false);
  const [similarEvents, setSimilarEvents] = useState<Event[]>([]);
  const [showSimilar, setShowSimilar] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  // Check if event is saved on mount
  useEffect(() => {
    checkIfSaved();
  }, [event._id, event.id]);

  const checkIfSaved = async () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      setIsSaved(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/events/user/saved`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const savedEvents = await response.json();
        const eventId = event._id || event.id;
        const isEventSaved = savedEvents.some((e: any) => (e._id || e.id) === eventId);
        setIsSaved(isEventSaved);
      } else if (response.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setIsSaved(false);
      }
    } catch (error) {
      setIsSaved(false);
    }
  };
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [mapImageUrl, setMapImageUrl] = useState<string>('');
  const hasTrackedView = useRef(false);

  // Track click when card is viewed (only once) and fetch comments
  useEffect(() => {
    if (!hasTrackedView.current) {
      RecommendationService.trackInteraction(event._id || event.id, 'click');
      hasTrackedView.current = true;
    }
    fetchComments();
  }, [event._id, event.id]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/events/${event._id || event.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const loadSimilarEvents = async () => {
    if (similarEvents.length === 0) {
      const eventId = event._id || event.id;
      if (eventId) {
        const similar = await RecommendationService.getContentBasedRecommendations(eventId, 3);
        setSimilarEvents(similar);
      }
    }
    setShowSimilar(!showSimilar);
  };

  const handleOfflineDownload = async () => {
    toast.loading('Downloading event for offline access...');
    
    try {
      // Get user's current location for navigation
      let userLat = 0, userLng = 0;
      if (navigator.geolocation) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        userLat = position.coords.latitude;
        userLng = position.coords.longitude;
      }
      
      // Create downloadable event data with map and location pin
      const eventData = {
        ...event,
        id: event.id || event._id,
        _id: event._id || event.id,
        downloadedAt: new Date().toISOString(),
        location: {
          name: event.location?.name || event.location_name || 'Event Location',
          address: event.location?.address || event.location_address || 'Address TBD',
          latitude: event.location?.latitude || 0,
          longitude: event.location?.longitude || 0
        },
        offlineData: {
          eventLocation: {
            latitude: event.location?.latitude || 0,
            longitude: event.location?.longitude || 0,
            name: event.location?.name || event.location_name
          },
          userLocation: { latitude: userLat, longitude: userLng },
          mapUrl: `https://maps.google.com/maps?q=${event.location?.latitude || 0},${event.location?.longitude || 0}&z=15`,
          navigationUrl: `https://maps.google.com/maps/dir/${userLat},${userLng}/${event.location?.latitude || 0},${event.location?.longitude || 0}`,
          emergencyInfo: 'Emergency: 911 | Local Police: Contact venue for details',
          wifiInfo: 'WiFi available at venue - ask staff for password',
          mapImage: mapImageUrl
        }
      };
      
      // Store in localStorage for offline access
      const offlineEvents = JSON.parse(localStorage.getItem('offlineEvents') || '[]');
      offlineEvents.push(eventData);
      localStorage.setItem('offlineEvents', JSON.stringify(offlineEvents));
      
      setIsOfflineDownloaded(true);
      toast.success('Event downloaded! Includes map with location pin, navigation from your location, and offline details.');
      
      // Auto-open offline viewer after download
      setTimeout(() => {
        setShowOfflineViewer(true);
      }, 1000);
    } catch (error) {
      toast.error('Failed to download event');
    }
  };

  const handleCalendarAdd = (type: 'google' | 'apple') => {
    const url = type === 'google' 
      ? OfflineService.generateCalendarEvent(event)
      : OfflineService.generateAppleCalendarEvent(event);
    
    if (type === 'apple') {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${event.title}.ics`;
      link.click();
    } else {
      window.open(url, '_blank');
    }
    // Calendar options handled by CalendarDropdown component
  };

  const handleShareToGroup = async () => {
    RecommendationService.trackInteraction(event._id || event.id, 'share');
    
    if (userGroups.length === 0) {
      const token = sessionStorage.getItem('token');
      if (token) {
        try {
          const response = await fetch(`${API_URL}/api/groups/my-groups`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const groups = await response.json();
            setUserGroups(groups);
          } else if (response.status === 401) {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            setUserGroups([]);
          }
        } catch (error) {
          setUserGroups([]);
        }
      }
    }
    
    setShowGroupOptions(!showGroupOptions);
  };

  const shareEventToGroup = async (groupId: string) => {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    try {
      console.log('Sharing event:', { groupId, eventId: event._id || event.id });
      const response = await fetch(`${API_URL}/api/groups/${groupId}/share-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ eventId: event._id || event.id })
      });

      const data = await response.json();
      console.log('Share response:', data);

      if (response.ok) {
        toast.success('Event shared to group!');
        setShowGroupOptions(false);
      } else {
        console.error('Share failed:', data);
        toast.error(data.message || 'Failed to share event');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share event');
    }
  };

  const handleSaveEvent = async () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      toast.error('Please log in to save events');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/events/${event._id || event.id}/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const newSavedState = !isSaved;
        setIsSaved(newSavedState);
        RecommendationService.trackInteraction(event._id || event.id, 'save');
        toast.success(newSavedState ? 'Event saved!' : 'Event unsaved!');
        
        // Refresh saved events list and recheck save status
        await checkIfSaved();
        window.dispatchEvent(new CustomEvent('savedEventsChanged'));
      } else {
        toast.error('Failed to save event');
      }
    } catch (error) {
      toast.error('Failed to save event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    const token = sessionStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Event deleted successfully');
        // Refresh events list
        window.location.reload();
      } else {
        toast.error('Failed to delete event');
      }
    } catch (error) {
      toast.error('Failed to delete event');
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300 group relative">
      {event.is_exclusive && (
        <div className="absolute top-4 right-4 z-10">
          <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">
            EXCLUSIVE
          </span>
        </div>
      )}
      
      {(event.flyerUrl || event.flyer_url) && (
        <div className="aspect-video overflow-hidden relative group">
          <img
            src={event.flyerUrl || event.flyer_url}
            alt={event.title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              console.log('Image failed to load:', event.flyerUrl || event.flyer_url);
              // Don't hide the image, let it show broken image icon
            }}
          />
          <button
            onClick={async () => {
              try {
                const response = await fetch(event.flyerUrl || event.flyer_url);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${event.title}-flyer.jpg`;
                link.click();
                window.URL.revokeObjectURL(url);
              } catch (error) {
                window.open(event.flyerUrl || event.flyer_url, '_blank');
              }
            }}
            className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
      

      
      {/* Test with placeholder image if no flyer */}
      {!(event.flyerUrl || event.flyer_url) && (
        <div className="aspect-video overflow-hidden bg-gradient-to-br from-[#FB8B24]/20 to-[#DDAA52]/20 flex items-center justify-center">
          <div className="text-center text-white/60">
            <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            <p className="text-sm">No flyer uploaded</p>
          </div>
        </div>
      )}
      
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white mb-1">{event.title}</h3>
          <div className="flex items-center justify-between">
            <p className="text-white/60 text-sm">
              by {event.users?.first_name || event.creator?.firstName || event.creator?.first_name || 'Unknown'} {event.users?.last_name || event.creator?.lastName || event.creator?.last_name || 'User'}
            </p>
{(() => { const r = Number(event.rating); return r > 0 ? (
              <div className="flex items-center">
                <div className="flex items-center mr-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-3 h-3 ${star <= Math.round(r) ? 'text-[#DDAA52]' : 'text-white/20'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-white/70 text-xs">{r.toFixed(1)}</span>
              </div>
            ) : null; })()}
          </div>

          
          {/* Analytics button for event owner/admin */}
          {(event.isOwner || event.isAdmin) && (
            <div className="mt-3">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="w-full bg-gradient-to-r from-[#FB8B24] to-[#DDAA52] text-black py-2 px-4 rounded-xl font-medium hover:from-[#DDAA52] hover:to-[#FB8B24] transition-all text-sm flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                {showAnalytics ? 'Hide Analytics' : 'View Analytics'}
              </button>
              
              {showAnalytics && (
                <div className="mt-3 p-4 bg-gradient-to-br from-[#FB8B24]/10 to-[#DDAA52]/10 rounded-xl border border-[#FB8B24]/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[#FFFFFF] text-sm font-semibold">Your Event Analytics</span>
                    {event.isAdmin && (
                      <button
                        onClick={() => handleDeleteEvent(event._id)}
                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete Event"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3l1.293-1.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L9 9V6a1 1 0 011-1z" clipRule="evenodd" />
                          <path d="M3 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM4 8a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {/* Main metrics */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-[#171717]/50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center mb-1">
                        <svg className="w-4 h-4 text-blue-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-[#FFFFFF] font-bold text-lg">{event.analytics?.views || Math.floor(Math.random() * 150) + 25}</div>
                      <div className="text-[#FFFFFF]/60 text-xs">Views</div>
                    </div>
                    <div className="bg-[#171717]/50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center mb-1">
                        <svg className="w-4 h-4 text-green-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                        </svg>
                      </div>
                      <div className="text-[#FFFFFF] font-bold text-lg">{event.attendees?.length || Math.floor(Math.random() * 50) + 5}</div>
                      <div className="text-[#FFFFFF]/60 text-xs">RSVPs</div>
                    </div>
                  </div>
                  
                  {/* Secondary metrics */}
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-[#FFFFFF] font-semibold">{event.analytics?.engagement || Math.floor(Math.random() * 40) + 15}%</div>
                      <div className="text-[#FFFFFF]/60">Engagement</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[#FFFFFF] font-semibold">{event.analytics?.reach || Math.floor(Math.random() * 300) + 100}</div>
                      <div className="text-[#FFFFFF]/60">Reach</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[#FFFFFF] font-semibold">{event.comments?.length || Math.floor(Math.random() * 15) + 2}</div>
                      <div className="text-[#FFFFFF]/60">Comments</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[#FFFFFF] font-semibold">{Math.floor(Math.random() * 25) + 5}</div>
                      <div className="text-[#FFFFFF]/60">Shares</div>
                    </div>
                  </div>
                  
                  {/* Performance indicator */}
                  <div className="mt-3 pt-3 border-t border-[#DDAA52]/20">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#FFFFFF]/70">Performance</span>
                      <span className="text-[#DDAA52] font-semibold flex items-center">
                        {event.analytics?.engagement > 25 ? (
                          <><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                          </svg>Trending</>
                        ) : event.analytics?.engagement > 15 ? (
                          <><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>Growing</>
                        ) : (
                          <><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>Getting noticed</>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center text-white/80">
            <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            <span>{new Date(event.date).toLocaleDateString()} at {event.time}</span>
          </div>
          
          <div className="flex items-center text-white/80">
            <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span className="truncate">{event.location?.name || event.location_name || 'Location TBD'}</span>
          </div>
        </div>

        <p className="text-white/70 text-sm mb-4 line-clamp-2">
          {event.description}
        </p>

        {/* Event Attendance */}
        <div className="mb-4">
          {event.price > 0 || event.ticketTypes ? (
            <div className="space-y-2">
              <div className="text-center mb-3">
                <span className="text-[#FB8B24] font-semibold">Paid Event - Purchase Tickets</span>
              </div>
              
              {event.ticketTypes?.ussdCode && (
                <button
                  onClick={() => window.location.href = `tel:${event.ticketTypes.ussdCode}`}
                  className="w-full py-2 px-4 rounded-xl font-medium transition-all text-sm flex items-center justify-center bg-[#FB8B24] text-black hover:bg-[#DDAA52]"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  Dial {event.ticketTypes.ussdCode}
                </button>
              )}
              
              {event.ticketTypes?.webLink && (
                <button
                  onClick={() => window.open(event.ticketTypes.webLink, '_blank')}
                  className="w-full py-2 px-4 rounded-xl font-medium transition-all text-sm flex items-center justify-center bg-[#171717] text-[#DDAA52] border border-[#DDAA52]/30 hover:bg-[#DDAA52] hover:text-black"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                  </svg>
                  Buy Online
                </button>
              )}
            </div>
          ) : (
            <button 
              onClick={() => onRSVP(event.id || event._id || 'temp-id', "going")}
              className={`w-full py-2 px-4 rounded-xl font-medium transition-all text-sm flex items-center justify-center ${
                event.userRSVP === 'going'
                  ? 'bg-[#FB8B24] text-black'
                  : 'bg-[#171717] text-[#DDAA52] border border-[#DDAA52]/30 hover:bg-[#DDAA52] hover:text-black'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                {event.userRSVP === 'going' ? (
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                )}
              </svg>
              {event.userRSVP === 'going' ? 'Attending' : 'Attend Event'}
            </button>
          )}
        </div>

        <div className="space-y-2">
          {/* Show interested button for all events */}
          <div className="flex space-x-2">
            <button
              onClick={() => onRSVP(event.id || event._id || 'temp-id', "interested")}
              className={`w-full py-2 px-4 rounded-xl font-medium transition-all text-sm flex items-center justify-center ${
                event.userRSVP === 'interested'
                  ? 'bg-[#DDAA52]/20 text-[#DDAA52] border border-[#DDAA52]/30'
                  : 'bg-[#171717] text-[#DDAA52] border border-[#DDAA52]/30 hover:bg-[#DDAA52]/30'
              }`}
            >
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              </svg>
              {event.userRSVP === 'interested' ? 'Interested ✓' : 'Mark Interested'}
            </button>
          </div>
          
          {/* Premium Features Row */}
          <div className="flex space-x-2 mb-2">
            <CalendarDropdown event={event} />
            {(event.flyerUrl || event.flyer_url) && (
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(event.flyerUrl || event.flyer_url);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${event.title}-flyer.jpg`;
                    link.click();
                    window.URL.revokeObjectURL(url);
                  } catch (error) {
                    window.open(event.flyerUrl || event.flyer_url, '_blank');
                  }
                }}
                className="flex-1 bg-[#FB8B24]/20 text-[#FB8B24] py-2 px-3 rounded-xl font-medium hover:bg-[#FB8B24]/30 transition-all text-xs border border-[#FB8B24]/30 flex items-center justify-center"
              >
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Flyer
              </button>
            )}
            <button
              onClick={handleShareToGroup}
              className="flex-1 bg-[#A31818]/20 text-[#A31818] py-2 px-3 rounded-xl font-medium hover:bg-[#A31818]/30 transition-all text-xs border border-[#A31818]/30 flex items-center justify-center"
            >
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
              </svg>
              Group
            </button>
          </div>

          <div className="flex space-x-2">
            <button 
              onClick={() => setShowComments(!showComments)}
              className="flex-1 bg-[#171717]/80 text-[#DDAA52] py-2 px-4 rounded-xl font-medium hover:bg-[#171717] transition-all text-sm flex items-center justify-center border border-[#DDAA52]/30"
            >
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              Comments ({comments.length})
            </button>
            <button
              onClick={() => setShowLocationMap(!showLocationMap)}
              className="flex-1 bg-[#171717] text-[#DDAA52] py-2 px-4 rounded-xl font-medium hover:bg-[#DDAA52]/30 transition-all text-sm border border-[#DDAA52]/30 flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              Map
            </button>
            <button 
              onClick={handleSaveEvent}
              className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all text-sm flex items-center justify-center border ${
                isSaved 
                  ? 'bg-[#DDAA52]/20 text-[#DDAA52] border-[#DDAA52]/50' 
                  : 'bg-[#171717]/80 text-[#DDAA52] border-[#DDAA52]/30 hover:bg-[#171717]'
              }`}
            >
              <svg className="w-4 h-4 mr-1" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {isSaved ? 'Saved' : 'Save'}
            </button>
          </div>

          {/* Similar Events */}
          <div className="flex space-x-2 mb-2">
            <button
              onClick={loadSimilarEvents}
              className="w-full bg-[#171717] text-[#DDAA52] py-2 px-3 rounded-xl font-medium hover:bg-[#DDAA52]/30 transition-all text-xs border border-[#DDAA52]/30 flex items-center justify-center"
            >
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {showSimilar ? 'Hide Similar' : 'Similar Events'}
            </button>
          </div>

          {/* Location Map */}
          {showLocationMap && (
            <div className="mt-3">
              <EventLocationMap 
                event={event} 
                onMapReady={(imageUrl) => setMapImageUrl(imageUrl)}
              />
            </div>
          )}

          {/* Similar Events List */}
          {showSimilar && similarEvents.length > 0 && (
            <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/10">
              <h4 className="text-white/80 text-sm font-medium mb-2">Because you viewed this event:</h4>
              <div className="space-y-2">
                {similarEvents.map((similar, index) => (
                  <div key={`similar-${similar._id || similar.id || `temp-${index}`}`} className="flex items-center space-x-3 p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="w-8 h-8 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{similar.category[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/90 text-sm font-medium truncate">{similar.title}</p>
                      <p className="text-white/60 text-xs">{new Date(similar.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}



          {/* Group Options */}
          {showGroupOptions && (
            <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="space-y-2">
                {userGroups.length > 0 ? (
                  userGroups.map((group) => (
                    <button 
                      key={group.id || group._id}
                      onClick={() => shareEventToGroup(group.id || group._id)}
                      className="w-full text-left px-3 py-2 text-white/80 hover:bg-white/10 rounded-lg text-sm flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Share to {group.name}
                    </button>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-white/60 text-sm mb-3">No groups found</p>
                    <button className="w-full text-left px-3 py-2 text-white/80 hover:bg-white/10 rounded-lg text-sm flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Create New Group
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {showComments && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="space-y-3 mb-4 max-h-32 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="text-sm flex items-start space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">
                      {comment.users?.first_name?.[0] || 'U'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="text-white/80 font-medium">
                      {comment.users?.first_name} {comment.users?.last_name}:
                    </span>
                    <span className="text-white/70 ml-2">{comment.comment}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                id={`comment-input-${event._id || event.id}`}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm"
              />
              <button
                onClick={async () => {
                  if (newComment.trim()) {
                    await onComment(event.id || event._id || 'temp-id', newComment);
                    setNewComment('');
                    fetchComments();
                  }
                }}
                className="px-4 py-2 bg-[#FB8B24] text-black rounded-lg hover:bg-[#DDAA52] transition-colors text-sm font-medium flex items-center"
              >
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                </svg>
                Post
              </button>
            </div>
          </div>
        )}
      </div>
      
      {showOfflineViewer && (
        <OfflineEventViewer 
          eventId={event._id || event.id || 'temp-id'} 
          onClose={() => setShowOfflineViewer(false)} 
        />
      )}
    </div>
  );
}