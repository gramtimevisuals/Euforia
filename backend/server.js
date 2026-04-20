const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

require('dotenv').config();

const app = express();
const server = createServer(app);
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.FRONTEND_URL
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Neon database client (Supabase-compatible API)
const { buildClient } = require('./db');
const supabase = buildClient(require('./db').pool);

// Make supabase available to routes
app.set('supabase', supabase);
app.set('supabaseAdmin', supabase);

// WebSocket connection handling
const Message = require('./models/Message');
const globalChatUsers = new Set();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-event', (eventId) => {
    socket.join(`event-${eventId}`);
  });
  
  socket.on('join-global-chat', async () => {
    socket.join('global-chat');
    globalChatUsers.add(socket.id);
    io.to('global-chat').emit('global-online-count', globalChatUsers.size);
    
    // Send recent message history
    try {
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
      
      if (!error && messages) {
        const formattedMessages = messages.map(msg => {
          let avatarUrl = null;
          if (msg.users.avatar_url) {
            if (msg.users.avatar_url.startsWith('http')) {
              avatarUrl = msg.users.avatar_url;
            } else {
              // Construct proper Supabase storage URL
              avatarUrl = `https://rnbwkqcqjqjqjqjqjqjq.supabase.co/storage/v1/object/public/profile-pictures/${msg.users.avatar_url}`;
            }
          }
          return {
            id: msg.id,
            user: `${msg.users.first_name} ${msg.users.last_name}`,
            message: msg.message,
            avatar: avatarUrl,
            timestamp: msg.created_at
          };
        });
        socket.emit('global-message-history', formattedMessages);
      }
    } catch (error) {
      console.error('Error loading global message history:', error);
    }
  });
  
  socket.on('send-global-message', async (data) => {
    try {
      // Get user ID from token if available
      let userId = null;
      if (data.token) {
        try {
          const payload = JSON.parse(atob(data.token.split('.')[1]));
          userId = payload.id;
        } catch (error) {
          console.error('Error parsing token:', error);
        }
      }
      
      // Save to database
      const { data: savedMessage, error } = await supabase
        .from('global_messages')
        .insert({
          user_id: userId,
          message: data.message
        })
        .select(`
          id,
          user_id,
          message,
          created_at,
          users(first_name, last_name, avatar_url)
        `)
        .single();
      
      if (!error && savedMessage) {
        let avatarUrl = null;
        if (savedMessage.users?.avatar_url) {
          if (savedMessage.users.avatar_url.startsWith('http')) {
            avatarUrl = savedMessage.users.avatar_url;
          } else {
            avatarUrl = `https://rnbwkqcqjqjqjqjqjqjq.supabase.co/storage/v1/object/public/profile-pictures/${savedMessage.users.avatar_url}`;
          }
        } else if (data.avatar) {
          avatarUrl = data.avatar;
        }
        
        const messageData = {
          id: savedMessage.id,
          user: savedMessage.users ? `${savedMessage.users.first_name} ${savedMessage.users.last_name}` : data.user,
          message: savedMessage.message,
          avatar: avatarUrl,
          timestamp: savedMessage.created_at
        };
        io.to('global-chat').emit('global-message', messageData);
      } else {
        // Fallback to broadcasting without saving
        const messageData = {
          user: data.user,
          message: data.message,
          avatar: data.avatar,
          timestamp: data.timestamp
        };
        io.to('global-chat').emit('global-message', messageData);
      }
    } catch (error) {
      console.error('Error saving global message:', error);
      // Fallback to broadcasting without saving
      const messageData = {
        user: data.user,
        message: data.message,
        avatar: data.avatar,
        timestamp: data.timestamp
      };
      io.to('global-chat').emit('global-message', messageData);
    }
  });
  
  socket.on('join-group', async (data) => {
    const { groupId, token } = data;
    socket.join(`group-${groupId}`);
    
    // Send message history from group_messages table
    try {
      const { data: messages, error } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });
      
      if (!error) {
        socket.emit('message_history', { messages: messages || [] });
      }
    } catch (error) {
      console.error('Failed to load message history:', error);
    }
  });
  
  socket.on('send_message', async (data) => {
    const { groupId, text, userId, username } = data;
    
    try {
      const { data: message, error } = await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          user_id: userId,
          message: text
        })
        .select()
        .single();
      
      if (!error && message) {
        // Broadcast to group members
        io.to(`group-${groupId}`).emit('message', {
          message: {
            id: message.id,
            userId: message.user_id,
            username: username,
            text: message.message,
            timestamp: message.created_at
          }
        });
      } else {
        socket.emit('error', { message: 'Failed to send message' });
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    globalChatUsers.delete(socket.id);
    io.to('global-chat').emit('global-online-count', globalChatUsers.size);
  });
});

// Make io and server available to routes
app.set('io', io);
app.set('server', server);

// Routes
app.use('/api/events', require('./routes/events'));
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/premium', require('./routes/premium'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/interactions', require('./routes/interactions'));
app.use('/api/live', require('./routes/live'));



// Make broadcast functions available globally
setTimeout(() => {
  if (server.broadcastNewEvent) {
    app.set('broadcastNewEvent', server.broadcastNewEvent);
    app.set('broadcastEventUpdate', server.broadcastEventUpdate);
  }
}, 1000);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});