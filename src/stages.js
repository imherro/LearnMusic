const DEGREE_NAMES = {
  2: "二度",
  3: "三度",
  4: "四度",
  5: "五度",
  6: "六度",
  7: "七度",
  8: "八度",
};

export const STAGES = [
  {
    id: 1,
    title: "方向热身",
    shortTitle: "热身",
    answers: [
      { value: "up", label: "上升" },
      { value: "down", label: "下降" },
    ],
  },
  {
    id: 2,
    title: "音程对比",
    shortTitle: "音程",
    answers: intervalAnswers([2, 3]),
  },
  {
    id: 3,
    title: "音高入门",
    shortTitle: "音高",
    answers: pitchAnswers(["1", "3", "5"]),
  },
  {
    id: 4,
    title: "综合挑战",
    shortTitle: "综合",
    answers: pitchAnswers(["1", "2", "3", "4", "5", "6", "7"]),
  },
];

export const PITCH_CARDS = [
  {
    id: "stable",
    title: "稳定音",
    subtitle: "1 / 3 / 5",
    lessonDegrees: ["1", "3", "5"],
    rungs: [["1", "5"], ["1", "3"], ["3", "5"], ["1", "3", "5"]],
  },
  {
    id: "near-home",
    title: "邻近音",
    subtitle: "1 / 2 / 3",
    lessonDegrees: ["2"],
    rungs: [["1", "2"], ["2", "3"], ["1", "2", "3"]],
  },
  {
    id: "near-open",
    title: "上方邻近",
    subtitle: "5 / 6 / 1",
    lessonDegrees: ["6"],
    rungs: [["5", "6"], ["6", "1"], ["5", "6", "1"]],
  },
  {
    id: "tendency",
    title: "倾向音",
    subtitle: "3 / 4 / 5 · 6 / 7 / 1",
    lessonDegrees: ["4", "7"],
    rungs: [["3", "4"], ["4", "5"], ["6", "7"], ["7", "1"], ["3", "4", "5"], ["6", "7", "1"]],
  },
  {
    id: "all",
    title: "全部音",
    subtitle: "1 - 7",
    lessonDegrees: [],
    rungs: [["1", "2", "3", "5", "6"], ["3", "4", "5"], ["6", "7", "1"], ["1", "2", "3", "4", "5", "6", "7"]],
  },
];

const MAJOR_SCALE = [
  { degree: "1", name: "C", semitone: 0 },
  { degree: "2", name: "D", semitone: 2 },
  { degree: "3", name: "E", semitone: 4 },
  { degree: "4", name: "F", semitone: 5 },
  { degree: "5", name: "G", semitone: 7 },
  { degree: "6", name: "A", semitone: 9 },
  { degree: "7", name: "B", semitone: 11 },
];

const RANGES = {
  low: { startOctave: 3, endOctave: 4 },
  middle: { startOctave: 4, endOctave: 5 },
  high: { startOctave: 5, endOctave: 6 },
};

const INTERVAL_LADDER = [
  [2, 3],
  [3, 5],
  [2, 5],
  [3, 4],
  [5, 8],
];

const PITCH_GROUP_SIZE = 10;

export function getStage(stageId) {
  return STAGES.find((stage) => stage.id === stageId) ?? STAGES[0];
}

export function getPitchCard(cardId) {
  return PITCH_CARDS.find((card) => card.id === cardId) ?? PITCH_CARDS[0];
}

export function getScaleNotes(rangeName = "middle") {
  const range = RANGES[rangeName] ?? RANGES.middle;
  const notes = [];

  for (let octave = range.startOctave; octave <= range.endOctave; octave += 1) {
    for (const note of MAJOR_SCALE) {
      notes.push({
        name: note.name,
        degree: note.degree,
        midi: 12 * (octave + 1) + note.semitone,
        octave,
        scaleIndex: octave * 7 + MAJOR_SCALE.findIndex((item) => item.name === note.name),
      });
    }
  }

  return notes;
}

export function getQuestion(stageId, settings = {}) {
  const notes = getScaleNotes(settings.range);
  const answeredCount = settings.answeredCount ?? 0;

  if (stageId === 1) {
    return getWarmupQuestion(notes, settings.direction);
  }

  if (stageId === 2) {
    return getIntervalContrastQuestion(notes, settings.direction, answeredCount);
  }

  if (stageId === 3) {
    return getGuidedPitchQuestion(notes, answeredCount, settings.pitchCardId);
  }

  return getChallengeQuestion(notes, settings.direction, answeredCount);
}

export function judgeAnswer(question, answer) {
  if (question.kind === "pitch-lesson") {
    return true;
  }

  return String(question.answer) === String(answer);
}

export function formatAnswer(question) {
  if (question.kind === "pitch-lesson") {
    return `听熟 ${question.targetDegree}`;
  }

  if (question.kind === "direction") {
    return question.answer === "up" ? "上升" : "下降";
  }

  if (question.kind === "interval") {
    return DEGREE_NAMES[question.answer] ?? `${question.answer}度`;
  }

  if (question.kind === "contour") {
    return {
      "up-up": "升升",
      "up-down": "升降",
      "down-up": "降升",
      "down-down": "降降",
    }[question.answer];
  }

  return question.answer;
}

function getWarmupQuestion(notes, requestedDirection = "random") {
  if (Math.random() < 0.68) {
    const direction = requestedDirection === "up" || requestedDirection === "down"
      ? requestedDirection
      : sample(["up", "down"]);
    const pair = pickOrderedPair(notes, direction);

    return {
      stageId: 1,
      kind: "direction",
      notes: pair,
      playNotes: pair,
      answer: direction,
      answers: STAGES[0].answers,
      prompt: "听第二个音往哪边走",
      detail: formatNotes(pair),
    };
  }

  return getContourQuestion(notes);
}

function getIntervalContrastQuestion(notes, requestedDirection = "random", answeredCount = 0) {
  const pairOptions = INTERVAL_LADDER[Math.floor(answeredCount / 2) % INTERVAL_LADDER.length];
  const size = sample(pairOptions);
  const question = getIntervalQuestion(notes, requestedDirection, size);

  return {
    ...question,
    answers: intervalAnswers(pairOptions),
    prompt: `${pairOptions.map((interval) => DEGREE_NAMES[interval]).join(" / ")} 对比`,
    contrast: pairOptions,
  };
}

function getGuidedPitchQuestion(notes, answeredCount = 0, pitchCardId = "stable") {
  const card = getPitchCard(pitchCardId);
  const lessonDegrees = card.lessonDegrees ?? [];

  if (answeredCount < lessonDegrees.length) {
    return getPitchLessonQuestion(notes, lessonDegrees[answeredCount], card);
  }

  const practiceIndex = Math.max(0, answeredCount - lessonDegrees.length);
  const practiceSlots = Math.max(1, PITCH_GROUP_SIZE - lessonDegrees.length);
  const rungIndex = Math.min(card.rungs.length - 1, Math.floor((practiceIndex * card.rungs.length) / practiceSlots));
  const pitchSet = card.rungs[rungIndex];
  const target = pickPitchNote(notes, pitchSet);
  const home = pickNearestHomeNote(notes, target);

  return {
    stageId: 3,
    kind: "pitch",
    notes: [target],
    playNotes: [home, target],
    answer: target.degree,
    answers: pitchAnswers(pitchSet),
    choiceNotes: getChoiceNotes(notes, pitchSet, target),
    homeNote: home,
    prompt: `${card.title} · ${pitchSet.length === 2 ? "二选一" : `${pitchSet.length} 选一`}：${pitchSet.join(" / ")}`,
    detail: `1 → ${target.degree}`,
    hint: getPitchHint(target.degree),
    pitchCardId: card.id,
  };
}

function getChallengeQuestion(notes, requestedDirection = "random", answeredCount = 0) {
  if (answeredCount % 2 === 0) {
    const size = randomInt(2, 8);
    return {
      ...getIntervalQuestion(notes, requestedDirection, size),
      answers: intervalAnswers([2, 3, 4, 5, 6, 7, 8]),
      prompt: "综合音程",
    };
  }

  const target = pickPitchNote(notes, ["1", "2", "3", "4", "5", "6", "7"]);
  const home = pickNearestHomeNote(notes, target);

  return {
    stageId: 4,
    kind: "pitch",
    notes: [target],
    playNotes: [home, target],
    answer: target.degree,
    answers: pitchAnswers(["1", "2", "3", "4", "5", "6", "7"]),
    choiceNotes: getChoiceNotes(notes, ["1", "2", "3", "4", "5", "6", "7"], target),
    homeNote: home,
    prompt: "综合音高",
    detail: `1 → ${target.degree}`,
  };
}

function getPitchLessonQuestion(notes, degree, card) {
  const target = pickPitchNote(notes, [degree]);
  const home = pickNearestHomeNote(notes, target);
  const hint = getPitchHint(degree);

  return {
    stageId: 3,
    kind: "pitch-lesson",
    notes: [target],
    playNotes: [home, target, home, target],
    answer: "heard",
    targetDegree: degree,
    answers: [{ value: "heard", label: "听懂了" }],
    choiceNotes: getChoiceNotes(notes, card.rungs[card.rungs.length - 1], target),
    homeNote: home,
    prompt: `${card.title} · ${hint}`,
    detail: `1 → ${degree}`,
    hint,
    pitchCardId: card.id,
  };
}

function getIntervalQuestion(notes, requestedDirection = "random", size = randomInt(2, 8)) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const direction = requestedDirection === "up" || requestedDirection === "down"
      ? requestedDirection
      : sample(["up", "down"]);
    const startIndex = randomInt(0, notes.length - 1);
    const offset = size - 1;
    const targetIndex = direction === "up" ? startIndex + offset : startIndex - offset;

    if (targetIndex >= 0 && targetIndex < notes.length) {
      const pair = [notes[startIndex], notes[targetIndex]];
      return {
        stageId: 2,
        kind: "interval",
        notes: pair,
        playNotes: pair,
        answer: size,
        direction,
        detail: formatNotes(pair),
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
      stageId: 1,
      kind: "contour",
      notes: triad,
      playNotes: triad,
      answer: contour,
      answers: [
        { value: "up-up", label: "升升" },
        { value: "up-down", label: "升降" },
        { value: "down-up", label: "降升" },
        { value: "down-down", label: "降降" },
      ],
      prompt: "听三个音的走势",
      detail: formatNotes(triad),
    };
  }

  throw new Error("无法生成三音走势题，请调整音域。");
}

function intervalAnswers(intervals) {
  return intervals.map((interval) => ({
    value: interval,
    label: DEGREE_NAMES[interval] ?? `${interval}度`,
  }));
}

function pitchAnswers(degrees) {
  return degrees.map((degree) => ({
    value: degree,
    label: degree,
  }));
}

function pickPitchNote(notes, allowedDegrees) {
  const candidates = notes.filter((note) => allowedDegrees.includes(note.degree));
  return sample(candidates);
}

function pickNearestHomeNote(notes, target) {
  const homeNotes = notes.filter((note) => note.degree === "1");
  return homeNotes.reduce((closest, note) => {
    if (!closest) {
      return note;
    }

    return Math.abs(note.midi - target.midi) < Math.abs(closest.midi - target.midi)
      ? note
      : closest;
  }, null);
}

function getChoiceNotes(notes, degrees, target) {
  return Object.fromEntries(degrees.map((degree) => {
    const choices = notes.filter((note) => note.degree === degree);
    const nearest = choices.reduce((closest, note) => {
      if (!closest) {
        return note;
      }

      return Math.abs(note.midi - target.midi) < Math.abs(closest.midi - target.midi)
        ? note
        : closest;
    }, null);

    return [degree, nearest];
  }));
}

function getPitchHint(degree) {
  return {
    1: "1 是家，最落地。",
    2: "2 像从 1 往上走，还没站稳。",
    3: "3 明亮、稳定。",
    4: "4 有点悬，想回到 3 或走向 5。",
    5: "5 开阔、稳定。",
    6: "6 比 5 更亮，但没有 1/3/5 那么落地。",
    7: "7 很紧，想回到高音 1。",
  }[degree] ?? "";
}

function formatNotes(notes) {
  return notes.map((note) => note.degree).join(" → ");
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
