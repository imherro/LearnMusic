export const STAGES = [
  {
    id: 1,
    title: "两音高低",
    shortTitle: "高低",
    answers: [
      { value: "up", label: "上升" },
      { value: "down", label: "下降" },
    ],
  },
  {
    id: 2,
    title: "两音音程",
    shortTitle: "音程",
    answers: [
      { value: 2, label: "二度" },
      { value: 3, label: "三度" },
      { value: 4, label: "四度" },
      { value: 5, label: "五度" },
      { value: 6, label: "六度" },
      { value: 7, label: "七度" },
      { value: 8, label: "八度" },
    ],
  },
  {
    id: 3,
    title: "三音走势",
    shortTitle: "走势",
    answers: [
      { value: "up-up", label: "升升" },
      { value: "up-down", label: "升降" },
      { value: "down-up", label: "降升" },
      { value: "down-down", label: "降降" },
    ],
  },
  {
    id: 4,
    title: "单音音高",
    shortTitle: "音高",
    answers: [
      { value: "C", label: "C" },
      { value: "D", label: "D" },
      { value: "E", label: "E" },
      { value: "F", label: "F" },
      { value: "G", label: "G" },
      { value: "A", label: "A" },
      { value: "B", label: "B" },
    ],
  },
];

const MAJOR_SCALE = [
  { name: "C", semitone: 0 },
  { name: "D", semitone: 2 },
  { name: "E", semitone: 4 },
  { name: "F", semitone: 5 },
  { name: "G", semitone: 7 },
  { name: "A", semitone: 9 },
  { name: "B", semitone: 11 },
];

const RANGES = {
  low: { startOctave: 3, endOctave: 4 },
  middle: { startOctave: 4, endOctave: 5 },
  high: { startOctave: 5, endOctave: 6 },
};

export function getStage(stageId) {
  return STAGES.find((stage) => stage.id === stageId) ?? STAGES[0];
}

export function getScaleNotes(rangeName = "middle") {
  const range = RANGES[rangeName] ?? RANGES.middle;
  const notes = [];

  for (let octave = range.startOctave; octave <= range.endOctave; octave += 1) {
    for (const note of MAJOR_SCALE) {
      notes.push({
        name: note.name,
        midi: 12 * (octave + 1) + note.semitone,
        scaleIndex: octave * 7 + MAJOR_SCALE.findIndex((item) => item.name === note.name),
      });
    }
  }

  return notes;
}

export function getQuestion(stageId, settings = {}) {
  const notes = getScaleNotes(settings.range);

  if (stageId === 1) {
    return getDirectionQuestion(notes, settings.direction);
  }

  if (stageId === 2) {
    return getIntervalQuestion(notes, settings.direction);
  }

  if (stageId === 3) {
    return getContourQuestion(notes);
  }

  return getPitchQuestion(notes);
}

export function judgeAnswer(question, answer) {
  return String(question.answer) === String(answer);
}

export function formatAnswer(question) {
  if (question.stageId === 1) {
    return question.answer === "up" ? "上升" : "下降";
  }

  if (question.stageId === 2) {
    return `${question.answer}度`;
  }

  if (question.stageId === 3) {
    return {
      "up-up": "升升",
      "up-down": "升降",
      "down-up": "降升",
      "down-down": "降降",
    }[question.answer];
  }

  return question.answer;
}

function getDirectionQuestion(notes, requestedDirection = "random") {
  const direction = requestedDirection === "up" || requestedDirection === "down"
    ? requestedDirection
    : sample(["up", "down"]);
  const pair = pickOrderedPair(notes, direction);

  return {
    stageId: 1,
    notes: pair,
    answer: direction,
    detail: `${pair[0].name} → ${pair[1].name}`,
  };
}

function getIntervalQuestion(notes, requestedDirection = "random") {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const direction = requestedDirection === "up" || requestedDirection === "down"
      ? requestedDirection
      : sample(["up", "down"]);
    const size = randomInt(2, 8);
    const startIndex = randomInt(0, notes.length - 1);
    const offset = size - 1;
    const targetIndex = direction === "up" ? startIndex + offset : startIndex - offset;

    if (targetIndex >= 0 && targetIndex < notes.length) {
      const pair = [notes[startIndex], notes[targetIndex]];
      return {
        stageId: 2,
        notes: pair,
        answer: size,
        direction,
        detail: `${pair[0].name} → ${pair[1].name}`,
      };
    }
  }

  throw new Error("无法生成音程题，请调整音域或方向。");
}

function getContourQuestion(notes) {
  const contour = sample(["up-up", "up-down", "down-up", "down-down"]);

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const firstIndex = randomInt(0, notes.length - 1);
    const secondDirection = contour.startsWith("up") ? "up" : "down";
    const thirdDirection = contour.endsWith("up") ? "up" : "down";
    const secondIndex = pickNeighborIndex(notes, firstIndex, secondDirection);

    if (secondIndex === null) {
      continue;
    }

    const thirdIndex = pickNeighborIndex(notes, secondIndex, thirdDirection);

    if (thirdIndex === null) {
      continue;
    }

    const triad = [notes[firstIndex], notes[secondIndex], notes[thirdIndex]];
    return {
      stageId: 3,
      notes: triad,
      answer: contour,
      detail: triad.map((note) => note.name).join(" → "),
    };
  }

  throw new Error("无法生成三音走势题，请调整音域。");
}

function getPitchQuestion(notes) {
  const note = sample(notes);

  return {
    stageId: 4,
    notes: [note],
    answer: note.name,
    detail: note.name,
  };
}

function pickOrderedPair(notes, direction) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const firstIndex = randomInt(0, notes.length - 1);
    const secondIndex = pickNeighborIndex(notes, firstIndex, direction);

    if (secondIndex !== null) {
      return [notes[firstIndex], notes[secondIndex]];
    }
  }

  throw new Error("无法生成高低题，请调整音域或方向。");
}

function pickNeighborIndex(notes, index, direction) {
  const candidates = notes
    .map((_, candidateIndex) => candidateIndex)
    .filter((candidateIndex) => {
      if (direction === "up") {
        return candidateIndex > index;
      }

      return candidateIndex < index;
    });

  if (candidates.length === 0) {
    return null;
  }

  return sample(candidates);
}

function sample(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
