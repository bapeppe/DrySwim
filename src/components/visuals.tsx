import type { ExerciseCategory } from '@/lib/models';
import { categories } from '@/lib/models';
import {
  Activity,
  MoveUpRight,
  PersonStanding,
  Shield,
  StretchHorizontal,
  Waves,
  Zap,
} from 'lucide-react';
const icons = {
  mobilita: StretchHorizontal,
  flessibilita: Waves,
  gambe: PersonStanding,
  'parte-superiore': MoveUpRight,
  core: Shield,
  esplosivita: Zap,
  coordinazione: Activity,
};
export function CategoryArt({
  category,
  large = false,
}: {
  category: ExerciseCategory;
  large?: boolean;
}) {
  const Icon = icons[category];
  return (
    <div
      className={`category-art ${large ? 'large' : ''}`}
      style={{ '--cat': categories[category].color } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className="art-ring ring-one" />
      <div className="art-ring ring-two" />
      <div className="art-line" />
      <Icon size={large ? 86 : 54} strokeWidth={1} />
      <span className="art-word">{categories[category].short.toUpperCase()}</span>
    </div>
  );
}
export function SwimArt() {
  return (
    <svg className="swim-art" viewBox="0 0 620 420" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="water" x1="0" y1="0" x2="620" y2="420">
          <stop stopColor="#1b8caa" />
          <stop offset="1" stopColor="#063d66" />
        </linearGradient>
        <pattern
          id="lanes"
          width="100"
          height="30"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-30)"
        >
          <path d="M0 15H100" stroke="#93e8ec" strokeWidth="1" opacity=".18" />
        </pattern>
        <filter id="blur">
          <feGaussianBlur stdDeviation="15" />
        </filter>
      </defs>
      <path fill="url(#water)" d="M0 0h620v420H0z" />
      <path fill="url(#lanes)" d="M0 0h620v420H0z" />
      <path
        d="M65 420L620 100M0 230L410 0"
        stroke="#8cedd9"
        strokeWidth="6"
        strokeDasharray="9 11"
        opacity=".75"
      />
      <ellipse
        cx="370"
        cy="215"
        rx="180"
        ry="65"
        transform="rotate(-30 370 215)"
        fill="#6ce5e2"
        opacity=".15"
        filter="url(#blur)"
      />
      <g transform="rotate(-30 340 220)">
        <path d="M185 220c80-35 206-38 300-7" stroke="#b6ffff" strokeWidth="2" opacity=".4" />
        <path d="M260 220l50-10 57 10-5 24-55 3-50-9" fill="#0a273c" />
        <path d="M315 211l30-30 40-8 9 10-37 12-25 31" fill="#e9b79b" />
        <path d="M334 238l24 27 63 5 2-11-52-9-19-29" fill="#e9b79b" />
        <path d="M265 220l-52-8-47 8-4 10 51-5 50 13" fill="#e9b79b" />
        <path d="M264 235l-52 19-42-3-4 10 52 5 56-17" fill="#e9b79b" />
        <ellipse cx="379" cy="225" rx="20" ry="18" fill="#e9b79b" />
        <path d="M368 211c15-10 33 0 31 15l-23 2z" fill="#b9ef42" />
        <path d="M392 224l11 3" stroke="#0a273c" strokeWidth="5" />
      </g>
      <path
        d="M250 275c-38 8-61 5-81-8M437 162l35-9M272 299l-30 12M398 302l54-17"
        stroke="#b9f9f1"
        strokeWidth="2"
        opacity=".65"
      />
    </svg>
  );
}
