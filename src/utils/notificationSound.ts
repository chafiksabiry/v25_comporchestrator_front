/**
 * Play a short two-tone chime via the Web Audio API (no audio asset needed).
 * Wrapped in try/catch because browsers may block audio before any user
 * interaction; in that case we simply stay silent.
 */
export function playNotificationSound() {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);

    // Two ascending notes (G5 then C6) for a pleasant "ding-dong".
    const notes = [
      { freq: 784, start: 0, dur: 0.18 },
      { freq: 1047, start: 0.16, dur: 0.28 },
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = now + start;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    });

    window.setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {
    /* audio not available / blocked — ignore */
  }
}
