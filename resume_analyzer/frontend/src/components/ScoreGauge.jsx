import React from 'react';

export default function ScoreGauge({ score, size = 180 }) {
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(score || 0, 0), 100);
  const offset = circumference - (pct / 100) * circumference;

  const color = pct >= 75 ? '#16a34a' : pct >= 55 ? '#2563eb' : pct >= 35 ? '#d97706' : '#dc2626';
  const trackColor = pct >= 75 ? '#bbf7d0' : pct >= 55 ? '#bfdbfe' : pct >= 35 ? '#fde68a' : '#fecaca';

  return (
    <div style={{ position:'relative', width:size, height:size }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition:'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{
        position:'absolute', inset:0,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'
      }}>
        <div style={{ fontSize:42, fontWeight:800, color, lineHeight:1 }}>{Math.round(pct)}</div>
        <div style={{ fontSize:11, fontWeight:600, color:'var(--gray-400)', marginTop:3, textTransform:'uppercase', letterSpacing:'0.06em' }}>Match Score</div>
      </div>
    </div>
  );
}
