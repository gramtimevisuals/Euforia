const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

// Get personalized recommendations
router.get('/personalized', auth, async (req, res) => {
  try {
    const { limit = 12 } = req.query;
    const supabase = req.app.get('supabase');
    
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'approved')
      .gte('date', new Date().toISOString().split('T')[0])
      .limit(parseInt(limit));

    if (error) throw error;
    res.json(events || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get trending events
router.get('/trending', async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const supabase = req.app.get('supabase');
    
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'approved')
      .gte('date', new Date().toISOString().split('T')[0])
      .limit(parseInt(limit));

    if (error) throw error;
    res.json(events || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;