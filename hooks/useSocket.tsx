import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('ws://192.168.1.18:18092', {
  transports: ['websocket']
});

export default function useSocket() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    console.log('socketing')
    socket.on('connect', () => {
      console.log('connected')
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('disconnected')
      setIsConnected(false);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  return { socket, isConnected };
}