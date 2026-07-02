import express from 'express';
import http from 'node:http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { applyChallengeOutcome, countMatchingDice, createRoomCode, getInitialLiarDiceState, resetRound, rerollPlayerDice, validateBid } from '@shared/game';
import type { ChatMessage, GameState, Player, Room, RoomSettings } from '@shared/types';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

const rooms = new Map<string, Room>();
const players = new Map<string, Player>();
const gameStates = new Map<string, GameState>();
const chatMessages = new Map<string, ChatMessage[]>();
const botActionTimers = new Map<string, NodeJS.Timeout>();

function getRoomSettings(settings?: Partial<RoomSettings>): RoomSettings {
  return {
    maxPlayers: 8,
    diceCount: 5,
    turnTimeSeconds: 30,
    wildMode: true,
    ruleSet: 'standard',
    roundStartMode: 'random',
    ...settings
  };
}

function isRoomCodeTaken(code: string) {
  return Array.from(rooms.values()).some((item) => item.code === code);
}

function createUniqueRoomCode() {
  let code = createRoomCode();
  while (isRoomCodeTaken(code)) {
    code = createRoomCode();
  }
  return code;
}

function clearPendingBotAction(roomId: string) {
  const timer = botActionTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    botActionTimers.delete(roomId);
  }
}

function getNextTurnId(room: Room, currentTurnId: string) {
  const currentIndex = room.players.findIndex((item: Player) => item.id === currentTurnId);
  const nextPlayer = room.players[(currentIndex + 1) % room.players.length];
  return nextPlayer?.id || currentTurnId;
}

function getNextBotBid(state: GameState['state']) {
  if (!state.currentBid) {
    return null;
  }

  const totalDice = state.players.reduce((sum, playerState) => sum + playerState.dice.length, 0);
  const maxQuantity = Math.max(state.diceCount, totalDice);

  if (state.currentBid.quantity < maxQuantity) {
    if (state.currentBid.value < 6) {
      return { quantity: state.currentBid.quantity, value: state.currentBid.value + 1 };
    }
    return { quantity: state.currentBid.quantity + 1, value: 1 };
  }

  if (state.currentBid.value < 6) {
    return { quantity: state.currentBid.quantity, value: state.currentBid.value + 1 };
  }

  return null;
}

function emitGameUpdate(room: Room, gameState: GameState) {
  io.to(room.id).emit('gameUpdated', { gameState, room });
  scheduleBotTurn(room.id);
}

function scheduleRoundReset(roomId: string, loserId: string) {
  setTimeout(() => {
    const latestRoom = rooms.get(roomId);
    const latestState = gameStates.get(roomId);
    if (!latestRoom || !latestState || latestRoom.status !== 'playing') {
      return;
    }
    resetRound(latestState.state, latestRoom.players.map((item: Player) => item.id), latestRoom.settings.roundStartMode, loserId);
    latestState.state.revealed = false;
    latestState.state.revealedAt = null;
    latestState.state.phase = 'bidding';
    latestState.state.lastActionAt = new Date().toISOString();
    io.to(latestRoom.id).emit('gameUpdated', { gameState: latestState, room: latestRoom });
    scheduleBotTurn(latestRoom.id);
  }, 1400);
}

function applyChallengeResolution(room: Room, gameState: GameState, challengerId: string) {
  const resolved = applyChallengeOutcome(gameState.state, room.players.map((item: Player) => item.id), challengerId);
  if (resolved.loserId) {
    room.status = 'playing';
    gameState.state.lastActionAt = new Date().toISOString();
    io.to(room.id).emit('gameUpdated', { gameState, room });
  }
}

function scheduleBotTurn(roomId: string) {
  clearPendingBotAction(roomId);
  const timer = setTimeout(() => {
    botActionTimers.delete(roomId);
    const room = rooms.get(roomId);
    const gameState = gameStates.get(roomId);
    if (!room || !gameState || room.status !== 'playing' || gameState.state.phase !== 'bidding' || gameState.state.revealed) {
      return;
    }

    const currentPlayer = room.players.find((item: Player) => item.id === gameState.state.currentTurn);
    if (!currentPlayer?.isBot) {
      return;
    }

    const playerState = gameState.state.players.find((item: { playerId: string; dice: number[]; rolled: boolean; eliminated: boolean }) => item.playerId === currentPlayer.id);
    if (!playerState || playerState.eliminated) {
      return;
    }

    const runBotBid = () => {
      const bid = getNextBotBid(gameState.state);
      if (!bid) {
        applyChallengeResolution(room, gameState, currentPlayer.id);
        return;
      }
      gameState.state.currentBid = bid;
      gameState.state.lastBidderId = currentPlayer.id;
      gameState.state.currentTurn = getNextTurnId(room, gameState.state.currentTurn);
      gameState.state.lastActionAt = new Date().toISOString();
      io.to(room.id).emit('gameUpdated', { gameState, room });
    };

    if (!gameState.state.currentBid) {
      const quantity = Math.max(1, Math.min(gameState.state.diceCount, 1 + Math.floor(Math.random() * 2)));
      const value = Math.max(1, Math.min(6, 1 + Math.floor(Math.random() * 6)));
      gameState.state.currentBid = { quantity, value };
      gameState.state.lastBidderId = currentPlayer.id;
      gameState.state.currentTurn = getNextTurnId(room, gameState.state.currentTurn);
      gameState.state.lastActionAt = new Date().toISOString();
      io.to(room.id).emit('gameUpdated', { gameState, room });
      return;
    }

    const ownCount = countMatchingDice(playerState.dice, gameState.state.currentBid.value, gameState.state.wildMode);
    const totalDice = gameState.state.players.reduce((sum, playerState) => sum + playerState.dice.length, 0);
    const expectedOtherCount = Math.round((totalDice - playerState.dice.length) / 6);
    const threshold = expectedOtherCount + ownCount + (gameState.state.currentBid.value === 1 ? 0 : 1);
    const shouldChallenge =
      gameState.state.currentBid.quantity > threshold ||
      (gameState.state.currentBid.quantity === threshold && Math.random() < 0.05);
    if (shouldChallenge) {
      applyChallengeResolution(room, gameState, currentPlayer.id);
      return;
    }
    runBotBid();
  }, 1000);
  botActionTimers.set(roomId, timer);
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, message: 'liar-dice-online backend is running' });
});

app.get('/api/rooms/:code', (req, res) => {
  const room = Array.from(rooms.values()).find((item) => item.code === req.params.code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({ room });
});

app.post('/api/rooms', (req, res) => {
  const requestedCode = typeof req.body.code === 'string' && req.body.code.trim() !== '' ? req.body.code.trim() : undefined;
  const roomCode = requestedCode && !isRoomCodeTaken(requestedCode) ? requestedCode : createUniqueRoomCode();
  const roomId = uuidv4();
  const hostId = uuidv4();
  const playWithBot = Boolean(req.body.playWithBot);
  const hostName = req.body.playerName || 'Host';
  const settings: RoomSettings = getRoomSettings({
    wildMode: true,
    roundStartMode: 'random'
  });
  const hostPlayer: Player = {
    id: hostId,
    name: hostName,
    roomId,
    isHost: true,
    status: 'connected',
    joinedAt: new Date().toISOString(),
    avatar: '🧑'
  };
  const room: Room = {
    id: roomId,
    code: roomCode,
    hostId,
    name: req.body.roomName || `${hostName}'s room`,
    game: 'liars-dice',
    status: 'lobby',
    createdAt: new Date().toISOString(),
    settings,
    players: [hostPlayer]
  };
  if (playWithBot) {
    const botPlayer: Player = {
      id: uuidv4(),
      name: 'AI Bot',
      roomId,
      isHost: false,
      isBot: true,
      status: 'connected',
      joinedAt: new Date().toISOString(),
      avatar: '🤖'
    };
    room.players.push(botPlayer);
    players.set(botPlayer.id, botPlayer);
  }
  rooms.set(roomId, room);
  players.set(hostPlayer.id, hostPlayer);
  chatMessages.set(roomId, []);
  res.json({ room });
});

io.on('connection', (socket) => {
  socket.on('createRoom', ({ playerName, playWithBot, code }: { playerName?: string; playWithBot?: boolean; code?: string }, callback?: (payload: any) => void) => {
    const requestedCode = typeof code === 'string' && code.trim() !== '' ? code.trim() : undefined;
    if (requestedCode && isRoomCodeTaken(requestedCode)) {
      callback?.({ error: 'รหัสห้องนี้ถูกใช้แล้ว' });
      return;
    }

    const roomCode = requestedCode || createUniqueRoomCode();
    const roomId = uuidv4();
    const hostId = uuidv4();
    const settings: RoomSettings = getRoomSettings({
      wildMode: true,
      roundStartMode: 'random'
    });
    const playerNameValue = playerName || `Host-${Math.floor(Math.random() * 1000)}`;
    const player: Player = {
      id: hostId,
      name: playerNameValue,
      roomId,
      isHost: true,
      status: 'connected',
      joinedAt: new Date().toISOString(),
      avatar: '🧑'
    };
    const room: Room = {
      id: roomId,
      code: roomCode,
      hostId: player.id,
      name: `${playerNameValue}'s room`,
      game: 'liars-dice',
      status: 'lobby',
      createdAt: new Date().toISOString(),
      settings,
      players: [player]
    };
    if (playWithBot) {
      const botPlayer: Player = {
        id: uuidv4(),
        name: 'AI Bot',
        roomId,
        isHost: false,
        isBot: true,
        status: 'connected',
        joinedAt: new Date().toISOString(),
        avatar: '🤖'
      };
      room.players.push(botPlayer);
      players.set(botPlayer.id, botPlayer);
    }
    rooms.set(roomId, room);
    players.set(player.id, player);
    chatMessages.set(roomId, []);
    socket.join(roomId);
    socket.data.playerId = player.id;
    socket.data.roomId = room.id;
    socket.emit('roomCreated', { room, player });
    socket.emit('roomUpdated', { room });
    callback?.({ room, player });
  });

  socket.on('joinRoom', ({ code, name }: { code: string; name: string }, callback?: (payload: any) => void) => {
    const room = Array.from(rooms.values()).find((item) => item.code === code);
    if (!room) {
      callback?.({ error: 'Room not found' });
      return;
    }
    const player: Player = {
      id: uuidv4(),
      name,
      roomId: room.id,
      isHost: false,
      status: 'connected',
      joinedAt: new Date().toISOString(),
      avatar: '🧑'
    };
    room.players.push(player);
    players.set(player.id, player);
    socket.join(room.id);
    socket.data.playerId = player.id;
    socket.data.roomId = room.id;
    socket.emit('roomJoined', { room, player });
    io.to(room.id).emit('roomUpdated', { room });
    callback?.({ room, player });
  });

  socket.on('leaveRoom', () => {
    const player = socket.data.playerId ? players.get(socket.data.playerId) : undefined;
    if (!player) {
      return;
    }
    const room = rooms.get(player.roomId);
    if (room) {
      room.players = room.players.filter((item: Player) => item.id !== player.id);
      players.delete(player.id);
      if (room.players.length === 0) {
        rooms.delete(room.id);
        chatMessages.delete(room.id);
        gameStates.delete(room.id);
      } else if (room.hostId === player.id) {
        const nextHost = room.players[0];
        if (nextHost) {
          room.hostId = nextHost.id;
          nextHost.isHost = true;
        }
      }
      io.to(room.id).emit('roomUpdated', { room });
    }
  });

  socket.on('startGame', () => {
    const player = socket.data.playerId ? players.get(socket.data.playerId) : undefined;
    if (!player || !player.isHost) {
      socket.emit('error', { message: 'Only the host can start the game' });
      return;
    }
    const room = rooms.get(player.roomId);
    if (!room) {
      return;
    }
    const gameState: GameState = {
      roomId: room.id,
      game: 'liars-dice',
      state: getInitialLiarDiceState(room.players.map((item: Player) => ({ playerId: item.id })), room.settings.diceCount, room.settings.wildMode, room.settings.roundStartMode)
    };
    gameStates.set(room.id, gameState);
    room.status = 'playing';
    io.to(room.id).emit('gameStarted', { gameState, room });
    io.to(room.id).emit('roomUpdated', { room });
    scheduleBotTurn(room.id);
  });

  socket.on('rollDice', () => {
    const player = socket.data.playerId ? players.get(socket.data.playerId) : undefined;
    if (!player) {
      return;
    }
    const room = rooms.get(player.roomId);
    if (!room) {
      return;
    }
    const gameState = gameStates.get(room.id);
    if (!gameState) {
      return;
    }

    if (gameState.state.phase !== 'bidding') {
      socket.emit('error', { message: 'ไม่สามารถเขย่าเต๋าในขณะนี้' });
      return;
    }

    if (gameState.state.currentTurn !== player.id) {
      socket.emit('error', { message: 'ไม่ใช่ตาคุณ' });
      return;
    }

    const playerState = gameState.state.players.find((item: { playerId: string; dice: number[]; rolled: boolean; eliminated: boolean }) => item.playerId === player.id);
    if (!playerState) {
      return;
    }

    const rerolled = rerollPlayerDice(gameState.state, player.id);
    if (!rerolled) {
      gameState.state.lastRoundLoserId = player.id;
      gameState.state.lastRoundPunishment = 'drink';
      gameState.state.revealed = true;
      gameState.state.revealedAt = new Date().toISOString();
      gameState.state.phase = 'finished';
      gameState.state.lastActionAt = new Date().toISOString();
      io.to(room.id).emit('gameUpdated', { gameState, room });
      scheduleRoundReset(room.id, player.id);
      return;
    }

    playerState.rolled = true;
    gameState.state.phase = 'bidding';
    gameState.state.lastActionAt = new Date().toISOString();
    emitGameUpdate(room, gameState);
  });

  socket.on('bid', ({ quantity, value }: { quantity: number; value: number }) => {
    const player = socket.data.playerId ? players.get(socket.data.playerId) : undefined;
    if (!player) {
      return;
    }
    const room = rooms.get(player.roomId);
    if (!room) {
      return;
    }
    const gameState = gameStates.get(room.id);
    if (!gameState) {
      return;
    }

    if (gameState.state.phase !== 'bidding') {
      socket.emit('error', { message: 'ไม่สามารถประกาศราคาได้ในขณะนี้' });
      return;
    }

    if (!validateBid(quantity, value, gameState.state.currentBid)) {
      socket.emit('error', { message: 'Invalid bid' });
      return;
    }

    const isPlayersTurn = gameState.state.currentTurn === player.id;
    if (!isPlayersTurn) {
      socket.emit('error', { message: 'ไม่ใช่ตาคุณ' });
      return;
    }

    gameState.state.currentBid = { quantity, value };
    gameState.state.lastBidderId = player.id;
    gameState.state.currentTurn = getNextTurnId(room, gameState.state.currentTurn);
    gameState.state.lastActionAt = new Date().toISOString();
    emitGameUpdate(room, gameState);
  });

  socket.on('newRound', () => {
    const player = socket.data.playerId ? players.get(socket.data.playerId) : undefined;
    if (!player || !player.isHost) {
      socket.emit('error', { message: 'เฉพาะโฮสต์เท่านั้นที่เริ่มรอบใหม่ได้' });
      return;
    }
    const room = rooms.get(player.roomId);
    if (!room) {
      return;
    }
    const gameState = gameStates.get(room.id);
    if (!gameState) {
      return;
    }
    resetRound(gameState.state, room.players.map((item: Player) => item.id), room.settings.roundStartMode, gameState.state.lastRoundLoserId);
    room.status = 'playing';
    emitGameUpdate(room, gameState);
  });

  socket.on('challenge', () => {
    const player = socket.data.playerId ? players.get(socket.data.playerId) : undefined;
    if (!player) {
      return;
    }
    const room = rooms.get(player.roomId);
    if (!room) {
      return;
    }
    const gameState = gameStates.get(room.id);
    if (!gameState) {
      return;
    }

    if (!gameState.state.currentBid || gameState.state.revealed) {
      socket.emit('error', { message: 'ไม่สามารถท้าทายในขณะนี้' });
      return;
    }

    if (gameState.state.currentTurn !== player.id) {
      socket.emit('error', { message: 'ไม่ใช่ตาคุณ' });
      return;
    }

    const resolved = applyChallengeOutcome(gameState.state, room.players.map((item: Player) => item.id), player.id);
    if (resolved.loserId) {
      room.status = 'playing';
      gameState.state.lastActionAt = new Date().toISOString();
      io.to(room.id).emit('gameUpdated', { gameState, room });
    }
  });

  socket.on('chatMessage', ({ content, type = 'message' }: { content: string; type?: 'message' | 'emoji' | 'reaction' }) => {
    const player = socket.data.playerId ? players.get(socket.data.playerId) : undefined;
    if (!player) {
      return;
    }
    const room = rooms.get(player.roomId);
    if (!room) {
      return;
    }
    const message: ChatMessage = {
      id: uuidv4(),
      roomId: room.id,
      playerId: player.id,
      playerName: player.name,
      content,
      type,
      createdAt: new Date().toISOString()
    };
    const messages = chatMessages.get(room.id) || [];
    messages.push(message);
    chatMessages.set(room.id, messages);
    io.to(room.id).emit('chatReceived', { message });
  });

  socket.on('reconnect', ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
    const room = Array.from(rooms.values()).find((item) => item.code === roomCode);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    const player = room.players.find((item: Player) => item.id === playerId);
    if (!player) {
      socket.emit('error', { message: 'Player not found' });
      return;
    }
    player.status = 'connected';
    players.set(player.id, player);
    socket.join(room.id);
    socket.data.playerId = player.id;
    socket.data.roomId = room.id;
    socket.emit('reconnectSuccess', { room, player, gameState: gameStates.get(room.id) });
    socket.emit('roomUpdated', { room });
  });

  socket.on('disconnect', () => {
    const player = socket.data.playerId ? players.get(socket.data.playerId) : undefined;
    if (player) {
      player.status = 'disconnected';
    }
  });
});

const port = Number(process.env.PORT || 4000);
server.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
