export const GAME_DEFINITIONS = [
    {
        id: 'liars-dice',
        name: "Liar's Dice",
        description: 'Classic bluffing dice game with server-authoritative rules.',
        supports: ['wild', 'no-wild', 'custom-dice', 'custom-timer']
    }
];
export function createRoomCode() {
    return Math.floor(10000 + Math.random() * 90000).toString();
}
export function shuffleDice() {
    return Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
}
export function getInitialLiarDiceState(players) {
    return {
        round: 1,
        currentTurn: players[0]?.playerId ?? '',
        currentBid: null,
        players: players.map((player) => ({
            playerId: player.playerId,
            dice: shuffleDice(),
            rolled: true,
            eliminated: false
        })),
        phase: 'rolling',
        lastActionAt: new Date().toISOString(),
        winnerId: null
    };
}
export function validateBid(quantity, value, previous) {
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
