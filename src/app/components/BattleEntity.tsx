// components/BattleEntity.tsx
import React from 'react';
import { getCardIcon } from '../utils';

// Khai báo kiểu dữ liệu cho Entity
interface EntityProps {
  entity: {
    id: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    name: string;
    side: 'top' | 'bottom';
  };
}

export default function BattleEntity({ entity }: EntityProps) {
  return (
    <div
      className="absolute flex flex-col items-center transition-all duration-150 ease-linear animate-[popIn_0.3s_ease-out]"
      style={{
        left: `${entity.x}%`,
        top: `${entity.y}%`,
        transform: 'translate(-50%, -100%) translateZ(20px)',
        zIndex: Math.floor(entity.y),
        filter: entity.name.includes('Hut') ? `grayscale(${100 - (entity.hp / entity.maxHp) * 100}%) opacity(${0.4 + (entity.hp / entity.maxHp) * 0.6})` : 'none'
      }}
    >
      {/* Entity Body */}
      <div className={`relative w-12 h-16 rounded-lg border-2 shadow-[0_10px_20px_rgba(0,0,0,0.5)] flex flex-col items-center justify-between p-1 overflow-hidden backdrop-blur-md
        ${entity.side === 'bottom'
          ? 'bg-gradient-to-b from-cyan-600/90 to-blue-800/90 border-cyan-300'
          : 'bg-gradient-to-b from-rose-600/90 to-red-900/90 border-rose-300'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>
        <div className="text-[9px] text-white font-bold uppercase truncate w-full text-center bg-black/40 py-0.5 rounded-sm z-10">
          {entity.name}
        </div>
        <div className="text-2xl mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-10">{getCardIcon(entity.name)}</div>

        {/* Health Bar */}
        <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden z-10 border border-black/50">
          <div className={`h-full ${entity.side === 'bottom' ? 'bg-green-400' : 'bg-red-400'}`} style={{ width: `${(entity.hp / entity.maxHp) * 100}%` }}></div>
        </div>
      </div>

      {/* 3D Shadow */}
      <div className="w-10 h-3 bg-black/50 rounded-[100%] blur-[3px] -mt-1.5 scale-x-125"></div>
    </div>
  );
}