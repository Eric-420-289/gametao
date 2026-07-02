'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';

export default function HomePage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [hostName, setHostName] = useState('');
  const [customRoomCode, setCustomRoomCode] = useState('');
  const [playWithBot, setPlayWithBot] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const { createRoom, joinRoom, connect } = useStore();

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setTheme(storedTheme);
    } else if (window.matchMedia?.('(prefers-color-scheme: dark)')?.matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const handleCreate = async () => {
    const guestName = playerName || hostName || 'Host';
    const room = await createRoom(guestName, playWithBot, customRoomCode || undefined);
    if (room) {
      router.push(`/room/${room.code}`);
    }
  };

  const handleJoin = async () => {
    if (!roomCode || !playerName) {
      return;
    }
    const room = await joinRoom(roomCode, playerName);
    if (room) {
      router.push(`/room/${room.code}`);
    }
  };

  return (
    <main className="min-h-screen bg-[color:var(--page-bg)] p-4 text-[color:var(--text-primary)] transition-colors duration-300">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="mb-6 flex flex-col gap-4 text-center">
            <div className="mx-auto rounded-full bg-cyan-500/10 p-6 text-5xl">🎲</div>
            <h1 className="text-4xl font-bold">Liar Dice Online</h1>
            <p className="mx-auto max-w-xl text-sm text-[color:var(--text-secondary)]">สร้างโฮมเกมของคุณด้วยชื่อ, รหัสห้อง หรือเข้าร่วมกับเพื่อนง่าย ๆ</p>
            <div className="flex items-center justify-center gap-3 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--panel)] px-4 py-2 text-sm text-[color:var(--text-secondary)]">
              <span>ธีม</span>
              <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="rounded-full bg-cyan-500 px-3 py-1 text-slate-950 transition hover:bg-cyan-400">
                {theme === 'light' ? 'สลับไปโหมดมืด' : 'สลับไปโหมดสว่าง'}
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4 rounded-[28px] border border-[color:var(--border-soft)] bg-[color:var(--panel)] p-5">
              <h2 className="text-lg font-semibold">สร้างห้องใหม่</h2>
              <div className="grid gap-3">
                <input value={hostName} onChange={(e) => setHostName(e.target.value)} placeholder="ชื่อโฮสต์ (เช่น นายแดง)" className="w-full rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--input-bg)] px-4 py-3 text-[color:var(--text-primary)] outline-none" />
                <input value={customRoomCode} onChange={(e) => setCustomRoomCode(e.target.value)} placeholder="รหัสห้อง (ไม่บังคับ)" className="w-full rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--input-bg)] px-4 py-3 text-[color:var(--text-primary)] outline-none" />
                <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--panel)] px-4 py-3 text-sm">
                  <input type="checkbox" checked={playWithBot} onChange={(e) => setPlayWithBot(e.target.checked)} className="h-4 w-4 rounded border-[color:var(--border-soft)] bg-[color:var(--input-bg)]" />
                  <span>เล่นกับบอท</span>
                </label>
                <button onClick={handleCreate} className="rounded-2xl bg-cyan-500 px-4 py-4 text-lg font-semibold text-slate-950 transition hover:bg-cyan-400">
                  สร้างห้อง
                </button>
              </div>
            </div>

            <div className="space-y-4 rounded-[28px] border border-[color:var(--border-soft)] bg-[color:var(--panel)] p-5">
              <h2 className="text-lg font-semibold">เข้าร่วมห้อง</h2>
              <div className="grid gap-3">
                <input value={roomCode} onChange={(e) => setRoomCode(e.target.value)} placeholder="รหัสห้อง" className="w-full rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--input-bg)] px-4 py-3 text-[color:var(--text-primary)] outline-none" />
                <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="ชื่อของคุณ" className="w-full rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--input-bg)] px-4 py-3 text-[color:var(--text-primary)] outline-none" />
                <button onClick={handleJoin} className="rounded-2xl border border-cyan-400 px-4 py-4 font-semibold text-cyan-500 transition hover:bg-cyan-50/70">
                  เข้าร่วมห้อง
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
