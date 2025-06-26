import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  autoConnect?: boolean;
  auth?: {
    token?: string;
  };
}

interface SocketHook {
  socket: Socket | null;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
}

export const useSocket = (options: UseSocketOptions = {}): SocketHook => {
  const { autoConnect = true, auth } = options;
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = () => {
    if (socketRef.current?.connected) {
      return;
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
    const token = auth?.token || localStorage.getItem('token');

    // Check if token exists
    if (!token) {
      console.log('🔌 WebSocket: No authentication token available (normal for guests)');
      setConnected(false);
      return;
    }

    // Validate token format (should be JWT)
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('❌ Invalid token format (not a JWT)');
        setConnected(false);
        return;
      }

      const payload = JSON.parse(atob(tokenParts[1]));
      console.log('🔑 Token payload:', { id: payload.id, role: payload.role, exp: payload.exp });

      // Check if token is expired
      if (payload.exp && payload.exp < Date.now() / 1000) {
        console.error('❌ Token is expired');
        setConnected(false);
        return;
      }
    } catch (error) {
      console.error('❌ Error parsing token:', error);
      setConnected(false);
      return;
    }

    console.log('🔌 Connecting to Socket.IO server:', backendUrl);

    socketRef.current = io(backendUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket.IO connected successfully');
      setConnected(true);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
      setConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      console.error('Error details:', error.message, (error as any).description, (error as any).context);
      setConnected(false);
    });

    socketRef.current.on('error', (error) => {
      console.error('❌ Socket.IO error:', error);
    });

    // Add room confirmation listeners
    socketRef.current.on('room-joined', (data) => {
      console.log('✅ Successfully joined room:', data);
    });

    socketRef.current.on('room-left', (data) => {
      console.log('👋 Left room:', data);
    });
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  };

  const emit = (event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  };

  const on = (event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event: string, callback?: (...args: any[]) => void) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event, callback);
      } else {
        socketRef.current.off(event);
      }
    }
  };

  const joinRoom = (room: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-room', room);
      console.log(`Joined room: ${room}`);
    }
  };

  const leaveRoom = (room: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-room', room);
      console.log(`Left room: ${room}`);
    }
  };

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]);

  return {
    socket: socketRef.current,
    connected,
    connect,
    disconnect,
    emit,
    on,
    off,
    joinRoom,
    leaveRoom
  };
};
