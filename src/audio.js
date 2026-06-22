const SPEEDS = {
  slow: { note: 0.72, gap: 0.22 },
  medium: { note: 0.48, gap: 0.15 },
  fast: { note: 0.32, gap: 0.1 },
};

let audioContext;

export async function ensureAudio() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  return audioContext;
}

export async function playQuestion(question, speed = "medium") {
  const context = await ensureAudio();
  const timing = SPEEDS[speed] ?? SPEEDS.medium;
  let cursor = context.currentTime + 0.04;

  question.notes.forEach((note) => {
    playTone(context, note.midi, cursor, timing.note);
    cursor += timing.note + timing.gap;
  });
}

export async function playReferenceC() {
  const context = await ensureAudio();
  playTone(context, 60, context.currentTime + 0.04, 0.55);
}

function playTone(context, midi, startTime, duration) {
  const oscillator = context.createOscillator();
  const overtone = context.createOscillator();
  const gain = context.createGain();
  const overtoneGain = context.createGain();
  const filter = context.createBiquadFilter();
  const frequency = 440 * 2 ** ((midi - 69) / 12);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);

  overtone.type = "triangle";
  overtone.frequency.setValueAtTime(frequency * 2, startTime);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.26, startTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.08, startTime + duration * 0.72);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  overtoneGain.gain.setValueAtTime(0.0001, startTime);
  overtoneGain.gain.exponentialRampToValueAtTime(0.05, startTime + 0.025);
  overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  overtone.connect(overtoneGain);
  gain.connect(filter);
  overtoneGain.connect(filter);
  filter.connect(context.destination);

  oscillator.start(startTime);
  overtone.start(startTime);
  oscillator.stop(startTime + duration + 0.04);
  overtone.stop(startTime + duration + 0.04);
}
