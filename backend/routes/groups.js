const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

// Create a new group
router.post('/create', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const supabase = req.app.get('supabase');
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        creator_id: req.user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Group creation error:', error);
      return res.status(500).json({ message: 'Failed to create group', error: error.message });
    }

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: req.user.id,
        role: 'admin'
      });

    if (memberError) {
      console.error('Member creation error:', memberError);
    }
    
    res.status(201).json(group);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's groups
router.get('/my-groups', auth, async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    
    const { data: groups, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_members!inner(user_id, role)
      `)
      .eq('group_members.user_id', req.user.id);
    
    if (error) {
      console.error('Fetch groups error:', error);
      return res.status(500).json({ message: 'Failed to fetch groups', error: error.message });
    }
    
    res.json(groups || []);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get available groups to join
router.get('/available', auth, async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    
    // Get all groups where user is not a member
    const { data: userGroups, error: userGroupsError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', req.user.id);
    
    if (userGroupsError) {
      return res.status(500).json({ message: 'Failed to fetch user groups', error: userGroupsError.message });
    }
    
    const userGroupIds = userGroups.map(g => g.group_id);
    
    let query = supabase
      .from('groups')
      .select(`
        *,
        group_members(user_id)
      `);
    
    if (userGroupIds.length > 0) {
      query = query.not('id', 'in', `(${userGroupIds.join(',')})`);
    }
    
    const { data: groups, error } = await query;
    
    if (error) {
      return res.status(500).json({ message: 'Failed to fetch available groups', error: error.message });
    }
    
    res.json(groups || []);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Join a group
router.post('/:groupId/join', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const supabase = req.app.get('supabase');
    
    // Check if group exists
    const { data: group, error: fetchError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();
    
    if (fetchError || !group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user is already a member
    const { data: existingMember, error: memberError } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();
    
    if (existingMember) {
      return res.status(400).json({ message: 'Already a member of this group' });
    }
    
    // Add user to group
    const { error: insertError } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: req.user.id,
        role: 'member'
      });
    
    if (insertError) {
      return res.status(500).json({ message: 'Failed to join group', error: insertError.message });
    }
    
    res.json({ message: 'Successfully joined group' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get group messages
router.get('/:groupId/messages', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const supabase = req.app.get('supabase');
    
    const { data: messages, error } = await supabase
      .from('group_messages')
      .select(`
        id,
        message,
        created_at,
        users!user_id (
          first_name,
          last_name
        )
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    const formattedMessages = (messages || []).map(msg => ({
      id: msg.id,
      userId: msg.user_id,
      username: `${msg.users?.first_name || 'User'} ${msg.users?.last_name || ''}`.trim(),
      text: msg.message,
      timestamp: msg.created_at
    }));
    
    res.json(formattedMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send group message
router.post('/:groupId/messages', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { message } = req.body;
    const supabase = req.app.get('supabase');
    
    const { error } = await supabase
      .from('group_messages')
      .insert({
        group_id: groupId,
        user_id: req.user.id,
        message: message
      });
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Share event to group
router.post('/:groupId/share-event', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { eventId } = req.body;
    const supabase = req.app.get('supabase');
    
    console.log('Share event request:', { groupId, eventId, userId: req.user.id });
    
    // Send message to group about the shared event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('title')
      .eq('id', eventId)
      .single();
    
    if (eventError) {
      console.error('Event fetch error:', eventError);
    }
    
    const { error } = await supabase
      .from('group_messages')
      .insert({
        group_id: groupId,
        user_id: req.user.id,
        message: `📅 Shared event: ${event?.title || 'Event'}`
      });
    
    if (error) {
      console.error('Group message insert error:', error);
      throw error;
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Share event error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get group members
router.get('/:groupId/members', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const supabase = req.app.get('supabase');
    
    const { data: members, error } = await supabase
      .from('group_members')
      .select(`
        users!user_id (
          first_name,
          last_name,
          profile_picture
        )
      `)
      .eq('group_id', groupId);
    
    if (error) throw error;
    
    const formattedMembers = (members || []).map(member => ({
      name: `${member.users?.first_name || 'User'} ${member.users?.last_name || ''}`.trim(),
      avatar: member.users?.profile_picture
    }));
    
    res.json(formattedMembers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;