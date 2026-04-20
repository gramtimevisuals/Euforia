import { API_URL } from '../config';

export class RecommendationService {
  static async trackInteraction(eventId: string | number, type: 'click' | 'save' | 'share' | 'purchase' | 'dismiss', metadata?: any) {
    const token = sessionStorage.getItem('token');
    if (!token || !eventId) return;

    try {
      const response = await fetch(`${API_URL}/api/interactions/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          event_id: eventId,
          interaction_type: type,
          metadata: metadata || {}
        })
      });
      
      if (!response.ok) {
        console.error('Interaction tracking failed:', response.status);
      }
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  }

  static async getPersonalizedRecommendations(limit = 10) {
    const token = sessionStorage.getItem('token');
    if (!token) return [];

    try {
      const response = await fetch(`${API_URL}/api/interactions/recommendations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.events.slice(0, limit);
      }
    } catch (error) {
      console.error('Failed to get recommendations:', error);
    }
    
    return [];
  }

  static async getTrendingEvents(limit = 8) {
    try {
      const response = await fetch(`${API_URL}/api/recommendations/trending`);
      if (response.ok) {
        const data = await response.json();
        return data.slice(0, limit);
      }
    } catch (error) {
      console.error('Failed to get trending events:', error);
    }
    
    return [];
  }

  static async getContentBasedRecommendations(eventId: string, limit = 3) {
    try {
      const response = await fetch(`${API_URL}/api/events/${eventId}`);
      if (response.ok) {
        const event = await response.json();
        
        // Find similar events by category
        const similarResponse = await fetch(`${API_URL}/api/events/nearby?latitude=0&longitude=0&category=${event.category}&limit=${limit + 1}`);
        if (similarResponse.ok) {
          const similar = await similarResponse.json();
          return similar.filter((e: any) => e.id !== eventId).slice(0, limit);
        }
      }
    } catch (error) {
      console.error('Failed to get content-based recommendations:', error);
    }
    
    return [];
  }
}