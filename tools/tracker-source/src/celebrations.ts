type AudioContextConstructor = new () => AudioContext;

function audioContextConstructor(): AudioContextConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  return (
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext
  ) as AudioContextConstructor | undefined;
}

export function playMilestoneSound(enabled: boolean) {
  if (!enabled) return;
  const AudioContextClass = audioContextConstructor();
  if (!AudioContextClass) return;
  try {
    const context = new AudioContextClass();
    const now = context.currentTime;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);
    gain.connect(context.destination);
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(now + index * 0.08);
      oscillator.stop(now + 0.72);
    });
    window.setTimeout(() => void context.close(), 900);
  } catch {
    // Audio is an optional enhancement; unsupported or blocked contexts are harmless.
  }
}

export function triggerMilestoneHaptic(enabled: boolean) {
  if (!enabled || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate([28, 24, 48, 24, 72]);
  } catch {
    // Some browsers expose vibrate but reject it without a user gesture.
  }
}
