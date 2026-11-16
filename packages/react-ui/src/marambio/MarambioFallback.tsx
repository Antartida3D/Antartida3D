import { useEffect, useMemo } from 'react';
import { createSeededRng, marambioBlizzard } from '@antartida/core';

// Tones of the diorama, for the drawing shown when WebGL is not available.
const SKY_TOP = '#BFD6E4';
const SKY_LOW = '#EEF2EE';
const SEA = '#44718F';
const ICE = '#E9F1F4';
const SCARP = '#55504A';
const GROUND = '#857C70';
const GROUND_LIGHT = '#9A9186';
const STRIP = '#A8A49B';
const APRON = '#B9B7B0';
const SNOW = '#F7FAFB';
const ORANGE = '#FF4500';
const ORANGE_DARK = '#C8472A';
const INK = '#1F2A36';
const GLASS = '#C9DBE6';
const CAMO = '#55603F';
const CAMO_SAND = '#A7845F';
const BELLY = '#AAB2B4';
const MARKER = '#FF7A1A';
const FLAG_SKY = '#7FB6DC';
const ENGINE_GREY = '#6F787E';

/** A module of the base seen from the side: wall, gabled roof, door and windows. */
function Module({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y - h} width={w} height={h} fill={ORANGE} stroke={INK} strokeWidth="2" />
      <polygon points={`${x - 4},${y - h} ${x + w / 2},${y - h - h * 0.45} ${x + w + 4},${y - h}`} fill={ORANGE_DARK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {Array.from({ length: Math.max(1, Math.floor(w / 26)) }, (_, i) => (
        <rect key={i} x={x + 10 + i * 26} y={y - h * 0.72} width="9" height="8" fill={GLASS} stroke={INK} strokeWidth="1.2" />
      ))}
      <line x1={x + 4} y1={y + 3} x2={x + w - 4} y2={y + 3} stroke={INK} strokeWidth="2" strokeDasharray="3 9" />
    </g>
  );
}

/**
 * Drawing of the base for devices without WebGL: the same view as the diorama (runway in front,
 * the C-130 on the apron, the hangar behind it, the tower and the row of buildings), flat.
 */
/** Streaks of blowing snow over the drawing, as many as the month's blizzard (a simulation). */
function BlizzardStreaks({ month }: { month: number }) {
  const streaks = useMemo(() => {
    const rng = createSeededRng(160);
    const n = Math.round(90 * marambioBlizzard(month));
    return Array.from({ length: n }, () => [rng() * 980 - 20, 130 + rng() * 420, 18 + rng() * 34] as const);
  }, [month]);
  return (
    <g stroke={SNOW} strokeWidth="2" strokeLinecap="round" opacity="0.85">
      <rect width="960" height="540" fill={SNOW} opacity={0.35 * marambioBlizzard(month)} stroke="none" />
      {streaks.map(([x, y, l], i) => (
        <line key={i} x1={x} y1={y} x2={x + l} y2={y - l * 0.18} />
      ))}
    </g>
  );
}

export function MarambioFallback({ month }: { month: number }) {
  useEffect(() => {
    (window as unknown as { __marambioReady?: boolean }).__marambioReady = true;
  }, []);
  return (
    <div className="orc-fallback" role="img" aria-label="Ilustración de la Base Marambio: la pista, un Hércules C-130 en la plataforma, el hangar, la torre de control y los edificios sobre la meseta">
      <svg className="orc-fallback-svg" viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="mar-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={SKY_TOP} />
            <stop offset="1" stopColor={SKY_LOW} />
          </linearGradient>
        </defs>
        <rect width="960" height="540" fill="url(#mar-sky)" />
        <rect y="150" width="960" height="390" fill={SEA} />
        <polygon points="760,150 800,128 842,134 880,150" fill={ICE} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points="70,160 96,142 150,146 172,160" fill={ICE} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />

        {/* The Irízar at anchor, far off the base */}
        <g stroke={INK} strokeWidth="1.5" strokeLinejoin="round">
          <polygon points="792,174 864,174 872,164 786,164" fill={ORANGE_DARK} />
          <rect x="826" y="152" width="22" height="12" fill={SNOW} />
          <rect x="832" y="145" width="12" height="7" fill={SNOW} />
          <rect x="800" y="158" width="20" height="6" fill={ORANGE_DARK} />
        </g>

        {/* Plateau with its scarp */}
        <polygon points="40,540 60,250 150,186 800,176 905,240 930,540" fill={SCARP} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <polygon points="74,470 96,262 168,204 792,194 884,252 900,470" fill={GROUND} />
        <polygon points="74,470 96,262 168,204 792,194 884,252 900,470" fill="none" stroke={INK} strokeWidth="1.5" opacity="0.5" />
        {[[210, 236, 70], [640, 222, 90], [300, 300, 60], [760, 330, 80], [130, 330, 50]].map(([x, y, w], i) => (
          <ellipse key={i} cx={x} cy={y} rx={w / 2} ry="3.5" fill={SNOW} opacity="0.85" />
        ))}

        {/* Row of buildings and the hangar, behind the apron */}
        <Module x={560} y={262} w={86} h={26} />
        <Module x={662} y={270} w={92} h={24} />
        <Module x={768} y={280} w={78} h={24} />
        <Module x={170} y={258} w={80} h={22} />
        <g>
          <path d="M398,268 L398,232 Q470,170 542,232 L542,268 Z" fill={ORANGE} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M424,268 L424,238 Q470,200 516,238 L516,268 Z" fill={INK} opacity="0.82" />
          {[420, 445, 470, 495, 520].map((x) => (
            <line key={x} x1={x} y1={x === 470 ? 201 : 212} x2={x} y2="232" stroke={ORANGE_DARK} strokeWidth="2" />
          ))}
        </g>

        {/* Apron and the C-130 */}
        <polygon points="250,300 600,292 640,340 220,350" fill={APRON} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" opacity="0.95" />
        <g stroke={INK} strokeWidth="2" strokeLinejoin="round">
          <ellipse cx="420" cy="342" rx="150" ry="5" fill={INK} opacity="0.18" stroke="none" />
          <path d="M300,318 Q292,308 306,304 L500,300 Q532,302 540,314 Q532,328 500,330 L330,332 Q306,330 300,318 Z" fill={CAMO} />
          <path d="M318,326 L500,324 Q526,322 536,316 Q530,328 500,330 L330,332 Z" fill={BELLY} />
          <path d="M360,304 L430,302 L440,318 L372,320 Z" fill={CAMO_SAND} stroke="none" />
          <path d="M534,308 Q546,312 540,320 L530,320 Z" fill={INK} />
          <path d="M300,318 L262,262 L290,262 L330,304 Z" fill={CAMO} />
          <rect x="268" y="268" width="22" height="5" fill={FLAG_SKY} stroke="none" />
          <rect x="270" y="273" width="22" height="5" fill={SNOW} stroke="none" />
          <rect x="273" y="278" width="22" height="5" fill={FLAG_SKY} stroke="none" />
          <rect x="250" y="296" width="150" height="9" rx="3" fill={CAMO} />
          <rect x="356" y="288" width="210" height="11" rx="3" fill={CAMO} />
          {[384, 428, 494, 536].map((x) => (
            <g key={x}>
              <rect x={x - 14} y="297" width="34" height="11" rx="4" fill={ENGINE_GREY} />
              <line x1={x + 22} y1="284" x2={x + 22} y2="322" stroke={INK} strokeWidth="2.5" />
            </g>
          ))}
          <rect x="500" y="306" width="24" height="6" fill={INK} stroke="none" />
          <circle cx="408" cy="336" r="6" fill={INK} />
          <circle cx="424" cy="336" r="6" fill={INK} />
          <circle cx="512" cy="336" r="5" fill={INK} />
        </g>

        {/* Terminal and control tower, by the runway */}
        <Module x={606} y={372} w={104} h={30} />
        <g stroke={INK} strokeWidth="2" strokeLinejoin="round">
          <rect x="578" y="318" width="22" height="54" fill={ORANGE_DARK} />
          <polygon points="568,318 610,318 606,296 572,296" fill={GLASS} />
          <rect x="570" y="290" width="38" height="7" fill={ORANGE_DARK} />
          <line x1="589" y1="290" x2="589" y2="272" />
          <line x1="564" y1="322" x2="614" y2="322" stroke={SNOW} strokeWidth="3" />
        </g>

        {/* Runway in front: graded gravel, no centreline, orange markers */}
        <polygon points="60,420 905,396 930,470 44,500" fill={STRIP} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points="60,420 905,396 908,404 59,429" fill={GROUND_LIGHT} opacity="0.6" />
        {[110, 230, 350, 470, 590, 710, 830].map((x, i) => (
          <rect key={x} x={x} y={412 - i * 3.3} width="9" height="6" fill={MARKER} stroke={INK} strokeWidth="1" />
        ))}
        {[80, 200, 330, 460, 600, 740, 880].map((x, i) => (
          <rect key={x} x={x} y={488 - i * 4.4} width="11" height="7" fill={MARKER} stroke={INK} strokeWidth="1" />
        ))}
        <BlizzardStreaks month={month} />
      </svg>
    </div>
  );
}
