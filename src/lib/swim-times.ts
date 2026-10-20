import { strokes, type SwimResult } from './team-models';
/** 1.12 = 1 minuto e 12 secondi; i centesimi sono espliciti: 1:12.34. */
export function parseSwimTime(value: string): number {
  const text = value.trim();
  let minutes = 0,
    seconds = 0,
    fraction = '';
  const colon = /^(\d{1,2}):(\d{1,2})(?:[.,](\d{1,2}))?$/.exec(text);
  const dotted = /^(\d{1,2})\.(\d{2})(?:\.(\d{1,2}))?$/.exec(text);
  const plain = /^(\d{1,4})(?:,(\d{1,2}))?$/.exec(text);
  if (colon || dotted) {
    const match = (colon || dotted)!;
    minutes = Number(match[1]);
    seconds = Number(match[2]);
    fraction = match[3] || '';
    if (seconds >= 60) throw new Error('I secondi dopo minuti devono essere tra 00 e 59.');
  } else if (plain) {
    seconds = Number(plain[1]);
    fraction = plain[2] || '';
  } else throw new Error('Usa 1:12.34 oppure 1.12 per 1 minuto e 12 secondi.');
  const result = (minutes * 60 + seconds) * 100 + Number(fraction.padEnd(2, '0'));
  if (result <= 0 || result > 360000)
    throw new Error('Inserisci un tempo maggiore di zero e non superiore a un’ora.');
  return result;
}
export function formatSwimTime(centiseconds: number) {
  const whole = Math.floor(centiseconds / 100);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}.${String(centiseconds % 100).padStart(2, '0')}`;
}
export function specialtyLabel(r: Pick<SwimResult, 'distance' | 'stroke' | 'poolLength'>) {
  return `${r.distance} m ${strokes[r.stroke]} · vasca ${r.poolLength} m`;
}
export function groupSwimResults(results: SwimResult[]) {
  const map = new Map<string, SwimResult[]>();
  for (const r of results) {
    const key = `${r.distance}-${r.stroke}-${r.poolLength}`;
    map.set(key, [...(map.get(key) || []), r]);
  }
  return [...map.entries()].map(([key, items]) => {
    const sorted = items.toSorted(
      (a, b) => a.date.localeCompare(b.date) || a.recordedAt.localeCompare(b.recordedAt),
    );
    const first = sorted[0],
      last = sorted.at(-1)!;
    return {
      key,
      label: specialtyLabel(first),
      items: sorted,
      best: Math.min(...sorted.map((r) => r.centiseconds)),
      improvement: first.centiseconds - last.centiseconds,
    };
  });
}
