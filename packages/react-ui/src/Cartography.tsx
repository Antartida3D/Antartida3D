/** A decorative compass rose, not a bearing or a geographic measurement. */
export function CompassRose({ className = 'chart-compass' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth=".75">
        <circle cx="50" cy="50" r="32" />
        <circle cx="50" cy="50" r="28" />
        <path d="M50 5v90M5 50h90M18 18l64 64M18 82l64-64" />
      </g>
      <g fill="var(--chart-paper)" stroke="currentColor" strokeWidth=".8">
        <path d="M50 15l7 28 28 7-28 7-7 28-7-28-28-7 28-7Z" />
        <path d="M30 30l20 14 20-14-14 20 14 20-20-14-20 14 14-20Z" />
      </g>
      <path className="chart-needle" d="M50 15v35l-7-7Z" />
      <path fill="currentColor" d="M85 50H50l7-7ZM50 85V50l7 7ZM15 50h35l-7 7Z" />
      <circle cx="50" cy="50" r="3" fill="var(--chart-paper)" stroke="currentColor" />
    </svg>
  );
}
