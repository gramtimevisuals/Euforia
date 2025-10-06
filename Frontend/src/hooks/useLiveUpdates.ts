import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { API_URL } from '../config';

export function useLiveUpdates() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Disable live updates when backend is not available
    try {
      const eventSource = new EventSource(`${API_URL}/api/live/stream`);

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'connected':
              console.log('Live updates connected');
              break;
            case 'new_event':
              toast.success('New event available!');
              break;
            case 'event_approved':
              toast.info('Your event has been approved!');
              break;
            case 'feature_update':
              toast('New feature available!', {
                action: {
                  label: 'Refresh',
                  onClick: () => window.location.reload()
                }
              });
              break;
          }
        } catch (error) {
          console.error('Failed to parse SSE data:', error);
        }
      };

      eventSource.onerror = () => {
        setConnected(false);
      };

      return () => {
        eventSource.close();
      };
    } catch (error) {
      console.log('Live updates service unavailable');
      return () => {};
    }
  }, []);

  return { connected };
}