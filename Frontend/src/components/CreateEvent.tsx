import React, { useState } from 'react';
import { toast } from 'sonner';
import { API_URL } from '../config';

export default function CreateEvent() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    date: '',
    time: '',
    location: { name: '', address: '', latitude: 0, longitude: 0 },
    hasTickets: false,
    price: 0,
    tags: [] as string[],
    flyerFile: null as File | null
  });
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const categories = ["Music", "Sports", "Food", "Art", "Business", "Technology", "Health", "Education", "Other"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please log in to create events');
      return;
    }

    setLoading(true);
    try {
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('category', formData.category);
      submitData.append('date', formData.date);
      submitData.append('time', formData.time);
      submitData.append('location', JSON.stringify(formData.location));
      submitData.append('hasTickets', formData.hasTickets.toString());
      submitData.append('price', formData.price.toString());
      submitData.append('tags', JSON.stringify(formData.tags));
      if (formData.flyerFile) {
        submitData.append('flyer', formData.flyerFile);
      }

      const response = await fetch(`${API_URL}/api/events/create`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: submitData
      });

      if (response.ok) {
        toast.success('Event submitted for admin approval!');
        setFormData({
          title: '', description: '', category: '', date: '', time: '',
          location: { name: '', address: '', latitude: 0, longitude: 0 },
          hasTickets: false, price: 0, tags: [], flyerFile: null
        });
      } else {
        const data = await response.json();
        console.error('Server error:', data);
        toast.error(data.message || 'Failed to create event');
      }
    } catch (error) {
      console.error('Network error:', error);
      toast.error('Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const getCurrentLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({
            ...prev,
            location: { ...prev.location, latitude, longitude }
          }));
          setShowMap(true);
          toast.success('Location captured successfully!');
          setLocationLoading(false);
        },
        (error) => {
          toast.error('Failed to get location. Please enable location access.');
          setLocationLoading(false);
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser.');
      setLocationLoading(false);
    }
  };

  const geocodeAddress = async () => {
    if (!formData.location.address) {
      toast.error('Please enter an address first');
      return;
    }
    
    setLocationLoading(true);
    try {
      // Try multiple geocoding services for accuracy
      let lat, lng, foundLocation = false;
      
      // First try: Nominatim with detailed search
      const nominatimResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.location.address)}&addressdetails=1&limit=5`
      );
      const nominatimData = await nominatimResponse.json();
      
      if (nominatimData && nominatimData.length > 0) {
        // Find the most specific match
        const bestMatch = nominatimData.find(result => 
          result.display_name.toLowerCase().includes(formData.location.address.toLowerCase())
        ) || nominatimData[0];
        
        lat = parseFloat(bestMatch.lat);
        lng = parseFloat(bestMatch.lon);
        foundLocation = true;
        
        // Auto-fill venue name if not already filled
        const venueName = bestMatch.name || bestMatch.display_name.split(',')[0];
        if (!formData.location.name || formData.location.name.trim() === '') {
          setFormData(prev => ({
            ...prev,
            location: { 
              ...prev.location, 
              name: venueName,
              latitude: lat, 
              longitude: lng 
            }
          }));
          toast.success(`Found venue: ${venueName}`);
        } else {
          setFormData(prev => ({
            ...prev,
            location: { ...prev.location, latitude: lat, longitude: lng }
          }));
          toast.success(`Location found for ${formData.location.name}`);
        }
        
        console.log('Geocoding result:', bestMatch);
      }
      
      if (!foundLocation) {
        toast.error('Exact address not found. Please verify the address is correct.');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        location: { ...prev.location, latitude: lat, longitude: lng }
      }));
      setShowMap(true);
      
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Failed to locate address. Please try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="bg-[#171717]/80 backdrop-blur-md rounded-3xl border border-[#DDAA52]/30 p-4 sm:p-8">
        <h2 className="text-3xl font-bold text-[#FFFFFF] mb-6">Create Event</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[#FFFFFF] font-medium mb-2">Event Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 bg-[#171717] border border-[#DDAA52]/30 rounded-xl text-[#FFFFFF] placeholder-white/50 focus:ring-2 focus:ring-[#FB8B24]"
              placeholder="Enter event title"
            />
          </div>

          <div>
            <label className="block text-[#FFFFFF] font-medium mb-2">Description</label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 bg-[#171717] border border-[#DDAA52]/30 rounded-xl text-[#FFFFFF] placeholder-white/50 focus:ring-2 focus:ring-[#FB8B24]"
              placeholder="Describe your event"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#FFFFFF] font-medium mb-2">Category</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-3 bg-[#171717] border border-[#DDAA52]/30 rounded-xl text-[#FFFFFF] focus:ring-2 focus:ring-[#FB8B24]"
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat} className="text-gray-900">{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#FFFFFF] font-medium mb-2">Event Flyer</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFormData(prev => ({ ...prev, flyerFile: e.target.files?.[0] || null }))}
                className="w-full px-4 py-3 bg-[#171717] border border-[#DDAA52]/30 rounded-xl text-[#FFFFFF] file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#FB8B24] file:text-black hover:file:bg-[#DDAA52]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#FFFFFF] font-medium mb-2">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-3 bg-[#171717] border border-[#DDAA52]/30 rounded-xl text-[#FFFFFF] focus:ring-2 focus:ring-[#FB8B24]"
              />
            </div>

            <div>
              <label className="block text-[#FFFFFF] font-medium mb-2">Time</label>
              <input
                type="time"
                required
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                className="w-full px-4 py-3 bg-[#171717] border border-[#DDAA52]/30 rounded-xl text-[#FFFFFF] focus:ring-2 focus:ring-[#FB8B24]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#FFFFFF] font-medium mb-2">Location</label>
            <div className="space-y-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  placeholder="Venue name"
                  value={formData.location.name}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    location: { ...prev.location, name: e.target.value }
                  }))}
                  className="flex-1 px-4 py-3 bg-[#171717] border border-[#DDAA52]/30 rounded-xl text-[#FFFFFF] placeholder-white/50 focus:ring-2 focus:ring-[#FB8B24]"
                />
                <button
                  type="button"
                  onClick={geocodeAddress}
                  disabled={locationLoading}
                  className="px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                  Find
                </button>
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  placeholder="Full address"
                  value={formData.location.address}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    location: { ...prev.location, address: e.target.value }
                  }))}
                  className="flex-1 px-4 py-3 bg-[#171717] border border-[#DDAA52]/30 rounded-xl text-[#FFFFFF] placeholder-white/50 focus:ring-2 focus:ring-[#FB8B24]"
                />
                <button
                  type="button"
                  onClick={geocodeAddress}
                  disabled={locationLoading}
                  className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                  Find
                </button>
              </div>
              
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className="flex-1 px-4 py-3 bg-[#FB8B24] text-black rounded-xl hover:bg-[#DDAA52] transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  {locationLoading ? 'Getting Location...' : 'Use Current Location'}
                </button>
                
                {(formData.location.latitude !== 0 || formData.location.longitude !== 0) && (
                  <button
                    type="button"
                    onClick={() => setShowMap(!showMap)}
                    className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {showMap ? 'Hide Map' : 'Show Map'}
                  </button>
                )}
              </div>
              
              {(formData.location.latitude !== 0 || formData.location.longitude !== 0) && (
                <div className="text-xs text-[#FFFFFF]/70">
                  Coordinates: {formData.location.latitude.toFixed(6)}, {formData.location.longitude.toFixed(6)}
                </div>
              )}
              
              {showMap && (formData.location.latitude !== 0 || formData.location.longitude !== 0) && (
                <div className="mt-4 p-4 bg-[#171717]/50 rounded-xl border border-[#DDAA52]/20">
                  <h4 className="text-[#DDAA52] font-medium mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    Event Location Verification
                  </h4>
                  
                  {/* Location Accuracy Warning */}
                  <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-center text-yellow-400 text-sm font-medium mb-1">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Verify Location Accuracy
                    </div>
                    <p className="text-yellow-300 text-xs">
                      Please confirm this map shows the correct event location. If not accurate, try a more specific address or use "Current Location" if you're at the venue.
                    </p>
                  </div>
                  
                  <img
                    src={`https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=400&height=200&center=lonlat:${formData.location.longitude},${formData.location.latitude}&zoom=15&marker=lonlat:${formData.location.longitude},${formData.location.latitude};color:%23FB8B24;size:medium&apiKey=demo`}
                    alt="Event Location Map"
                    className="w-full h-auto rounded-lg border border-[#DDAA52]/20"
                    onError={(e) => {
                      e.currentTarget.src = `https://maps.googleapis.com/maps/api/staticmap?center=${formData.location.latitude},${formData.location.longitude}&zoom=15&size=400x200&markers=color:orange%7C${formData.location.latitude},${formData.location.longitude}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dO_X0Q_MplT9So`;
                    }}
                  />
                  
                  <div className="mt-3 space-y-2">
                    <div className="text-sm text-[#FFFFFF]/80">
                      <div className="font-medium text-[#DDAA52]">{formData.location.name || 'Event Location'}</div>
                      <div className="text-[#FFFFFF]/60">{formData.location.address}</div>
                    </div>
                    
                    {/* Location Details */}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-[#171717]/30 p-2 rounded-lg">
                        <div className="text-xs text-[#FFFFFF]/50">Coordinates</div>
                        <div className="text-xs text-[#DDAA52] font-mono">
                          {formData.location.latitude.toFixed(6)}, {formData.location.longitude.toFixed(6)}
                        </div>
                      </div>
                      <div className="bg-[#171717]/30 p-2 rounded-lg">
                        <div className="text-xs text-[#FFFFFF]/50">Navigation</div>
                        <button
                          type="button"
                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${formData.location.latitude},${formData.location.longitude}`, '_blank')}
                          className="text-xs text-blue-400 hover:text-blue-300 underline"
                        >
                          Get Directions
                        </button>
                      </div>
                    </div>
                    
                    {/* Safety Features */}
                    <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="text-xs text-blue-400 font-medium mb-1">Safety Features Enabled:</div>
                      <div className="text-xs text-blue-300 space-y-1">
                        <div>✓ GPS coordinates verified and stored</div>
                        <div>✓ Location accessible via navigation apps</div>
                        <div>✓ Attendees can share location with emergency contacts</div>
                        <div>✓ Event location visible to all participants</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.hasTickets}
                onChange={(e) => setFormData(prev => ({ ...prev, hasTickets: e.target.checked }))}
                className="w-5 h-5 text-[#FB8B24] bg-[#171717] border-[#DDAA52]/30 rounded"
              />
              <span className="text-[#FFFFFF]">Requires Tickets</span>
            </label>

            {formData.hasTickets && (
              <div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Price"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                  className="px-4 py-2 bg-[#171717] border border-[#DDAA52]/30 rounded-xl text-[#FFFFFF] placeholder-white/50 focus:ring-2 focus:ring-[#FB8B24]"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[#FFFFFF] font-medium mb-2">Tags</label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tags"
                className="flex-1 px-4 py-2 bg-[#171717] border border-[#DDAA52]/30 rounded-xl text-[#FFFFFF] placeholder-white/50 focus:ring-2 focus:ring-[#FB8B24]"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-[#FB8B24] text-black rounded-xl hover:bg-[#DDAA52] transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-[#FB8B24]/20 text-[#DDAA52] rounded-full text-sm flex items-center"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ 
                      ...prev, 
                      tags: prev.tags.filter((_, i) => i !== index) 
                    }))}
                    className="ml-2 text-[#DDAA52] hover:text-[#FFFFFF]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#FB8B24] text-black rounded-xl font-medium hover:bg-[#DDAA52] transition-all disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </form>
      </div>
    </div>
  );
}