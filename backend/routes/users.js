const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Save user preferences
router.post('/preferences', auth, async (req, res) => {
  try {
    const { interests, age_group, location_preference } = req.body;
    const supabase = req.app.get('supabase');
    
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: req.user.id,
        interests: interests || [],
        age_group,
        location_preference,
        updated_at: new Date().toISOString()
      });
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();
    
    if (error) throw error;
    
    // Transform the response to match frontend expectations
    const transformedUser = {
      ...user,
      firstName: user.first_name,
      lastName: user.last_name,
      notificationPreferences: user.notification_preferences || {
        eventReminders: true,
        newEventsNearby: true,
        friendActivity: true,
        adminUpdates: true
      },
      avatarUrl: user.profile_picture
    };
    
    res.json(transformedUser);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update user profile (with optional file upload)
router.put('/profile', auth, upload.single('avatar'), async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    const updateData = {};
    
    // Handle FormData fields (when avatar is uploaded)
    if (req.file) {
      // Handle avatar upload to Supabase Storage in folder 5
      const fileName = `5/avatar_${req.user.id}_${Date.now()}.jpg`;
      const supabaseAdmin = req.app.get('supabaseAdmin') || supabase;
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('profile-pictures')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true
        });
      
      if (uploadError) {
        console.error('Avatar upload error:', uploadError);
      } else {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('profile-pictures')
          .getPublicUrl(fileName);
        updateData.profile_picture = publicUrl;
      }
      
      // Parse JSON fields from FormData
      if (req.body.firstName) updateData.first_name = req.body.firstName;
      if (req.body.lastName) updateData.last_name = req.body.lastName;
      if (req.body.bio !== undefined) updateData.bio = req.body.bio;
      if (req.body.location) {
        try {
          updateData.location = typeof req.body.location === 'string' 
            ? JSON.parse(req.body.location) 
            : req.body.location;
        } catch (e) {
          updateData.location = req.body.location;
        }
      }
      if (req.body.interests) {
        try {
          updateData.interests = typeof req.body.interests === 'string' 
            ? JSON.parse(req.body.interests) 
            : req.body.interests;
        } catch (e) {
          updateData.interests = req.body.interests;
        }
      }
      if (req.body.notificationPreferences) {
        try {
          updateData.notification_preferences = typeof req.body.notificationPreferences === 'string' 
            ? JSON.parse(req.body.notificationPreferences) 
            : req.body.notificationPreferences;
        } catch (e) {
          updateData.notification_preferences = req.body.notificationPreferences;
        }
      }
    } else {
      // Handle regular JSON fields
      if (req.body.firstName) updateData.first_name = req.body.firstName;
      if (req.body.lastName) updateData.last_name = req.body.lastName;
      if (req.body.bio !== undefined) updateData.bio = req.body.bio;
      if (req.body.location) updateData.location = req.body.location;
      if (req.body.interests) updateData.interests = req.body.interests;
      if (req.body.notificationPreferences) updateData.notification_preferences = req.body.notificationPreferences;
    }
    
    // First update the user
    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.user.id);
    
    if (updateError) throw updateError;
    
    // Then fetch the updated user data
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Transform the response to match frontend expectations
    const transformedUser = {
      ...user,
      firstName: user.first_name,
      lastName: user.last_name,
      notificationPreferences: user.notification_preferences || {
        eventReminders: true,
        newEventsNearby: true,
        friendActivity: true,
        adminUpdates: true
      },
      avatarUrl: user.profile_picture
    };
    
    res.json(transformedUser);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete user account
router.delete('/account', auth, async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    
    // Delete user data
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.user.id);
    
    if (error) throw error;
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get user stats (for premium users)
router.get('/stats', auth, async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    
    // Get basic stats
    const stats = {
      eventsAttended: 0,
      eventsSaved: 0,
      friendsConnected: 0,
      premiumSince: new Date().toISOString()
    };
    
    // Get events attended (RSVPs with 'going' status)
    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('status', 'going');
    
    stats.eventsAttended = rsvps?.length || 0;
    
    // Get saved events
    const { data: saved } = await supabase
      .from('saved_events')
      .select('id')
      .eq('user_id', req.user.id);
    
    stats.eventsSaved = saved?.length || 0;
    
    // Get friends count
    const { data: friends } = await supabase
      .from('friendships')
      .select('id')
      .or(`user_id.eq.${req.user.id},friend_id.eq.${req.user.id}`)
      .eq('status', 'accepted');
    
    stats.friendsConnected = friends?.length || 0;
    
    res.json(stats);
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;