import type { LiarDiceState } from './types.js';

export const GAME_DEFINITIONS = [
  {
    id: 'liars-dice',
    name: "Liar's Dice",
    description: 'Classic bluffing dice game with server-authoritative rules.',
    supports: ['wild', 'no-wild', 'custom-dice', 'custom-timer']
  }
] as const;

export function createRoomCode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

export function shuffleDice(): number[] {
  return Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
}

export function getInitialLiarDiceState(players: Array<{ playerId: string }>, diceCount = 5, wildMode = false, roundStartMode: 'random' | 'loser' = 'random'): LiarDiceState {
  return {
    round: 1,
    currentTurn: players[0]?.playerId ?? '',
    currentBid: null,
    lastBidderId: null as string | null,
    players: players.map((player) => ({
      playerId: player.playerId,
      dice: Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1),
      rolled: true,
      eliminated: false
    })),
    phase: 'bidding' as const,
    lastActionAt: new Date().toISOString(),
    winnerId: null,
    diceCount,
    rerollCountByPlayer: {} as Record<string, number>,
    wildMode,
    roundStartMode,
    lastRoundLoserId: null,
    lastRoundPunishment: null,
    revealed: false,
    revealedAt: null
  };
}

export function validateBid(quantity: number, value: number, previous: { value: number; quantity: number } | null) {
  if (quantity < 1 || value < 1 || value > 6) {
    return false;
  }

  if (!previous) {
    return true;
  }

  if (quantity > previous.quantity) {
    return true;
  }

  if (quantity === previous.quantity && value > previous.value) {
    return true;
  }

  return false;
}

export function rerollPlayerDice(state: LiarDiceState, playerId: string) {
  const current = state.rerollCountByPlayer?.[playerId] ?? 0;
  if (current >= 2) {
    return false;
  }

  const playerState = state.players.find((item) => item.playerId === playerId);
  if (!playerState) {
    return false;
  }

  playerState.dice = Array.from({ length: state.diceCount }, () => Math.floor(Math.random() * 6) + 1);
  state.rerollCountByPlayer = {
    ...(state.rerollCountByPlayer || {}),
    [playerId]: current + 1
  };
  state.lastActionAt = new Date().toISOString();
  return true;
}

export function resetRound(state: LiarDiceState, playerIds: string[], roundStartMode: 'random' | 'loser' = 'random', lastLoserId?: string | null) {
  state.round += 1;
  state.currentTurn = roundStartMode === 'loser' && lastLoserId ? lastLoserId : (roundStartMode === 'random' ? playerIds[Math.floor(Math.random() * playerIds.length)] ?? playerIds[0] ?? '' : playerIds[0] ?? '');
  state.currentBid = null;
  state.lastBidderId = null;
  state.phase = 'bidding';
  state.winnerId = null;
  state.players = state.players.map((player) => ({
    ...player,
    rolled: true,
    eliminated: false
  }));
  state.rerollCountByPlayer = {};
  state.lastActionAt = new Date().toISOString();
  state.revealed = false;
  state.revealedAt = null;
  state.lastRoundLoserId = lastLoserId ?? null;
  state.lastRoundPunishment = 'drink';
  state.players.forEach((player) => {
    player.dice = Array.from({ length: state.diceCount }, () => Math.floor(Math.random() * 6) + 1);
  });
}

export function countMatchingDice(diceValues: number[], value: number, wildMode = false) {
  if (!wildMode) {
    return diceValues.filter((die) => die === value).length;
  }

  return diceValues.reduce((sum, die) => sum + (die === value || die === 1 ? 1 : 0), 0);
}

export function resolveChallenge(state: LiarDiceState, allPlayerIds: string[], challengerId: string) {
  if (!state.currentBid || !state.lastBidderId) {
    return { loserId: null, remainingPlayers: allPlayerIds };
  }

  const bid = state.currentBid;
  const totalDice = state.players.reduce((sum, player) => sum + countMatchingDice(player.dice, bid.value, state.wildMode), 0);
  const bidWasTrue = totalDice >= bid.quantity;
  const loserId = bidWasTrue ? challengerId : state.lastBidderId;
  const remainingPlayers = allPlayerIds.filter((id) => id !== loserId);

  return { loserId, remainingPlayers };
}

export function applyChallengeOutcome(state: LiarDiceState, allPlayerIds: string[], challengerId: string) {
  const resolved = resolveChallenge(state, allPlayerIds, challengerId);
  if (resolved.loserId) {
    state.lastRoundLoserId = resolved.loserId;
    state.lastRoundPunishment = 'drink';
    state.revealed = true;
    state.revealedAt = new Date().toISOString();
    state.phase = 'finished';
  }
  return resolved;
}
