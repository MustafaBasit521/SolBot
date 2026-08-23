const WIDTH = 300;
const HEIGHT = 60;
const MARGIN = 6;

function buildPath(values: number[]): string {
  if (values.length === 0) return "";
  const step = values.length > 1 ? (WIDTH - MARGIN * 2) / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = MARGIN + i * step;
      const y = HEIGHT - MARGIN - (v / 100) * (HEIGHT - MARGIN * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length === 0) return null;

  const step = values.length > 1 ? (WIDTH - MARGIN * 2) / (values.length - 1) : 0;
  const lastIndex = values.length - 1;
  const lastX = MARGIN + lastIndex * step;
  const lastY = HEIGHT - MARGIN - (values[lastIndex] / 100) * (HEIGHT - MARGIN * 2);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height="60" preserveAspectRatio="none">
      <path d={buildPath(values)} fill="none" stroke={color} strokeWidth="2" />
      <circle cx={lastX} cy={lastY} r="3" fill="var(--clay-mark)" />
    </svg>
  );
}
