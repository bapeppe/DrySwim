/** Audio condiviso: va sbloccato da un gesto dell’utente prima di usare i segnali. */
let context: AudioContext | undefined;
export function unlockSound() {
  try {
    context ??= new AudioContext();
    void context.resume();
  } catch {
    // Il timer rimane utilizzabile anche se l’audio non è supportato.
  }
}
export function beep() {
  try {
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.value = 0.07;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.value = 660;
    oscillator.start();
    oscillator.stop(context.currentTime + 0.15);
  } catch {
    // I segnali sonori sono facoltativi.
  }
}
