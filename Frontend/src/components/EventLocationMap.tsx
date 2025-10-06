import React, { useEffect, useRef, useState } from 'react';

interface EventLocationMapProps {
  event: {
    title: string;
    location?: {
      name: string;
      address: string;
      latitude: number;
      longitude: number;
    };
    location_name?: string;
    location_address?: string;
  };
  onMapReady?: (mapImageUrl: string) => void;
}

export default function EventLocationMap({ event, onMapReady }: EventLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapImageUrl, setMapImageUrl] = useState<string>('');

  useEffect(() => {
    const lat = event.location?.latitude || 0;
    const lng = event.location?.longitude || 0;
    
    if (lat === 0 && lng === 0) {
      setMapImageUrl('');
      return;
    }

    // Use OpenStreetMap static map service
    const zoom = 15;
    const width = 400;
    const height = 300;
    
    // Create static map URL using a reliable service
    const staticMapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=${width}&height=${height}&center=lonlat:${lng},${lat}&zoom=${zoom}&marker=lonlat:${lng},${lat};color:%23FB8B24;size:medium&apiKey=demo`;
    
    setMapImageUrl(staticMapUrl);
    
    if (onMapReady) {
      onMapReady(staticMapUrl);
    }
  }, [event, onMapReady]);

  const downloadMap = () => {
    if (mapImageUrl) {
      const link = document.createElement('a');
      link.href = mapImageUrl;
      link.download = `${event.title}-location-map.png`;
      link.click();
    }
  };

  const openInMaps = () => {
    const lat = event.location?.latitude || 0;
    const lng = event.location?.longitude || 0;
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-gradient-to-br from-[#171717] to-[#171717]/80 rounded-xl border border-[#FB8B24]/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[#FB8B24] font-semibold flex items-center">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          Event Location
        </h4>
        <div className="flex space-x-2">
          <button
            onClick={downloadMap}
            className="text-[#DDAA52] hover:text-[#FB8B24] transition-colors"
            title="Download Map"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={openInMaps}
            className="text-[#DDAA52] hover:text-[#FB8B24] transition-colors"
            title="Open in Maps"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {mapImageUrl ? (
        <img 
          src={mapImageUrl}
          alt="Event Location Map"
          className="w-full h-auto rounded-lg border border-[#DDAA52]/20"
          onError={(e) => {
            // Fallback to Google Maps static if primary fails
            const lat = event.location?.latitude || 0;
            const lng = event.location?.longitude || 0;
            if (lat && lng) {
              e.currentTarget.src = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=400x300&markers=color:orange%7C${lat},${lng}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dO_X0Q_MplT9So`;
            }
          }}
        />
      ) : (
        <div className="w-full h-48 bg-[#171717]/50 rounded-lg border border-[#DDAA52]/20 flex items-center justify-center">
          <div className="text-center text-[#FFFFFF]/60">
            <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm">No location coordinates available</p>
          </div>
        </div>
      )}
      
      <div className="mt-3">
        <div className="text-sm text-[#DDAA52] font-medium">
          {event.location?.name || event.location_name || 'Event Location'}
        </div>
        <div className="text-xs text-[#FFFFFF]/70">
          {event.location?.address || event.location_address || 'Address TBD'}
        </div>
        {event.location?.latitude && event.location?.longitude && (
          <div className="text-xs text-[#FFFFFF]/50 mt-1">
            {event.location.latitude.toFixed(4)}, {event.location.longitude.toFixed(4)}
          </div>
        )}
      </div>
    </div>
  );
}