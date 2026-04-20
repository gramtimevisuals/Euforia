import { useState, useEffect } from 'react';
import { API_URL } from '../config';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URL}/api/users/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.ok ? r.json() : []).then(data => setNotifications(data)).catch(() => {});
  }, []);

  const markAsRead = async (id: string) => {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    await fetch(`${API_URL}/api/users/notifications/${id}/read`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = async () => {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    await fetch(`${API_URL}/api/users/notifications/read-all`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
    });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'event_reminder': return '⏰';
      case 'new_event_nearby': return '📍';
      case 'friend_request': return '👥';
      case 'event_approved': return '✅';
      case 'event_rejected': return '❌';
      default: return '🔔';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-white mb-2">Notifications</h2>
          <p className="text-white/70 text-lg">Stay updated with your events and activities</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-xl font-medium">
            Mark All Read
          </button>
        )}
      </div>
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Notifications</h3>
            <p className="text-white/70">You're all caught up!</p>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className={`backdrop-blur-md rounded-2xl border p-6 ${n.isRead ? 'bg-white/5 border-white/10' : 'bg-white/10 border-white/20'}`}>
              <div className="flex items-start space-x-4">
                <div className="text-2xl">{getIcon(n.type)}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{n.title}</h3>
                      <p className="text-white/80 mb-2">{n.message}</p>
                      <p className="text-white/50 text-sm">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    {!n.isRead && (
                      <button onClick={() => markAsRead(n.id)} className="text-purple-400 hover:text-purple-300 font-medium text-sm">
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
