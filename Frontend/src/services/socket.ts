import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinEvent(eventId: string) {
    if (this.socket) {
      this.socket.emit('join-event', eventId);
    }
  }

  onEventUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('event-update', callback);
    }
  }

  onNewRegistration(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('new-registration', callback);
    }
  }

  off(event: string) {
    if (this.socket) {
      this.socket.off(event);
    }
  }
}

export const socketService = new SocketService();