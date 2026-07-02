'use client';

import { motion } from 'framer-motion';

interface Dice3DProps {
  value: number;
  size?: number;
  shake?: boolean;
  highlight?: boolean;
}

const pipPositions: Record<number, Array<[number, number]>> = {
  1: [[0, 0]],
  2: [[-0.35, -0.35], [0.35, 0.35]],
  3: [[-0.35, -0.35], [0, 0], [0.35, 0.35]],
  4: [[-0.35, -0.35], [-0.35, 0.35], [0.35, -0.35], [0.35, 0.35]],
  5: [[-0.35, -0.35], [-0.35, 0.35], [0, 0], [0.35, -0.35], [0.35, 0.35]],
  6: [[-0.35, -0.35], [-0.35, 0], [-0.35, 0.35], [0.35, -0.35], [0.35, 0], [0.35, 0.35]]
};

export function Dice3D({ value, size = 40, shake = false, highlight = false }: Dice3DProps) {
  const pips = pipPositions[value] ?? [];

  return (
    <motion.div
      initial={false}
      animate={
        shake
          ? { rotateX: [0, 22, -18, 0], rotateY: [0, -22, 18, 0], scale: [1, 1.05, 0.98, 1] }
          : { rotateX: 0, rotateY: 0, scale: 1 }
      }
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-[18px] border ${highlight ? 'border-cyan-300 shadow-[0_0_0_3px_rgba(34,211,238,0.12)]' : 'border-amber-200/70'} bg-gradient-to-br from-amber-100 via-amber-50 to-amber-200 shadow-[0_12px_30px_rgba(0,0,0,0.25)]`}
      style={{ width: size, height: size, perspective: 900 }}
    >
      <div className="absolute inset-0 rounded-[18px] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_50%)]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-[62%] w-[62%]">
          {pips.map(([x, y], index) => (
            <span
              key={`${value}-${index}`}
              className="absolute h-2.5 w-2.5 rounded-full bg-slate-900 shadow-sm"
              style={{ left: `calc(50% + ${x * 100}% - 5px)`, top: `calc(50% + ${y * 100}% - 5px)` }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
