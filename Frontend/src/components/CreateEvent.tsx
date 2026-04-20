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
    ticketTypes: {
      ussdCode: '',
      webLink: ''
    },
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
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
      submitData.append('ticketTypes', JSON.stringify(formData.ticketTypes));
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
        window.dispatchEvent(new Event('navigateToEvents'));
        setFormData({
          title: '', description: '', category: '', date: '', time: '',
          location: { name: '', address: '', latitude: 0, longitude: 0 },
          hasTickets: false,
          ticketTypes: { ussdCode: '', webLink: '' },
          tags: [], flyerFile: null
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
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.location.address)}&limit=1`
      );
      const data = await response.json();
      if (!data || data.length === 0) {
        toast.error('Address not found. Try a more specific address.');
        return;
      }
      const { lat, lon, display_name } = data[0];
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      const venueName = formData.location.name || display_name.split(',')[0];
      setFormData(prev => ({
        ...prev,
        location: { name: venueName, address: formData.location.address, latitude, longitude }
      }));
      setShowMap(true);
      toast.success('Location found!');
    } catch (error) {
      toast.error('Failed to locate address. Please try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-2 sm:p-4 md:p-6">
      <div className="bg-[#171717]/80 backdrop-blur-md rounded-3xl border border-[#DDAA52]/30 p-3 sm:p-6 md:p-8">
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
              <input
                type="text"
                required
                placeholder="Venue name"
                value={formData.location.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  location: { ...prev.location, name: e.target.value }
                }))}
                className="w-full px-4 py-3 bg-[#171717] border border-[#DDAA52]/30 rounded-xl text-[#FFFFFF] placeholder-white/50 focus:ring-2 focus:ring-[#FB8B24]"
              />
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
                  {locationLoading ? 'Finding...' : 'Find'}
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
                    className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                  >
                    {showMap ? 'Hide Map' : 'Show Map'}
                  </button>
                )}
              </div>

              {(formData.location.latitude !== 0 || formData.location.longitude !== 0) && (
                <p className="text-xs text-[#FFFFFF]/50">
                  📍 {formData.location.latitude.toFixed(5)}, {formData.location.longitude.toFixed(5)}
                </p>
              )}

              {showMap && formData.location.latitude !== 0 && (
                <div className="rounded-xl overflow-hidden border border-[#DDAA52]/20" style={{ height: '220px' }}>
                  <iframe
                    title="Event Location"
                    width="100%"
                    height="220"
                    style={{ border: 0 }}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${formData.location.longitude - 0.01},${formData.location.latitude - 0.01},${formData.location.longitude + 0.01},${formData.location.latitude + 0.01}&layer=mapnik&marker=${formData.location.latitude},${formData.location.longitude}`}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                checked={formData.hasTickets}
                onChange={(e) => setFormData(prev => ({ ...prev, hasTickets: e.target.checked }))}
                className="w-5 h-5 text-[#FB8B24] bg-[#171717] border-[#DDAA52]/30 rounded"
              />
              <span className="text-[#FFFFFF]">Requires Tickets</span>
            </label>

            {formData.hasTickets && (
              <div className="space-y-4">
                <h3 className="text-[#FFFFFF] font-medium mb-3">Ticket Purchase Options</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#171717] border border-[#DDAA52]/30 rounded-xl p-4">
                    <div className="flex items-center mb-3">
                      <svg className="w-5 h-5 text-[#FB8B24] mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                      <span className="text-[#FFFFFF] font-medium">USSD Code</span>
                    </div>
                    <input
                      type="text"
                      placeholder="*123*456# (Clickable USSD)"
                      value={formData.ticketTypes.ussdCode || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        ticketTypes: {
                          ...prev.ticketTypes,
                          ussdCode: e.target.value
                        }
                      }))}
                      className="w-full px-3 py-2 bg-[#000000] border border-[#DDAA52]/30 rounded-lg text-[#FFFFFF] placeholder-white/50 focus:ring-2 focus:ring-[#FB8B24]"
                    />
                    <p className="text-[#DDAA52] text-xs mt-2">Clients can tap to dial this USSD code</p>
                  </div>
                  
                  <div className="bg-[#171717] border border-[#DDAA52]/30 rounded-xl p-4">
                    <div className="flex items-center mb-3">
                      <svg className="w-5 h-5 text-[#FB8B24] mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[#FFFFFF] font-medium">Web Link</span>
                    </div>
                    <input
                      type="url"
                      placeholder="https://tickets.example.com/event123"
                      value={formData.ticketTypes.webLink || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        ticketTypes: {
                          ...prev.ticketTypes,
                          webLink: e.target.value
                        }
                      }))}
                      className="w-full px-3 py-2 bg-[#000000] border border-[#DDAA52]/30 rounded-lg text-[#FFFFFF] placeholder-white/50 focus:ring-2 focus:ring-[#FB8B24]"
                    />
                    <p className="text-[#DDAA52] text-xs mt-2">Direct link to ticket purchase page</p>
                  </div>
                </div>
                
                <div className="bg-[#FB8B24]/10 border border-[#FB8B24]/30 rounded-xl p-4">
                  <div className="flex items-center mb-2">
                    <svg className="w-4 h-4 text-[#FB8B24] mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-[#FB8B24] font-medium text-sm">Ticket Purchase Info</span>
                  </div>
                  <p className="text-[#FFFFFF] text-sm">
                    Provide either a USSD code for mobile payments or a web link for online ticket purchases. 
                    Clients will see clickable options to buy tickets directly from the event details.
                  </p>
                </div>
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