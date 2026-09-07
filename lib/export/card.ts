export type CardStat = { label: string; value: string; hint: string };

export type CardShape = "square" | "story";

export type CardPalette = {
  ground: string;
  ink: string;
  muted: string;
  subtle: string;
  line: string;
  signal: string;
};

export type CardPlan = {
  shape: CardShape;
  footer: string;
  stats: readonly CardStat[];
  palette: CardPalette;
  sans: string;
  mono: string;
};

const SIZES: Record<CardShape, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 }
};

const PAD = 96;
const MAX_STATS = 4;

type SlotMetrics = {
  label: number;
  hint: number;
  gapLabel: number;
  gapHint: number;
  rule: number;
  cap: number;
  floor: number;
};

const METRICS: Record<CardShape, SlotMetrics> = {
  square: { label: 26, hint: 28, gapLabel: 12, gapHint: 12, rule: 24, cap: 168, floor: 56 },
  story: { label: 30, hint: 32, gapLabel: 16, gapHint: 16, rule: 28, cap: 220, floor: 64 }
};

const VALUE_BASELINE = 0.76;
const HINT_BASELINE = 0.78;

function line(context: CanvasRenderingContext2D, y: number, width: number, color: string) {
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(PAD, y);
  context.lineTo(width - PAD, y);
  context.stroke();
}

export function cardSize(shape: CardShape) {
  return SIZES[shape];
}

export function drawCard(canvas: HTMLCanvasElement, plan: CardPlan): void {
  const { width, height } = SIZES[plan.shape];
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return;

  context.fillStyle = plan.palette.ground;
  context.fillRect(0, 0, width, height);

  context.textBaseline = "alphabetic";
  context.textAlign = "left";
  context.fillStyle = plan.palette.subtle;
  context.font = `500 30px ${plan.mono}`;
  context.fillText("Lens", PAD, PAD + 30);

  const stats = plan.stats.slice(0, MAX_STATS);
  const metric = METRICS[plan.shape];
  const top = PAD + 90;
  const room = height - top - PAD - 60;
  const slot = room / Math.max(1, stats.length);
  const fixed = metric.label + metric.gapLabel + metric.gapHint + metric.hint;
  const value = Math.max(
    metric.floor,
    Math.min(metric.cap, Math.floor(slot - metric.rule - fixed))
  );
  const stack = fixed + value;
  const offset = Math.max(0, (slot - metric.rule - stack) / 2);
  const inner = width - PAD * 2;

  stats.forEach((stat, index) => {
    const y = top + slot * index + offset;

    context.fillStyle = plan.palette.subtle;
    context.font = `500 ${metric.label}px ${plan.mono}`;
    context.fillText(stat.label, PAD, y + metric.label, inner);

    const valueTop = y + metric.label + metric.gapLabel;
    context.fillStyle = index === 0 ? plan.palette.signal : plan.palette.ink;
    context.font = `500 ${value}px ${plan.mono}`;
    context.fillText(stat.value, PAD, valueTop + value * VALUE_BASELINE, inner);

    const hintTop = valueTop + value + metric.gapHint;
    context.fillStyle = plan.palette.muted;
    context.font = `400 ${metric.hint}px ${plan.sans}`;
    context.fillText(stat.hint, PAD, hintTop + metric.hint * HINT_BASELINE, inner);

    if (index < stats.length - 1) {
      line(context, y + (stack + slot) / 2, width, plan.palette.line);
    }
  });

  context.fillStyle = plan.palette.subtle;
  context.font = `400 30px ${plan.sans}`;
  context.fillText(plan.footer, PAD, height - PAD, inner);
}

export function saveCard(canvas: HTMLCanvasElement, name: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${name}.png`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}
