// components/BattleEffects.tsx
import React from 'react';

interface BattleEffectsProps {
  attacks?: any[];
}

export default function BattleEffects({ attacks }: BattleEffectsProps) {
  if (!attacks || attacks.length === 0) return null;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-[100] overflow-visible">
      {attacks.map((attack: any, i: number) => {
        const isEnemy = attack.targetId.includes('bottom') || attack.targetId.includes('p1');
        return (
          <line
            key={i}
            x1={`${attack.x1}%`}
            y1={`${attack.y1}%`}
            x2={`${attack.x2}%`}
            y2={`${attack.y2}%`}
            stroke={isEnemy ? '#f43f5e' : '#06b6d4'}
            strokeWidth="3"
            strokeDasharray="8,8"
            className="opacity-90 animate-[laser_0.4s_linear_infinite]"
            style={{ filter: `drop-shadow(0 0 4px ${isEnemy ? '#f43f5e' : '#06b6d4'})` }}
          />
        );
      })}
    </svg>
  );
}
