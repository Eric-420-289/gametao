import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { Player, Room, GameState, ChatMessage } from '@shared/types';

interface GameStore {
  socket: Socket | null;
  room: Room | null;
  player: Player | null;
  gameState: GameState | null;
  messages: ChatMessage[];
  connect: () => void;
  createRoom: (playerName: string, playWithBot?: boolean, roomCode?: string) => Promise<Room | null>;
  joinRoom: (code: string, name: string) => Promise<Room | null>;
  sendMessage: (content: string, type?: 'message' | 'emoji' | 'reaction') => void;
  startGame: () => void;
  rollDice: () => void;
  newRound: () => void;
  bid: (quantity: number, value: number) => void;
  challenge: () => void;
}

export const useStore = create<GameStore>((set, get) => ({
  socket: null,
  room: null,
  player: null,
  gameState: null,
  messages: [],
  
  connect: () => {
    if (get().socket) {
      return;
    }
    
    // ดึงจาก Env ก่อน ถ้าไม่มีให้ใช้ URL ของ Render เป็นค่าสำรองแทน localhost
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://gametao-1.onrender.com';
    
    console.log('Connecting to Socket URL:', socketUrl);

    // เอา transports: ['websocket'] ออก เพื่อให้มือถือเชื่อมต่อง่ายขึ้น
    const socket = io(socketUrl);

    socket.on('connect', () => {
      console.log('connected successfully');
    });
    
    socket.on('roomCreated', ({ room, player }) => {
      set({ room, player });
    });
    
    socket.on('roomJoined', ({ room, player }) => {
      set({ room, player });
    });
    
    socket.on('roomUpdated', ({ room }) => {
      set({ room });
    });
    
    socket.on('gameStarted', ({ gameState, room }) => {
      set({ gameState, room });
    });
    
    socket.on('gameUpdated', ({ gameState, room }) => {
      set({ gameState, room });
    });
    
    socket.on('chatReceived', ({ message }) => {
      set((state) => ({ messages: [...state.messages, message] }));
    });
    
    socket.on('error', ({ message }) => {
      console.error(message);
    });
    
    set({ socket });
  },

  createRoom: async (playerName: string, playWithBot = false, roomCode?: string) => {
    const { socket } = get();
    if (!socket) {
      return null;
    }
    return new Promise((resolve) => {
      socket.emit('createRoom', { playerName, playWithBot, code: roomCode }, (response: any) => {
        if (response?.error) {
          console.error(response.error);
          resolve(null);
          return;
        }
        if (response?.room) {
          resolve(response.room);
          return;
        }
        socket.once('roomCreated', ({ room }) => resolve(room));
      });
    });
  },

  joinRoom: async (code: string, name: string) => {
    const { socket } = get();
    if (!socket) {
      return null;
    }
    return new Promise((resolve) => {
      socket.emit('joinRoom', { code, name }, (response: any) => {
        if (response?.error) {
          console.error(response.error);
          resolve(null);
          return;
        }
        if (response?.room) {
          resolve(response.room);
          return;
        }
        socket.once('roomJoined', ({ room }) => resolve(room));
      });
    });
  },

  sendMessage: (content, type = 'message') => {
    const { socket } = get();
    if (!socket) {
      return;
    }
    socket.emit('chatMessage', { content, type });
  },

  startGame: () => {
    const { socket } = get();
    socket?.emit('startGame');
  },

  rollDice: () => {
    const { socket } = get();
    socket?.emit('rollDice');
  },

  newRound: () => {
    const { socket } = get();
    socket?.emit('newRound');
  },

  bid: (quantity, value) => {
    const { socket } = get();
    socket?.emit('bid', { quantity, value });
  },

  challenge: () => {
    const { socket } = get();
    socket?.emit('challenge');
  }
}));
