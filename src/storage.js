const STORAGE_KEY = "learnmusic:v1";

const DEFAULT_STATE = {
  currentPractice: 1,
  bestStreak: 0,
  settings: {
    direction: "random",
    speed: "medium",
    range: "middle",
  },
  totals: {
    1: { correct: 0, total: 0 },
    2: { correct: 0, total: 0 },
    3: { correct: 0, total: 0 },
    4: { correct: 0, total: 0 },
  },
  pitchTotals: {},
};

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return structuredClone(DEFAULT_STATE);
    }

    const parsed = JSON.parse(raw);
    const currentPractice = parsed.currentPractice ?? parsed.unlockedStage ?? DEFAULT_STATE.currentPractice;

    return {
      ...structuredClone(DEFAULT_STATE),
      ...parsed,
      currentPractice,
      bestStreak: parsed.bestStreak ?? DEFAULT_STATE.bestStreak,
      settings: {
        ...DEFAULT_STATE.settings,
        ...(parsed.settings ?? {}),
      },
      totals: {
        ...structuredClone(DEFAULT_STATE.totals),
        ...(parsed.totals ?? {}),
      },
      pitchTotals: parsed.pitchTotals ?? {},
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  return loadState();
}

export function recordAnswer(state, stageId, question, isCorrect) {
  const key = String(stageId);
  const totals = state.totals[key] ?? { correct: 0, total: 0 };

  totals.total += 1;
  totals.correct += isCorrect ? 1 : 0;
  state.totals[key] = totals;

  if (question.kind === "pitch") {
    const pitch = question.answer;
    const pitchTotals = state.pitchTotals[pitch] ?? { correct: 0, total: 0 };

    pitchTotals.total += 1;
    pitchTotals.correct += isCorrect ? 1 : 0;
    state.pitchTotals[pitch] = pitchTotals;
  }

  saveState(state);
}
