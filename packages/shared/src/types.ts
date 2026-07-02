export type PlayerStatus = 'connected' | 'disconnected' | 'kicked';

export interface Player {
  id: string;
  name: string;
  roomId: string;
  isHost: boolean;
  isBot?: boolean;
  status: PlayerStatus;
  joinedAt: string;
  avatar: string;
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  name: string;
  game: 'liars-dice';
  status: 'lobby' | 'playing' | 'finished';
  createdAt: string;
  settings: RoomSettings;
  players: Player[];
}

export interface RoomSettings {
  maxPlayers: number;
  diceCount: number;
  turnTimeSeconds: number;
  wildMode: boolean;
  ruleSet: 'standard' | 'wild';
  roundStartMode: 'random' | 'loser';
}

export interface ChatMessage {
  id: string;
  roomId: string;
  playerId: string;
  playerName: string;
  content: string;
  type: 'message' | 'emoji' | 'reaction';
  createdAt: string;
}

export interface LiarDiceState {
  round: number;
  currentTurn: string;
  currentBid: { value: number; quantity: number } | null;
  lastBidderId: string | null;
  players: Array<{
    playerId: string;
    dice: number[];
    rolled: boolean;
    eliminated: boolean;
  }>;
  phase: 'bidding' | 'challenge' | 'finished';
  lastActionAt: string;
  winnerId: string | null;
  diceCount: number;
  rerollCountByPlayer: Record<string, number>;
  wildMode: boolean;
  roundStartMode: 'random' | 'loser';
  lastRoundLoserId: string | null;
  lastRoundPunishment: 'drink' | null;
  revealed: boolean;
  revealedAt: string | null;
}

export interface GameState {
  roomId: string;
  game: 'liars-dice';
  state: LiarDiceState;
}

export interface SocketClientEvents {
  createRoom: (payload: { name?: string; playWithBot?: boolean }) => void;
  joinRoom: (payload: { code: string; name: string }) => void;
  leaveRoom: () => void;
  startGame: () => void;
  updateRoomSettings: (payload: { settings: Partial<RoomSettings> }) => void;
  rollDice: () => void;
  bid: (payload: { quantity: number; value: number }) => void;
  challenge: () => void;
  nextTurn: () => void;
  kickPlayer: (payload: { playerId: string }) => void;
  transferHost: (payload: { playerId: string }) => void;
  changeGame: (payload: { game: 'liars-dice' }) => void;
  chatMessage: (payload: { content: string; type?: 'message' | 'emoji' | 'reaction' }) => void;
  reconnect: (payload: { roomCode: string; playerId: string }) => void;
  syncState: () => void;
}

export interface SocketServerEvents {
  roomCreated: (payload: { room: Room; player: Player }) => void;
  roomJoined: (payload: { room: Room; player: Player }) => void;
  roomUpdated: (payload: { room: Room }) => void;
  gameStarted: (payload: { gameState: GameState; room: Room }) => void;
  gameUpdated: (payload: { gameState: GameState; room: Room }) => void;
  chatReceived: (payload: { message: ChatMessage }) => void;
  playerKicked: (payload: { playerId: string }) => void;
  hostTransferred: (payload: { room: Room }) => void;
  error: (payload: { message: string }) => void;
  reconnectSuccess: (payload: { room: Room; player: Player; gameState?: GameState }) => void;
}
