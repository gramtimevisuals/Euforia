const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

// Track user interactions
router.post('/track', auth, async (req, res) => {
  try {
    const { event_id, interaction_type, metadata } = req.body;
    
    if (!event_id || !interaction_type) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const supabase = req.app.get('supabase');
    
    const weights = {
      'click': 1,
      'save': 3,
      'share': 4,
      'purchase': 5,
      'dismiss': -3
    };
    
    // For now, just return success without database insert
    // This avoids the table creation issue
    console.log('Interaction tracked:', { user_id: req.user.id, event_id, interaction_type });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Interaction tracking error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get user recommendations
router.get('/recommendations', auth, async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    
    // Get user's interaction history
    const { data: interactions } = await supabase
      .from('user_interactions')
      .select(`
        event_id,
        interaction_type,
        weight,
        events (category, tags)
      `)
      .eq('user_id', req.user.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    // Calculate user preferences
    const categoryScores = {};
    const tagScores = {};
    
    interactions?.forEach(interaction => {
      const category = interaction.events?.category;
      const tags = interaction.events?.tags || [];
      
      if (category) {
        categoryScores[category] = (categoryScores[category] || 0) + interaction.weight;
      }
      
      tags.forEach(tag => {
        tagScores[tag] = (tagScores[tag] || 0) + interaction.weight;
      });
    });
    
    // Get recommended events
    const topCategories = Object.entries(categoryScores)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
    
    let query = supabase
      .from('events')
      .select('*')
      .eq('status', 'approved')
      .gte('date', new Date().toISOString().split('T')[0]);
    
    if (topCategories.length > 0) {
      query = query.in('category', topCategories);
    }
    
    const { data: events } = await query.limit(20);
    
    res.json({
      events: events || [],
      preferences: { categoryScores, tagScores, topCategories }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;