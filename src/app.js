import { playFeedback, playQuestion, playReferenceC } from "./audio.js?v=20260622-2";
import { formatAnswer, getQuestion, getStage, judgeAnswer, STAGES } from "./stages.js?v=20260622-2";
import { loadState, recordAnswer, resetState, saveState } from "./storage.js?v=20260622-2";

const GROUP_SIZE = 10;

const elements = {
  stageRail: document.querySelector("#stageRail"),
  stageTitle: document.querySelector("#stageTitle"),
  roundProgress: document.querySelector("#roundProgress"),
  meterFill: document.querySelector("#meterFill"),
  pulseCore: document.querySelector("#pulseCore"),
  answerState: document.querySelector("#answerState"),
  answerDetail: document.querySelector("#answerDetail"),
  primaryAction: document.querySelector("#primaryAction"),
  replayButton: document.querySelector("#replayButton"),
  referenceButton: document.querySelector("#referenceButton"),
  answerGrid: document.querySelector("#answerGrid"),
  directionSelect: document.querySelector("#directionSelect"),
  speedSelect: document.querySelector("#speedSelect"),
  rangeSelect: document.querySelector("#rangeSelect"),
  correctCount: document.querySelector("#correctCount"),
  mistakeCount: document.querySelector("#mistakeCount"),
  streakCount: document.querySelector("#streakCount"),
  scoreCount: document.querySelector("#scoreCount"),
  badgeText: document.querySelector("#badgeText"),
  historyList: document.querySelector("#historyList"),
  resetButton: document.querySelector("#resetButton"),
  feedbackBurst: document.querySelector("#feedbackBurst"),
};

let savedState = loadState();
let session = createSession(savedState.currentPractice);
let currentQuestion = null;
let hasAnswered = false;

initialize();

function initialize() {
  syncSettingsControls();
  renderStageRail();
  renderStage();
  attachEvents();
}

function attachEvents() {
  elements.primaryAction.addEventListener("click", handlePrimaryAction);
  elements.replayButton.addEventListener("click", () => playCurrentQuestion());
  elements.referenceButton.addEventListener("click", () => playReferenceC());
  elements.resetButton.addEventListener("click", () => {
    savedState = resetState();
    session = createSession(1);
    currentQuestion = null;
    hasAnswered = false;
    syncSettingsControls();
    renderStage();
  });

  [elements.directionSelect, elements.speedSelect, elements.rangeSelect].forEach((control) => {
    control.addEventListener("change", () => {
      savedState.settings = getSettingsFromControls();
      saveState(savedState);
    });
  });
}

async function handlePrimaryAction() {
  if (!currentQuestion || hasAnswered) {
    nextQuestion();
  }

  await playCurrentQuestion();
}

function nextQuestion() {
  if (session.answers.length >= GROUP_SIZE) {
    session = createSession(session.stageId);
  }

  try {
    currentQuestion = getQuestion(session.stageId, savedState.settings);
  } catch (error) {
    elements.answerState.textContent = "无法出题";
    elements.answerDetail.textContent = error.message;
    return;
  }

  hasAnswered = false;
  elements.replayButton.disabled = false;
  elements.answerState.textContent = "听题";
  elements.answerDetail.textContent = `第 ${session.answers.length + 1} 题`;
  elements.primaryAction.querySelector("span:last-child").textContent = "播放";
  elements.pulseCore.classList.add("is-listening");
  renderAnswers();
  renderProgress();
}

async function playCurrentQuestion() {
  if (!currentQuestion) {
    nextQuestion();
  }

  if (!currentQuestion) {
    return;
  }

  elements.pulseCore.classList.add("is-listening");
  await playQuestion(currentQuestion, savedState.settings.speed);
  window.setTimeout(() => elements.pulseCore.classList.remove("is-listening"), 760);
}

function answerQuestion(answer) {
  if (!currentQuestion || hasAnswered) {
    return;
  }

  const isCorrect = judgeAnswer(currentQuestion, answer);
  hasAnswered = true;
  const points = isCorrect ? 10 + session.streak * 2 : 0;
  session.streak = isCorrect ? session.streak + 1 : 0;
  session.score += points;
  session.answers.push({
    question: currentQuestion,
    answer,
    isCorrect,
    points,
  });

  recordAnswer(savedState, session.stageId, currentQuestion, isCorrect);
  if (isCorrect && session.streak > savedState.bestStreak) {
    savedState.bestStreak = session.streak;
    saveState(savedState);
  }

  void playFeedback(isCorrect);
  showFeedbackBurst(isCorrect, points);
  elements.answerState.textContent = isCorrect ? "太棒了" : "差一点";
  elements.answerDetail.textContent = getAnswerDetail(currentQuestion);
  elements.primaryAction.querySelector("span:last-child").textContent = session.answers.length >= GROUP_SIZE
    ? "完成本组"
    : "下一题";

  renderAnswers(answer);
  renderProgress();
  renderHistory();

  if (session.answers.length >= GROUP_SIZE) {
    finishGroup();
  }
}

function finishGroup() {
  const allCorrect = session.answers.every((entry) => entry.isCorrect);
  const correctCount = session.answers.filter((entry) => entry.isCorrect).length;

  elements.answerState.textContent = allCorrect ? "满分徽章" : "本组结束";
  elements.answerDetail.textContent = allCorrect
    ? "10 题全对，可以继续刷分，也可以换练习"
    : `本组 ${correctCount} / ${GROUP_SIZE}，再来一轮`;
  elements.badgeText.textContent = allCorrect ? "金色耳朵" : getBadge(correctCount);

  currentQuestion = null;
  hasAnswered = false;
  elements.replayButton.disabled = true;
}

function createSession(stageId) {
  return {
    stageId,
    answers: [],
    score: 0,
    streak: 0,
  };
}

function renderStageRail() {
  elements.stageRail.innerHTML = "";

  for (const stage of STAGES) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "stage-step";
    button.dataset.active = String(stage.id === session.stageId);
    button.innerHTML = `<span>${stage.id}</span><strong>${stage.shortTitle}</strong>`;
    button.addEventListener("click", () => {
      session = createSession(stage.id);
      savedState.currentPractice = stage.id;
      saveState(savedState);
      currentQuestion = null;
      hasAnswered = false;
      renderStage();
    });
    elements.stageRail.append(button);
  }
}

function renderStage() {
  const stage = getStage(session.stageId);

  elements.stageTitle.textContent = stage.title;
  elements.primaryAction.querySelector("span:last-child").textContent = "开始";
  elements.replayButton.disabled = true;
  elements.answerState.textContent = "准备";
  elements.answerDetail.textContent = `${stage.title} · 可随时切换练习`;
  renderStageRail();
  renderAnswers();
  renderProgress();
  renderHistory();
}

function renderAnswers(selectedAnswer = null) {
  const stage = getStage(session.stageId);
  elements.answerGrid.innerHTML = "";

  for (const answer of stage.answers) {
    const button = document.createElement("button");
    const isCorrectAnswer = currentQuestion && String(answer.value) === String(currentQuestion.answer);
    const isSelected = selectedAnswer !== null && String(answer.value) === String(selectedAnswer);

    button.type = "button";
    button.className = "answer-button";
    button.textContent = answer.label;
    button.disabled = !currentQuestion || hasAnswered;

    if (hasAnswered && isCorrectAnswer) {
      button.dataset.result = "correct";
    } else if (hasAnswered && isSelected) {
      button.dataset.result = "wrong";
    }

    button.addEventListener("click", () => answerQuestion(answer.value));
    elements.answerGrid.append(button);
  }
}

function renderProgress() {
  const answered = session.answers.length;
  const correct = session.answers.filter((entry) => entry.isCorrect).length;
  const mistakes = answered - correct;

  elements.roundProgress.textContent = `${answered} / ${GROUP_SIZE}`;
  elements.meterFill.style.width = `${Math.min(100, (answered / GROUP_SIZE) * 100)}%`;
  elements.correctCount.textContent = correct;
  elements.mistakeCount.textContent = mistakes;
  elements.streakCount.textContent = session.streak;
  elements.scoreCount.textContent = session.score;
  elements.badgeText.textContent = getBadge(correct);
}

function renderHistory() {
  const items = session.answers.slice(-5).reverse();

  elements.historyList.innerHTML = "";

  if (items.length === 0) {
    const item = document.createElement("li");
    item.className = "muted-history";
    item.textContent = "暂无记录";
    elements.historyList.append(item);
    return;
  }

  for (const entry of items) {
    const item = document.createElement("li");
    item.innerHTML = `<span>${entry.isCorrect ? "正确" : "错误"}</span><strong>${formatAnswer(entry.question)}</strong><small>${getHistoryDetail(entry)}</small>`;
    item.dataset.correct = String(entry.isCorrect);
    elements.historyList.append(item);
  }
}

function syncSettingsControls() {
  elements.directionSelect.value = savedState.settings.direction;
  elements.speedSelect.value = savedState.settings.speed;
  elements.rangeSelect.value = savedState.settings.range;
}

function getSettingsFromControls() {
  return {
    direction: elements.directionSelect.value,
    speed: elements.speedSelect.value,
    range: elements.rangeSelect.value,
  };
}

function getBadge(correctCount) {
  if (correctCount >= 10) {
    return "金色耳朵";
  }

  if (correctCount >= 8) {
    return "稳定命中";
  }

  if (correctCount >= 5) {
    return "继续热身";
  }

  return "待挑战";
}

function showFeedbackBurst(isCorrect, points) {
  elements.feedbackBurst.textContent = isCorrect ? `+${points}` : "再听一次";
  elements.feedbackBurst.dataset.result = isCorrect ? "correct" : "wrong";
  elements.feedbackBurst.classList.remove("is-showing");
  void elements.feedbackBurst.offsetWidth;
  elements.feedbackBurst.classList.add("is-showing");
}

function getAnswerDetail(question) {
  const answer = formatAnswer(question);

  if (!question.detail || question.detail === answer) {
    return `正确答案：${answer}`;
  }

  return `正确答案：${answer} · ${question.detail}`;
}

function getHistoryDetail(entry) {
  const answer = formatAnswer(entry.question);
  const detail = entry.question.detail && entry.question.detail !== answer
    ? entry.question.detail
    : "单音";

  return `${detail}${entry.points ? ` · +${entry.points}` : ""}`;
}
