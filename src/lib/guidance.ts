import type { Workout } from './models';

type WarmupCue = { duration: number; title: string; instruction: string };
const warmups: Record<string, WarmupCue[]> = {
  'forza-core': [
    {
      duration: 60,
      title: 'Marcia sul posto',
      instruction: 'Cammina sul posto a passo svelto. Muovi anche le braccia.',
    },
    {
      duration: 60,
      title: 'Cat-Cow',
      instruction:
        'A quattro appoggi, arrotonda e distendi dolcemente la schiena. Respira e vai piano.',
    },
    {
      duration: 60,
      title: 'Muovi le spalle',
      instruction: 'Fai cerchi lenti con le spalle, prima avanti e poi indietro.',
    },
    {
      duration: 60,
      title: 'Squat leggeri',
      instruction: 'Piega le ginocchia e risali senza saltare. Scendi solo fin dove sei comodo.',
    },
    {
      duration: 60,
      title: 'Ancora un po’ di marcia',
      instruction:
        'Alterna qualche squat leggero alla marcia sul posto. Il circuito sta per cominciare.',
    },
  ],
  'esplosivita-stabilita': [
    {
      duration: 60,
      title: 'Marcia sul posto',
      instruction: 'Cammina sul posto e muovi le braccia, aumentando il ritmo con calma.',
    },
    {
      duration: 60,
      title: 'Mobilità delle anche',
      instruction:
        'Da seduto, piega le ginocchia a 90° e spostale lentamente da un lato all’altro. Appoggia le mani se serve.',
    },
    {
      duration: 60,
      title: 'Muovi le caviglie',
      instruction:
        'Avvicina un ginocchio alla parete tenendo il tallone a terra. Alterna i lati, senza forzare.',
    },
    {
      duration: 60,
      title: 'Squat leggeri',
      instruction:
        'Fai piccoli squat lenti, senza saltare. Tieni le ginocchia in linea con i piedi.',
    },
    {
      duration: 60,
      title: 'Prova l’atterraggio',
      instruction:
        'Senza saltare, piega anche e ginocchia come per ammortizzare un arrivo. Controlla l’equilibrio.',
    },
    {
      duration: 60,
      title: 'Sali sulle punte',
      instruction: 'Sali e scendi lentamente sugli avampiedi. Nessun salto: prepariamo la spinta.',
    },
  ],
  'mobilita-controllo': [
    {
      duration: 120,
      title: 'Marcia e muovi le braccia',
      instruction:
        'Cammina sul posto a ritmo tranquillo. Muovi le braccia senza forzare le spalle.',
    },
    {
      duration: 60,
      title: 'Cat-Cow',
      instruction:
        'A quattro appoggi, arrotonda e distendi dolcemente la schiena seguendo il respiro.',
    },
    {
      duration: 60,
      title: 'Muovi le caviglie',
      instruction: 'Muovi le caviglie con calma e alterna i lati. Cerca un movimento comodo.',
    },
    {
      duration: 60,
      title: 'Squat leggeri',
      instruction: 'Scendi poco e risali lentamente. Tieni entrambi i piedi ben appoggiati.',
    },
  ],
};

/** Piccole istruzioni contestuali, senza modificare scadenze o fasi del motore. */
export function warmupCue(workout: Workout, remainingSeconds: number) {
  const cues = warmups[workout.id];
  if (!cues || cues.reduce((sum, c) => sum + c.duration, 0) !== workout.warmupSeconds) return null;
  const passed = Math.max(0, workout.warmupSeconds - Math.max(0, remainingSeconds));
  let boundary = 0;
  for (let index = 0; index < cues.length; index++) {
    boundary += cues[index].duration;
    if (passed < boundary || index === cues.length - 1)
      return { ...cues[index], index: index + 1, total: cues.length };
  }
  return null;
}
