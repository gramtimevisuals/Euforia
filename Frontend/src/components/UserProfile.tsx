import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { compressImage } from '../utils/imageCompression';
import { API_URL } from '../config';

interface UserProfileProps {
  user: any;
  onLogout: () => void;
}

export default function UserProfile({ user, onLogout }: UserProfileProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    location: {
      city: "",
      state: "",
      latitude: 0,
      longitude: 0,
    },
    interests: [] as string[],
    notificationPreferences: {
      eventReminders: true,
      newEventsNearby: true,
      friendActivity: true,
      adminUpdates: true,
    },
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/users/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Profile data:', data); // Debug log
        setProfile(data);
        setFormData({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          bio: data.bio || "",
          location: data.location || { city: "", state: "", latitude: 0, longitude: 0 },
          interests: data.interests || [],
          notificationPreferences: data.notificationPreferences || {
            eventReminders: true,
            newEventsNearby: true,
            friendActivity: true,
            adminUpdates: true,
          },
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const interestOptions = [
    "Music", "Sports", "Food & Drink", "Arts & Culture", 
    "Business", "Technology", "Health & Wellness", "Education",
    "Outdoor Activities", "Gaming", "Photography", "Travel"
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith("location.")) {
      const locationField = name.split(".")[1];
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: locationField === "latitude" || locationField === "longitude" 
            ? Number(value) 
            : value,
        }
      }));
    } else if (name.startsWith("notificationPreferences.")) {
      const prefField = name.split(".")[1];
      setFormData(prev => ({
        ...prev,
        notificationPreferences: {
          ...prev.notificationPreferences,
          [prefField]: (e.target as HTMLInputElement).checked,
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      
      try {
        const compressedFile = await compressImage(file, 2048);
        setAvatarFile(compressedFile);
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setAvatarPreview(e.target?.result as string);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        toast.error("Failed to process image");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      
      if (avatarFile) {
        const formDataWithAvatar = new FormData();
        formDataWithAvatar.append('avatar', avatarFile);
        Object.entries(formData).forEach(([key, value]) => {
          formDataWithAvatar.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
        });
        
        const response = await fetch(`${API_URL}/api/users/profile`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formDataWithAvatar
        });
        
        if (response.ok) {
          const updatedProfile = await response.json();
          setProfile(updatedProfile);
          setIsEditing(false);
          setAvatarFile(null);
          setAvatarPreview(null);
          toast.success("Profile updated successfully!");
        } else {
          const errorData = await response.json();
          console.error('Profile update error:', errorData);
          toast.error(errorData.message || "Failed to update profile");
        }
      } else {
        const response = await fetch(`${API_URL}/api/users/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          const updatedProfile = await response.json();
          setProfile(updatedProfile);
          setIsEditing(false);
          toast.success("Profile updated successfully!");
        } else {
          const errorData = await response.json();
          console.error('Profile update error:', errorData);
          toast.error(errorData.message || "Failed to update profile");
        }
      }
    } catch (error) {
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-[#FFFFFF] mb-4">
          {profile ? "My Profile" : "Complete Your Profile"}
        </h2>
        <p className="text-[#FFFFFF]/70 text-lg">
          {profile 
            ? "Manage your account settings and preferences"
            : "Tell us about yourself to get started"
          }
        </p>
      </div>

      <div className="bg-[#171717]/80 backdrop-blur-md rounded-3xl border border-[#DDAA52]/30 p-8">
        {!isEditing && profile ? (
          <ProfileView 
            profile={profile} 
            user={user}
            onEdit={() => setIsEditing(true)}
            onLogout={onLogout}
          />
        ) : (
          <ProfileForm
            formData={formData}
            avatarPreview={avatarPreview || profile?.avatarUrl || null}
            interestOptions={interestOptions}
            isSubmitting={isSubmitting}
            fileInputRef={fileInputRef}
            onInputChange={handleInputChange}
            onInterestToggle={handleInterestToggle}
            onAvatarUpload={handleAvatarUpload}
            onSubmit={handleSubmit}
            onCancel={profile ? () => setIsEditing(false) : undefined}
          />
        )}
      </div>
    </div>
  );
}

function ProfileView({ 
  profile, 
  user,
  onEdit,
  onLogout
}: { 
  profile: any; 
  user: any;
  onEdit: () => void;
  onLogout: () => void;
}) {
  const [notificationPrefs, setNotificationPrefs] = useState({
    eventReminders: profile.notificationPreferences?.eventReminders || false,
    newEventsNearby: profile.notificationPreferences?.newEventsNearby || false,
    friendActivity: profile.notificationPreferences?.friendActivity || false,
    adminUpdates: profile.notificationPreferences?.adminUpdates || false,
  });

  const handleNotificationChange = async (key: string, value: boolean) => {
    setNotificationPrefs(prev => ({ ...prev, [key]: value }));
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          notificationPreferences: { ...notificationPrefs, [key]: value }
        })
      });
      toast.success('Notification preferences updated!');
    } catch (error) {
      toast.error('Failed to update preferences');
      setNotificationPrefs(prev => ({ ...prev, [key]: !value }));
    }
  };
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-r from-[#FB8B24] to-[#DDAA52] flex items-center justify-center">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.log('Image load error:', profile.avatarUrl);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-[#FFFFFF]">
              {profile.firstName} {profile.lastName}
            </h3>
            <p className="text-[#FFFFFF]/70">{user?.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {user?.is_admin && (
                <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-medium rounded-full">
                  Admin
                </span>
              )}
              <span className="px-3 py-1 bg-gradient-to-r from-[#FB8B24] to-[#DDAA52] text-black text-xs font-medium rounded-full flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                All Features Enabled
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onEdit}
            className="bg-gradient-to-r from-[#FB8B24] to-[#DDAA52] text-black py-2 px-6 rounded-xl font-medium hover:from-[#DDAA52] hover:to-[#FB8B24] transition-all"
          >
            Edit Profile
          </button>
          <button
            onClick={onLogout}
            className="bg-[#171717]/50 text-[#FFFFFF] py-2 px-6 rounded-xl font-medium hover:bg-[#171717]/70 transition-all border border-[#DDAA52]/30"
          >
            Logout
          </button>
          {!user?.is_admin && (
            <button
              onClick={async () => {
                if (confirm('Are you sure you want to permanently delete your account? This action cannot be undone.')) {
                  try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`${API_URL}/api/users/account`, {
                      method: 'DELETE',
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                      toast.success('Account deleted successfully');
                      onLogout();
                    } else {
                      toast.error('Failed to delete account');
                    }
                  } catch (error) {
                    toast.error('Failed to delete account');
                  }
                }
              }}
              className="bg-gradient-to-r from-[#A31818] to-[#CF0E0E] text-white py-2 px-6 rounded-xl font-medium hover:from-[#CF0E0E] hover:to-[#A31818] transition-all"
            >
              Delete Account
            </button>
          )}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <div>
          <h4 className="text-lg font-semibold text-[#FFFFFF] mb-2">About</h4>
          <p className="text-[#FFFFFF]/80">{profile.bio}</p>
        </div>
      )}

      {/* Location */}
      {profile.location && (
        <div>
          <h4 className="text-lg font-semibold text-[#FFFFFF] mb-2">Location</h4>
          <p className="text-[#FFFFFF]/80">
            {profile.location.city}, {profile.location.state}
          </p>
        </div>
      )}

      {/* Interests */}
      {profile.interests && profile.interests.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-[#FFFFFF] mb-3">Interests</h4>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((interest: string) => (
              <span
                key={interest}
                className="px-3 py-1 bg-[#171717]/50 text-[#FFFFFF]/80 text-sm rounded-full border border-[#DDAA52]/20"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notification Preferences */}
      <div>
        <h4 className="text-lg font-semibold text-[#FFFFFF] mb-3">Notification Preferences</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[#FFFFFF]/80">Event Reminders</span>
            <input
              type="checkbox"
              checked={notificationPrefs.eventReminders}
              onChange={(e) => handleNotificationChange('eventReminders', e.target.checked)}
              className="w-5 h-5 text-[#FB8B24] bg-[#171717] border-[#DDAA52]/30 rounded focus:ring-[#FB8B24]"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#FFFFFF]/80">New Events Nearby</span>
            <input
              type="checkbox"
              checked={notificationPrefs.newEventsNearby}
              onChange={(e) => handleNotificationChange('newEventsNearby', e.target.checked)}
              className="w-5 h-5 text-[#FB8B24] bg-[#171717] border-[#DDAA52]/30 rounded focus:ring-[#FB8B24]"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#FFFFFF]/80">Friend Activity</span>
            <input
              type="checkbox"
              checked={notificationPrefs.friendActivity}
              onChange={(e) => handleNotificationChange('friendActivity', e.target.checked)}
              className="w-5 h-5 text-[#FB8B24] bg-[#171717] border-[#DDAA52]/30 rounded focus:ring-[#FB8B24]"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#FFFFFF]/80">Admin Updates</span>
            <input
              type="checkbox"
              checked={notificationPrefs.adminUpdates}
              onChange={(e) => handleNotificationChange('adminUpdates', e.target.checked)}
              className="w-5 h-5 text-[#FB8B24] bg-[#171717] border-[#DDAA52]/30 rounded focus:ring-[#FB8B24]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileForm({
  formData,
  avatarPreview,
  interestOptions,
  isSubmitting,
  fileInputRef,
  onInputChange,
  onInterestToggle,
  onAvatarUpload,
  onSubmit,
  onCancel,
}: {
  formData: any;
  avatarPreview: string | null;
  interestOptions: string[];
  isSubmitting: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onInterestToggle: (interest: string) => void;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Avatar Upload */}
      <div className="text-center">
        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-gradient-to-r from-[#FB8B24] to-[#DDAA52] flex items-center justify-center mb-4">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Profile preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                console.log('Preview image error:', avatarPreview);
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-[#DDAA52] hover:text-[#FB8B24] font-medium"
        >
          Change Avatar
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onAvatarUpload}
          className="hidden"
        />
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[#FFFFFF] font-medium mb-2">First Name *</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={onInputChange}
            required
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#FB8B24]"
            placeholder="Enter your first name"
          />
        </div>

        <div>
          <label className="block text-[#FFFFFF] font-medium mb-2">Last Name *</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={onInputChange}
            required
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#FB8B24]"
            placeholder="Enter your last name"
          />
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-[#FFFFFF] font-medium mb-2">Bio</label>
        <textarea
          name="bio"
          value={formData.bio}
          onChange={onInputChange}
          rows={3}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#FB8B24] resize-none"
          placeholder="Tell us about yourself..."
        />
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[#FFFFFF] font-medium mb-2">City</label>
          <input
            type="text"
            name="location.city"
            value={formData.location.city}
            onChange={onInputChange}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#FB8B24]"
            placeholder="Your city"
          />
        </div>

        <div>
          <label className="block text-[#FFFFFF] font-medium mb-2">State</label>
          <input
            type="text"
            name="location.state"
            value={formData.location.state}
            onChange={onInputChange}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#FB8B24]"
            placeholder="Your state"
          />
        </div>
      </div>

      {/* Interests */}
      <div>
        <label className="block text-[#FFFFFF] font-medium mb-3">Interests</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {interestOptions.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => onInterestToggle(interest)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                formData.interests.includes(interest)
                  ? "bg-[#FB8B24] text-black"
                  : "bg-white/10 text-white/70 hover:bg-white/20 border border-white/20"
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>

      {/* Notification Preferences */}
      <div>
        <label className="block text-[#FFFFFF] font-medium mb-3">Notification Preferences</label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[#FFFFFF]/80">Event Reminders</span>
            <input
              type="checkbox"
              name="notificationPreferences.eventReminders"
              checked={formData.notificationPreferences.eventReminders}
              onChange={onInputChange}
              className="w-5 h-5 text-[#FB8B24] bg-white/10 border-white/20 rounded focus:ring-[#FB8B24]"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#FFFFFF]/80">New Events Nearby</span>
            <input
              type="checkbox"
              name="notificationPreferences.newEventsNearby"
              checked={formData.notificationPreferences.newEventsNearby}
              onChange={onInputChange}
              className="w-5 h-5 text-[#FB8B24] bg-white/10 border-white/20 rounded focus:ring-[#FB8B24]"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#FFFFFF]/80">Friend Activity</span>
            <input
              type="checkbox"
              name="notificationPreferences.friendActivity"
              checked={formData.notificationPreferences.friendActivity}
              onChange={onInputChange}
              className="w-5 h-5 text-[#FB8B24] bg-white/10 border-white/20 rounded focus:ring-[#FB8B24]"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#FFFFFF]/80">Admin Updates</span>
            <input
              type="checkbox"
              name="notificationPreferences.adminUpdates"
              checked={formData.notificationPreferences.adminUpdates}
              onChange={onInputChange}
              className="w-5 h-5 text-[#FB8B24] bg-white/10 border-white/20 rounded focus:ring-[#FB8B24]"
            />
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex space-x-4 pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-[#FB8B24] text-black py-3 px-6 rounded-xl font-semibold hover:bg-[#DDAA52] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : "Save Profile"}
        </button>
        
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-[#171717]/50 text-[#FFFFFF] py-3 px-6 rounded-xl font-semibold hover:bg-[#171717]/70 transition-all border border-[#DDAA52]/30"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
