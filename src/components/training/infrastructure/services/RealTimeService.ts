import { useSocket } from '../../components/Providers/SocketProvider';

export class RealTimeService {
  private static socket: any = null;

  static initialize(socket: any) {
    this.socket = socket;
  }

  // Subscribe to progress updates
  static subscribeToProgress(
    journeyId: string, 
    callback: (payload: any) => void
  ): () => void {
    if (!this.socket) return () => {};

    const eventName = `progress-${journeyId}`;
    this.socket.on(eventName, callback);

    return () => {
      this.socket.off(eventName, callback);
    };
  }

  // Subscribe to live session updates
  static subscribeToLiveSession(
    sessionId: string,
    callback: (payload: any) => void
  ): () => void {
    if (!this.socket) return () => {};

    const eventName = `session-${sessionId}`;
    this.socket.on(eventName, callback);

    return () => {
      this.socket.off(eventName, callback);
    };
  }

  // Broadcast real-time events
  static async broadcastEvent(channel: string, event: string, payload: any): Promise<void> {
    if (this.socket) {
      this.socket.emit('broadcast', {
        channel,
        event,
        payload
      });
    }
  }

  // Join a room for real-time updates
  static joinRoom(roomId: string): void {
    if (this.socket) {
      this.socket.emit('join-room', roomId);
    }
  }

  // Leave a room
  static leaveRoom(roomId: string): void {
    if (this.socket) {
      this.socket.emit('leave-room', roomId);
    }
  }

  // Clean up all subscriptions
  static cleanup(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}