import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export default function NotificationCenter() {
  const notifications = useQuery(api.notifications.getMyNotifications);
  const markAsRead = useMutation(api.notifications.markNotificationAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllNotificationsAsRead);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead({ notificationId: notificationId as any });
    } catch (error) {
      toast.error("Failed to mark notification as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all notifications as read");
    }
  };

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-white mb-2">Notifications</h2>
          <p className="text-white/70 text-lg">
            Stay updated with your events and activities
          </p>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Mark All Read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications?.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8 max-w-md mx-auto">
              <div className="text-6xl mb-4">🔔</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Notifications</h3>
              <p className="text-white/70">
                You're all caught up! New notifications will appear here.
              </p>
            </div>
          </div>
        ) : (
          notifications?.map((notification) => (
            <NotificationCard
              key={notification._id}
              notification={notification}
              onMarkAsRead={() => handleMarkAsRead(notification._id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function NotificationCard({ 
  notification, 
  onMarkAsRead 
}: { 
  notification: any; 
  onMarkAsRead: () => void; 
}) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "event_reminder": return "⏰";
      case "new_event_nearby": return "📍";
      case "friend_request": return "👥";
      case "event_approved": return "✅";
      case "event_rejected": return "❌";
      default: return "🔔";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "event_approved": return "border-green-500/30 bg-green-500/10";
      case "event_rejected": return "border-red-500/30 bg-red-500/10";
      case "friend_request": return "border-blue-500/30 bg-blue-500/10";
      default: return "border-white/20 bg-white/10";
    }
  };

  return (
    <div 
      className={`backdrop-blur-md rounded-2xl border p-6 transition-all hover:bg-white/15 ${
        notification.isRead 
          ? "bg-white/5 border-white/10" 
          : `${getNotificationColor(notification.type)} border-l-4`
      }`}
    >
      <div className="flex items-start space-x-4">
        <div className="text-2xl">
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                {notification.title}
              </h3>
              <p className="text-white/80 mb-2">
                {notification.message}
              </p>
              <p className="text-white/50 text-sm">
                {new Date(notification._creationTime).toLocaleString()}
              </p>
            </div>
            
            {!notification.isRead && (
              <button
                onClick={onMarkAsRead}
                className="text-purple-400 hover:text-purple-300 font-medium text-sm"
              >
                Mark as Read
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
