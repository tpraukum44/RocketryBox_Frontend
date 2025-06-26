import { WebSocketEvent, WebSocketMessage } from '@/types/api';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

export class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 1000;
  private baseURL: string;
  private isConnecting = false;
  private eventHandlers: Map<WebSocketEvent, ((data: any) => void)[]> = new Map();

  constructor() {
            this.baseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

    // In development, use more conservative settings
    if (process.env.NODE_ENV === 'development') {
      this.maxReconnectAttempts = 3; // Fewer attempts in development
      console.log('WebSocket enabled in development mode');
    }

    // Only connect if we have authentication token
    // Delayed connection attempt to avoid blocking page load
    setTimeout(() => {
      const token = localStorage.getItem('token');
      if (token) {
        this.connect();
      } else {
        // This is normal for unauthenticated users - not an error
        console.log('🔌 WebSocket: No auth token available, skipping connection (normal for guests)');
      }
    }, 1000);
  }

  connect() {
    // Prevent multiple connection attempts
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      // Get JWT token for authentication
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('🔌 WebSocket: No auth token available, connection skipped (normal for guests)');
        this.isConnecting = false;
        return;
      }

      // Use default namespace instead of trying to connect to a custom one
      this.socket = io(this.baseURL, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectTimeout,
        timeout: 5000, // 5 second timeout
        path: '/socket.io', // Explicitly set the Socket.IO path
        autoConnect: true // Enable auto-connect in all environments
      });

      this.socket.on('connect', () => {
        console.log('Socket.IO connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
      });

      this.socket.on('connect_error', (error) => {
        console.warn('Socket.IO connection error:', error.message);
        this.isConnecting = false;
        this.handleReconnect();
      });

      this.socket.on('disconnect', () => {
        console.log('Socket.IO disconnected');
        this.isConnecting = false;
        this.handleReconnect();
      });

      this.socket.on('error', (error: Error) => {
        console.error('Socket.IO error:', error);
        this.isConnecting = false;
      });

      // Handle all events
      this.socket.onAny((event: string, data: unknown) => {
        this.handleMessage({
          event: event as WebSocketEvent,
          data,
          timestamp: new Date().toISOString()
        });
      });
    } catch (error) {
      console.error('Failed to connect to Socket.IO:', error);
      this.isConnecting = false;
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, this.reconnectTimeout * this.reconnectAttempts);
    } else if (process.env.NODE_ENV !== 'development') {
      // Only show error in production
      toast.error('Failed to connect to WebSocket server');
    }
  }

  private handleMessage(message: WebSocketMessage<any>) {
    const handlers = this.eventHandlers.get(message.event);
    if (handlers) {
      handlers.forEach(handler => handler(message.data));
    }
  }

  on(event: WebSocketEvent, handler: (data: any) => void) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(handler);
  }

  off(event: WebSocketEvent, handler: (data: any) => void) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  send(event: WebSocketEvent, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket.IO is not connected');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
