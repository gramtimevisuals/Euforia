import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export default function GlobalChat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Global chat Socket.IO connected');
      setIsConnected(true);
      socket.emit('join-global-chat');
    });

    socket.on('global-message-history', (messages) => {
      console.log('Received message history:', messages);
      setMessages(messages);
    });

    socket.on('global-message', (data) => {
      console.log('Received new message:', data);
      setMessages(prev => [...prev, data]);
    });

    socket.on('global-online-count', (count) => {
      setOnlineCount(count);
    });

    socket.on('disconnect', () => {
      console.log('Global chat Socket.IO disconnected');
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim() || !isConnected || !socketRef.current) return;

    const token = localStorage.getItem('token');
    let username = 'Anonymous';
    let avatar = null;
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        username = `${payload.firstName} ${payload.lastName}`;
        avatar = payload.avatar_url || localStorage.getItem('avatar_url');
      } catch (error) {
        username = localStorage.getItem('username') || 'Anonymous';
      }
    }

    socketRef.current.emit('send-global-message', {
      message: newMessage.trim(),
      user: username,
      avatar: avatar,
      token: token,
      timestamp: new Date().toISOString()
    });

    setNewMessage('');
  };

  return (
    <div className="bg-gradient-to-br from-[#171717] to-[#171717]/80 backdrop-blur-xl rounded-3xl border border-[#DDAA52]/30 p-6 h-[600px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-[#FB8B24] to-[#DDAA52] rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#FFFFFF]">Global Chat</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-[#FFFFFF]/60 text-sm">{onlineCount} online</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((message, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-[#A31818] to-[#CF0E0E] rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              {message.avatar ? (
                <img 
                  src={message.avatar} 
                  alt={message.user} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <span 
                className="text-[#FFFFFF] text-xs font-bold flex items-center justify-center" 
                style={{ display: message.avatar ? 'none' : 'flex' }}
              >
                {message.user?.split(' ').map(n => n[0]).join('').toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-[#FFFFFF]/90 font-medium text-sm">{message.user}</span>
                <span className="text-[#FFFFFF]/40 text-xs">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="bg-[#171717]/50 rounded-xl px-3 py-2 border border-[#DDAA52]/20">
                <p className="text-[#FFFFFF]/80 text-sm">{message.message}</p>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex space-x-3">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          disabled={!isConnected}
          className="flex-1 px-4 py-3 bg-[#171717] border border-[#DDAA52]/30 rounded-xl text-[#FFFFFF] placeholder-[#FFFFFF]/50 focus:outline-none focus:ring-2 focus:ring-[#FB8B24] disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim() || !isConnected}
          className="px-6 py-3 bg-gradient-to-r from-[#FB8B24] to-[#DDAA52] text-black rounded-xl font-medium hover:from-[#DDAA52] hover:to-[#FB8B24] transition-all disabled:opacity-50 flex items-center"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}