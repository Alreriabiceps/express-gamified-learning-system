import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const token = localStorage.getItem('token');
    if (!backendUrl || !token) return;
    const socket = io(backendUrl, {
      path: '/socket.io/',
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    });
    socketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef;
} 