import test from 'node:test';
import assert from 'node:assert/strict';
import { applyChallengeOutcome, getInitialLiarDiceState, resolveChallenge, rerollPlayerDice, validateBid } from './game.js';

test('validateBid accepts a larger quantity or higher value', () => {
  assert.equal(validateBid(2, 3, null), true);
  assert.equal(validateBid(2, 3, { quantity: 2, value: 2 }), true);
  assert.equal(validateBid(2, 2, { quantity: 2, value: 3 }), false);
});

test('resolveChallenge removes the bidder when the bid is false', () => {
  const state = getInitialLiarDiceState([
    { playerId: 'p1' },
    { playerId: 'p2' }
  ], 2);

  state.currentTurn = 'p2';
  state.currentBid = { quantity: 2, value: 6 } as { quantity: number; value: number };
  state.lastBidderId = 'p1';
  state.players[0].dice = [1, 1];
  state.players[1].dice = [2, 2];

  const resolved = resolveChallenge(state, ['p1', 'p2'], 'p2');
  assert.equal(resolved.loserId, 'p1');
  assert.equal(resolved.remainingPlayers.length, 1);
});

test('rerollPlayerDice is limited to two rerolls per player per round', () => {
  const state = getInitialLiarDiceState([{ playerId: 'p1' }], 2);
  const first = rerollPlayerDice(state, 'p1');
  const second = rerollPlayerDice(state, 'p1');
  const third = rerollPlayerDice(state, 'p1');

  assert.equal(first, true);
  assert.equal(second, true);
  assert.equal(third, false);
});

test('applyChallengeOutcome marks the round as revealed and finished when a challenge resolves', () => {
  const state = getInitialLiarDiceState([{ playerId: 'p1' }, { playerId: 'p2' }], 2);
  state.currentTurn = 'p2';
  state.lastBidderId = 'p1';
  state.currentBid = { quantity: 2, value: 6 };
  state.players[0].dice = [1, 1];
  state.players[1].dice = [2, 2];

  const resolved = applyChallengeOutcome(state, ['p1', 'p2'], 'p2');

  assert.equal(resolved.loserId, 'p1');
  assert.equal(state.phase, 'finished');
  assert.equal(state.revealed, true);
  assert.equal(state.lastRoundLoserId, 'p1');
  assert.equal(state.lastRoundPunishment, 'drink');
});
