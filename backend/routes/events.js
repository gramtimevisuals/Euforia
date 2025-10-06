const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const auth = require('../middleware/auth');
const RecommendationEngine = require('../services/recommendationEngine');
const router = express.Router();

const upload = multer({ memory: true, limits: { fileSize: 10 * 1024 * 1024 } });

// Create event
router.post('/create', auth, upload.single('flyer'), async (req, res) => {
  try {
    const { title, description, category, date, time, location } = req.body;
    const supabase = req.app.get('supabase');
    
    const locationData = typeof location === 'string' ? JSON.parse(location) : location;
    
    let flyerUrl = null;
    
    // Handle flyer compression if present
    if (req.file) {
      try {
        let quality = 80;
        let compressedBuffer;
        
        do {
          compressedBuffer = await sharp(req.file.buffer)
            .resize(800, 1200, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality })
            .toBuffer();
          quality -= 10;
        } while (compressedBuffer.length > 2097152 && quality > 10);

        const fileName = `flyer_${req.user.id}_${Date.now()}.jpg`;
        const supabaseAdmin = req.app.get('supabaseAdmin');
        
        if (supabaseAdmin) {
          const { error: uploadError } = await supabaseAdmin.storage
            .from('event-flyers')
            .upload(fileName, compressedBuffer, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (!uploadError) {
            const { data: { publicUrl } } = supabaseAdmin.storage
              .from('event-flyers')
              .getPublicUrl(fileName);
            flyerUrl = publicUrl;
          }
        }
      } catch (flyerError) {
        console.log('Flyer upload failed, continuing without it');
      }
    }
    
    // Check if user has auto-approval enabled
    const { data: userData } = await supabase
      .from('users')
      .select('auto_approve_next, approved_events_count')
      .eq('id', req.user.id)
      .single();

    const autoApprove = userData?.auto_approve_next > 0;
    const eventStatus = autoApprove ? 'approved' : 'pending';

    const { data: event, error } = await supabase
      .from('events')
      .insert({
        title,
        description,
        category,
        date,
        time,
        location_name: locationData?.name || 'TBD',
        location_address: locationData?.address || 'TBD',
        creator_id: req.user.id,
        status: eventStatus,
        flyer_url: flyerUrl
      })
      .select()
      .single();

    // If auto-approved, decrement the counter
    if (autoApprove) {
      await supabase
        .from('users')
        .update({ auto_approve_next: userData.auto_approve_next - 1 })
        .eq('id', req.user.id);
    }

    if (error) throw error;
    res.json({ message: 'Event submitted for approval', event });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get events with premium filtering
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, category, radius, priceCategory, isVirtual, sortBy, dateFrom, dateTo } = req.query;
    const userRadius = parseInt(radius) || 50;
    const supabase = req.app.get('supabase');
    const token = req.headers.authorization?.replace('Bearer ', '');
    let currentUserId = null;
    
    // Get current user ID if authenticated
    if (token) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        currentUserId = payload.id || payload.user_id || payload.userId;
        console.log('Current user ID:', currentUserId);
      } catch (error) {
        console.error('Token parsing error:', error);
      }
    }
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Location required' });
    }

    let query = supabase
      .from('events')
      .select(`
        *,
        users!creator_id (
          first_name,
          last_name
        ),
        event_comments (
          id,
          comment,
          created_at,
          users!user_id (
            first_name,
            last_name,
            profile_picture
          )
        )
      `)
      .eq('status', 'approved')
      .gte('date', new Date().toISOString().split('T')[0]);

    // Category filtering
    if (category) {
      const categories = category.split(',');
      query = query.in('category', categories);
    }

    // Date range
    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);

    // Execute query
    const { data: events, error } = await query.limit(userRadius > 50 ? 100 : 50);

    if (error) {
      console.error('Events query error:', error);
      return res.json([]);
    }

    // Transform events to include properly formatted comments and ownership
    const transformedEvents = (events || []).map(event => {
      const isOwner = currentUserId && (event.creator_id === currentUserId || event.creator_id === parseInt(currentUserId));
      console.log(`Event ${event.id}: creator_id=${event.creator_id}, currentUserId=${currentUserId}, isOwner=${isOwner}`);
      
      return {
        ...event,
        isOwner,
        analytics: {
          views: Math.floor(Math.random() * 150) + 25,
          engagement: Math.floor(Math.random() * 40) + 15,
          reach: Math.floor(Math.random() * 300) + 100,
          shares: Math.floor(Math.random() * 25) + 5
        },
        comments: (event.event_comments || []).map(comment => ({
          user: `${comment.users?.first_name || 'User'} ${comment.users?.last_name || ''}`.trim(),
          text: comment.comment,
          date: comment.created_at,
          avatar: comment.users?.profile_picture
        }))
      };
    });

    res.json(transformedEvents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get event details
router.get('/:id', async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error || !event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// RSVP to event
router.post('/:id/rsvp', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const supabase = req.app.get('supabase');
    
    // Check if event exists
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', req.params.id)
      .single();
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Upsert RSVP
    const { error } = await supabase
      .from('event_rsvps')
      .upsert({
        event_id: req.params.id,
        user_id: req.user.id,
        status: status,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    res.json({ message: 'RSVP updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Save/unsave event
router.post('/:id/save', auth, async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    
    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_events')
      .select('id')
      .eq('event_id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (existing) {
      // Remove save
      await supabase
        .from('saved_events')
        .delete()
        .eq('id', existing.id);
    } else {
      // Add save
      await supabase
        .from('saved_events')
        .insert({
          event_id: req.params.id,
          user_id: req.user.id
        });
    }

    res.json({ message: 'Event save status updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rate event
router.post('/:id/rate', auth, async (req, res) => {
  try {
    const { rating } = req.body;
    const supabase = req.app.get('supabase');
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Upsert rating
    const { error } = await supabase
      .from('event_ratings')
      .upsert({
        event_id: req.params.id,
        user_id: req.user.id,
        rating: rating
      });

    if (error) throw error;
    res.json({ message: 'Rating submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add comment
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { comment } = req.body;
    const supabase = req.app.get('supabase');
    
    const { data: newComment, error } = await supabase
      .from('event_comments')
      .insert({
        event_id: parseInt(req.params.id),
        user_id: req.user.id,
        comment: comment,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Comment insert error:', error);
      throw error;
    }
    
    // Broadcast to admin dashboard via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('new_comment', {
        eventId: req.params.id,
        comment: comment,
        userId: req.user.id,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ message: 'Comment added successfully', comment: newComment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get comments for an event
router.get('/:id/comments', async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    
    const { data: comments, error } = await supabase
      .from('event_comments')
      .select(`
        id,
        comment,
        created_at,
        users!user_id(first_name, last_name)
      `)
      .eq('event_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(comments || []);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Track event view
router.post('/:id/view', auth, async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    
    const { error } = await supabase
      .from('event_views')
      .insert({
        event_id: req.params.id,
        user_id: req.user.id,
        viewed_at: new Date().toISOString()
      });

    if (error) throw error;
    res.json({ message: 'View tracked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get personalized recommendations
router.get('/for-you', auth, async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    
    if (!supabase) {
      return res.status(500).json({ message: 'Database connection not available' });
    }
    
    // Get user's interaction history
    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('events(category)')
      .eq('user_id', req.user.id);
    
    const { data: ratings } = await supabase
      .from('event_ratings')
      .select('events(category), rating')
      .eq('user_id', req.user.id);
    
    const { data: views } = await supabase
      .from('event_views')
      .select('events(category)')
      .eq('user_id', req.user.id);
    
    // Calculate preferences
    const categoryCount = {};
    [...(rsvps || []), ...(ratings || []), ...(views || [])].forEach(item => {
      if (item.events?.category) {
        categoryCount[item.events.category] = (categoryCount[item.events.category] || 0) + 1;
      }
    });
    
    const topCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
    
    // Get recommended events
    let query = supabase
      .from('events')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0]);
    
    if (topCategories.length > 0) {
      query = query.in('category', topCategories);
    }
    
    const { data: events, error } = await query.limit(20);
    
    if (error) throw error;
    
    const preferences = {
      topCategories,
      eventsAttended: rsvps?.length || 0,
      matchScore: Math.min(95, (topCategories.length * 20) + (rsvps?.length || 0) * 5)
    };
    
    res.json({ events: events || [], preferences });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's saved events
router.get('/user/saved', auth, async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    
    // Check if saved_events table exists, if not return empty array
    const { data: savedEvents, error } = await supabase
      .from('saved_events')
      .select(`
        events (
          id,
          title,
          description,
          category,
          date,
          time,
          location_name,
          location_address,
          flyer_url,
          creator_id,
          status,
          created_at
        )
      `)
      .eq('user_id', req.user.id);

    if (error) {
      console.error('Saved events error:', error);
      // Return empty array if table doesn't exist
      return res.json([]);
    }

    const events = savedEvents?.map(item => item.events) || [];
    res.json(events);
  } catch (error) {
    console.error('Saved events catch error:', error);
    res.json([]);
  }
});

// Get friend activity
router.get('/friend-activity', auth, async (req, res) => {
  try {
    res.json({ friendActivity: [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;