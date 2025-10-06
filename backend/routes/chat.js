const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// Get chat history for a group
router.get('/groups/:groupId/messages', auth, async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    const messageModel = new Message(supabase);
    
    const messages = await messageModel.findByGroupId(req.params.groupId);
    
    res.json(messages.map(msg => ({
      id: msg.id,
      userId: msg.user_id,
      username: msg.username,
      text: msg.text,
      timestamp: msg.created_at
    })));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// Send a message to a group
router.post('/groups/:groupId/messages', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const supabase = req.app.get('supabase');
    const messageModel = new Message(supabase);
    const io = req.app.get('io');
    
    const message = await messageModel.create({
      groupId: req.params.groupId,
      userId: req.user.id,
      username: req.user.firstName + ' ' + req.user.lastName,
      text
    });
    
    // Broadcast to group members
    io.to(`group-${req.params.groupId}`).emit('new_message', {
      id: message.id,
      userId: message.user_id,
      username: message.username,
      text: message.text,
      timestamp: message.created_at
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Get global chat messages
router.get('/global/messages', auth, async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    
    const { data: messages, error } = await supabase
      .from('global_messages')
      .select(`
        id,
        user_id,
        message,
        created_at,
        users!inner(first_name, last_name, avatar_url)
      `)
      .order('created_at', { ascending: true })
      .limit(50);
    
    if (error) throw error;
    
    res.json(messages.map(msg => ({
      id: msg.id,
      userId: msg.user_id,
      user: `${msg.users.first_name} ${msg.users.last_name}`,
      message: msg.message,
      timestamp: msg.created_at,
      avatar: msg.users.avatar_url
    })));
  } catch (error) {
    console.error('Error fetching global messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// Send a global chat message
router.post('/global/messages', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const supabase = req.app.get('supabase');
    
    const { data, error } = await supabase
      .from('global_messages')
      .insert({
        user_id: req.user.id,
        message: message.trim()
      })
      .select(`
        id,
        user_id,
        message,
        created_at,
        users!inner(first_name, last_name, avatar_url)
      `)
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: {
        id: data.id,
        userId: data.user_id,
        user: `${data.users.first_name} ${data.users.last_name}`,
        message: data.message,
        timestamp: data.created_at,
        avatar: data.users.avatar_url
      }
    });
  } catch (error) {
    console.error('Error sending global message:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Get online users count (simplified)
router.get('/global/online', auth, async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    
    // Get users who have been active in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('global_messages')
      .select('user_id')
      .gte('created_at', fiveMinutesAgo);
    
    if (error) throw error;
    
    const uniqueUsers = new Set(data.map(msg => msg.user_id));
    res.json({ count: uniqueUsers.size });
  } catch (error) {
    console.error('Error getting online count:', error);
    res.json({ count: 0 });
  }
});

module.exports = router;