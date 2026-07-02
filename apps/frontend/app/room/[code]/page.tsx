'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Dice3D } from './dice-3d';
import { countMatchingDice } from '@shared/game';

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const {
    room,
    player,
    gameState,
    messages,
    sendMessage,
    startGame,
    rollDice,
    newRound,
    bid,
    challenge,
    connect,
  } = useStore();
  const [message, setMessage] = useState('');
  const [bidQty, setBidQty] = useState(1);
  const [bidValue, setBidValue] = useState(1);
  const [isShaking, setIsShaking] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setTheme(storedTheme);
      document.documentElement.dataset.theme = storedTheme;
      return;
    }
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
    const initial = prefersDark ? 'dark' : 'light';
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem('theme', nextTheme);
  };

  const isMyTurn = Boolean(player && gameState && gameState.state.currentTurn === player.id);

  const lastBidder = useMemo(() => {
    if (!gameState || !room || !gameState.state.currentBid || !gameState.state.lastBidderId) {
      return null;
    }
    return room.players.find((item) => item.id === gameState.state.lastBidderId) || null;
  }, [gameState, room]);

  const currentTurnPlayer = useMemo(() => {
    if (!room?.players || !gameState) {
      return null;
    }
    return room.players.find((item) => item.id === gameState.state.currentTurn) || null;
  }, [room, gameState]);

  const currentActionMessage = useMemo(() => {
    if (!gameState) {
      return 'รอเริ่มเกม';
    }

    if (gameState.state.revealed) {
      return 'เปิดดูเต๋าทุกคนแล้ว';
    }

    if (gameState.state.currentBid) {
      return `${lastBidder?.name ?? 'ผู้เล่น'} เรียก ${gameState.state.currentBid.quantity} ดอก ${gameState.state.currentBid.value}`;
    }

    return 'ยังไม่มีใครเรียกแต้ม';

    return 'รอเล่นต่อ';
  }, [gameState, lastBidder]);

  const canRollDice = Boolean(
    isMyTurn &&
      gameState &&
      gameState.state.phase === 'bidding' &&
      (gameState.state.rerollCountByPlayer?.[player?.id ?? ''] ?? 0) < 2 &&
      !gameState.state.revealed
  );

  const canBid = Boolean(isMyTurn && gameState && gameState.state.phase === 'bidding' && !gameState.state.revealed);
  const canChallenge = Boolean(isMyTurn && gameState && gameState.state.currentBid && !gameState.state.revealed);

  const playerView = useMemo(() => {
    if (!gameState || !player) {
      return null;
    }
    return gameState.state.players.find((item: { playerId: string; dice: number[]; rolled: boolean; eliminated: boolean }) => item.playerId === player.id);
  }, [gameState, player]);

  const otherPlayers = useMemo(() => {
    if (!room?.players || !gameState) {
      return [];
    }
    return room.players.filter((item) => item.id !== player?.id);
  }, [room, gameState, player]);

  const challengeSummary = useMemo(() => {
    if (!gameState || !room || !gameState.state.revealed || !gameState.state.lastRoundLoserId) {
      return null;
    }
    const loser = room.players.find((item) => item.id === gameState.state.lastRoundLoserId);
    return loser ? `${loser.name} ต้องดื่ม` : 'ผู้เล่นที่ถูกคัดค้านต้องดื่ม';
  }, [gameState, room]);

  const currentBidTotal = useMemo(() => {
    if (!gameState?.state.currentBid) {
      return null;
    }
    return gameState.state.players.reduce((count, playerState) => {
      return count + countMatchingDice(playerState.dice, gameState.state.currentBid!.value, gameState.state.wildMode);
    }, 0);
  }, [gameState]);

  const handleRollDice = () => {
    if (!canRollDice) return;
    setIsShaking(true);
    rollDice();
    window.setTimeout(() => setIsShaking(false), 650);
  };

  return (
    <main className="min-h-screen bg-[color:var(--page-bg)] text-[color:var(--text-primary)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-5 shadow-2xl shadow-black/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">ห้อง</p>
              <h1 className="mt-2 text-3xl font-bold text-[color:var(--text-primary)]">{room?.code || params.code}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full bg-[color:var(--panel)] px-4 py-2 text-sm font-semibold text-[color:var(--text-secondary)] ring-1 ring-[color:var(--border-soft)]">
                {room?.status || 'lobby'}
              </div>
              <button onClick={toggleTheme} className="rounded-full bg-[color:var(--accent)] px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)] transition hover:brightness-110">
                {theme === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด'}
              </button>
            </div>
          </div>
        </motion.header>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <motion.section initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 rounded-[32px] border border-[color:var(--border-soft)] bg-[color:var(--panel)] p-5 shadow-2xl shadow-black/10">
            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">สถานะเกม</p>
                <h2 className="text-3xl font-semibold text-[color:var(--text-primary)]">
                  {gameState
                    ? gameState.state.revealed
                      ? 'ผลเปิดเต๋า'
                      : gameState.state.currentBid
                      ? 'รอเรียกต่อหรือคัดค้าน'
                      : 'รอคำประกาศ'
                    : 'รอเริ่มเกม'}
                </h2>
                <p className="max-w-xl text-sm leading-6 text-[color:var(--text-secondary)]">{currentActionMessage}</p>
              </div>
              <div className="space-y-3 rounded-[28px] bg-[color:var(--surface)] p-4 ring-1 ring-[color:var(--border-soft)]">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">ตาถัดไป</p>
                  <p className="mt-2 text-xl font-semibold text-[color:var(--text-primary)]">{isMyTurn ? 'คุณ' : currentTurnPlayer?.name || 'ยังไม่มี'}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[24px] bg-[color:var(--surface)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-secondary)]">รอบที่</p>
                    <p className="mt-2 text-lg font-semibold text-[color:var(--text-primary)]">{gameState?.state.round ?? '-'}</p>
                  </div>
                  <div className="rounded-[24px] bg-[color:var(--surface)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-secondary)]">ผู้เรียกล่าสุด</p>
                    <p className="mt-2 text-lg font-semibold text-[color:var(--text-primary)]">{lastBidder?.name ?? 'ไม่มี'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[28px] bg-[color:var(--surface)] p-4 ring-1 ring-[color:var(--border-soft)]">
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">การเรียกแต้มล่าสุด</p>
                <p className="mt-3 text-2xl font-semibold text-[color:var(--text-primary)]">
                  {gameState?.state.currentBid ? `${gameState.state.currentBid.quantity} ดอก ${gameState.state.currentBid.value}` : 'ไม่มีใครเรียกแต้ม'}
                </p>
              </div>
              <div className="rounded-[28px] bg-[color:var(--surface)] p-4 ring-1 ring-[color:var(--border-soft)]">
                <p className="text-xs uppercase tracking-[0.24em] text-rose-300">สถานะคัดค้าน</p>
                <p className="mt-3 text-2xl font-semibold text-[color:var(--text-primary)]">{challengeSummary ?? 'ยังไม่มีการคัดค้าน'}</p>
              </div>
            </div>

            {playerView ? (
              <div className="rounded-[28px] bg-[color:var(--surface)] p-4 ring-1 ring-[color:var(--border-soft)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">มุมมองของคุณ</p>
                    <p className="mt-2 text-lg font-semibold text-[color:var(--text-primary)]">{player?.name}</p>
                  </div>
                  <div className="rounded-full bg-[color:var(--panel)] px-3 py-2 text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                    เขย่าแล้ว {gameState?.state.rerollCountByPlayer?.[player?.id ?? ''] ?? 0}/2
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {playerView.dice.map((die, index) => (
                    <Dice3D key={`${player?.id ?? 'local'}-${index}`} value={die} size={50} shake={isShaking} />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-[28px] bg-[color:var(--panel)]/80 p-4 ring-1 ring-[color:var(--border-soft)]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">ปุ่มควบคุม</p>
                <span className="text-xs text-[color:var(--text-secondary)]">ใช้งานได้เฉพาะรอบของคุณ</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button onClick={startGame} className="rounded-3xl bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--surface)] px-4 py-3 text-sm font-semibold text-[color:var(--text-primary)] shadow-lg shadow-black/10 transition hover:brightness-110">
                  เริ่มเกม
                </button>
                <button disabled={!canRollDice} onClick={handleRollDice} className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${canRollDice ? 'bg-[color:var(--accent)] text-[color:var(--text-primary)] shadow-md shadow-black/10 hover:brightness-110' : 'cursor-not-allowed bg-[color:var(--panel)] text-[color:var(--text-secondary)]'}`}>
                  เขย่าเต๋าใหม่
                </button>
                <button onClick={newRound} className="rounded-3xl border border-[color:var(--accent)] bg-[color:var(--panel)] px-4 py-3 text-sm font-semibold text-[color:var(--accent)] transition hover:bg-[color:var(--surface)]">
                  เริ่มรอบใหม่
                </button>
                <button disabled={!canBid} onClick={() => bid(bidQty, bidValue)} className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${canBid ? 'border border-[color:var(--accent)] text-[color:var(--accent)] hover:bg-[color:var(--surface)]' : 'cursor-not-allowed border border-[color:var(--border-soft)] text-[color:var(--text-secondary)] bg-[color:var(--panel)]'}`}>
                  เสนอแต้ม
                </button>
                <button disabled={!canChallenge} onClick={challenge} className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${canChallenge ? 'border border-rose-400 text-rose-400 hover:bg-rose-500/10' : 'cursor-not-allowed border border-[color:var(--border-soft)] text-[color:var(--text-secondary)] bg-[color:var(--panel)]'}`}>
                  คัดค้าน
                </button>
              </div>

              <div className="mt-4 space-y-4 text-[color:var(--text-primary)]">
              <div className="rounded-3xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-4">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--text-secondary)]">หน้า</p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6].map((face) => (
                    <button
                      key={face}
                      type="button"
                      onClick={() => setBidValue(face)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${bidValue === face ? 'bg-[color:var(--accent)] text-[color:var(--text-primary)]' : 'bg-[color:var(--panel)] text-[color:var(--text-primary)] hover:bg-[color:var(--surface)]'}`}
                    >
                      {face}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-4">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--text-secondary)]">จำนวน</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 15 }, (_, index) => index + 1).map((quantity) => (
                    <button
                      key={quantity}
                      type="button"
                      onClick={() => setBidQty(quantity)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${bidQty === quantity ? 'bg-[color:var(--accent)] text-[color:var(--text-primary)]' : 'bg-[color:var(--panel)] text-[color:var(--text-primary)] hover:bg-[color:var(--surface)]'}`}
                    >
                      {quantity}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            </div>

            {gameState?.state.revealed ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] border border-rose-500/20 bg-[color:var(--surface)] p-5 shadow-2xl shadow-black/10">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-rose-300">เปิดดูเต๋า</p>
                    <h3 className="mt-2 text-2xl font-semibold text-[color:var(--text-primary)]">ผลการคัดค้าน</h3>
                  </div>
                  <div className="rounded-full bg-rose-500/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                    {gameState.state.currentBid ? `${gameState.state.currentBid.quantity} ดอก ${gameState.state.currentBid.value}` : 'ไม่มีคำเรียก'}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {room?.players?.map((item) => {
                    const revealPlayer = gameState.state.players.find((playerState) => playerState.playerId === item.id);
                    return (
                      <div key={item.id} className="rounded-[24px] border border-rose-500/10 bg-[color:var(--surface)] p-4">
                        <div className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                          <span>{item.name}</span>
                          {gameState.state.lastRoundLoserId === item.id ? (
                            <span className="rounded-full bg-rose-500/20 px-2 py-1 text-[color:var(--text-primary)]">แพ้</span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {revealPlayer?.dice.map((die, index) => (
                            <Dice3D key={`${item.id}-${index}`} value={die} size={42} highlight />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {currentBidTotal !== null ? (
                  <div className="mt-4 rounded-[24px] bg-[color:var(--surface)] p-4 text-sm text-[color:var(--text-primary)]">
                    <p>รวมจำนวน {gameState.state.currentBid?.value} ทั้งหมดในกลุ่ม: {currentBidTotal} ตัว</p>
                    <p className="mt-1 text-[color:var(--text-secondary)]">{currentBidTotal >= (gameState.state.currentBid?.quantity ?? 0) ? 'คำเรียกเป็นจริง' : 'คำเรียกไม่เป็นจริง'}</p>
                  </div>
                ) : null}
              </motion.div>
            ) : null}
          </motion.section>

          <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-[32px] border border-[color:var(--border-soft)] bg-[color:var(--panel)] p-5 shadow-2xl shadow-black/10">
            <h2 className="mb-4 text-xl font-semibold text-[color:var(--text-primary)]">แชท</h2>
            <div className="flex h-[32rem] flex-col gap-3 overflow-y-auto rounded-[28px] border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-4">
              {messages.map((item) => (
                <div key={item.id} className="rounded-3xl bg-[color:var(--surface)] p-3 shadow-sm shadow-black/10">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">{item.playerName}</p>
                  <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{item.content}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 rounded-3xl border border-[color:var(--border-soft)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent)]"
                placeholder="พิมพ์ข้อความ..."
              />
              <button onClick={() => { sendMessage(message); setMessage(''); }} className="rounded-3xl bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-[color:var(--text-primary)] transition hover:brightness-110">
                ส่ง
              </button>
            </div>
          </motion.section>
        </div>
      </div>
    </main>
  );
}
