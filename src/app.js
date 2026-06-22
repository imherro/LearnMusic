import { playQuestion, playReferenceC } from "./audio.js";
import { formatAnswer, getQuestion, getStage, judgeAnswer, STAGES } from "./stages.js";
import { loadState, recordAnswer, resetState, saveState } from "./storage.js";

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
  unlockedCount: document.querySelector("#unlockedCount"),
  historyList: document.querySelector("#historyList"),
  resetButton: document.querySelector("#resetButton"),
};

let savedState = loadState();
let session = createSession(savedState.unlockedStage);
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
  session.answers.push({
    question: currentQuestion,
    answer,
    isCorrect,
  });

  recordAnswer(savedState, session.stageId, currentQuestion, isCorrect);
  elements.answerState.textContent = isCorrect ? "正确" : "再练";
  elements.answerDetail.textContent = `正确答案：${formatAnswer(currentQuestion)} · ${currentQuestion.detail}`;
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
  const isLastStage = session.stageId === STAGES.length;

  if (allCorrect && !isLastStage) {
    const nextStage = session.stageId + 1;
    savedState.unlockedStage = Math.max(savedState.unlockedStage, nextStage);
    saveState(savedState);
    elements.answerState.textContent = "晋级";
    elements.answerDetail.textContent = `10 题全对，进入${getStage(nextStage).title}`;
    session = createSession(nextStage);
    currentQuestion = null;
    hasAnswered = false;
    renderStage();
    return;
  }

  if (allCorrect) {
    elements.answerState.textContent = "完成";
    elements.answerDetail.textContent = "第四阶段 10 题全对";
  } else {
    elements.answerState.textContent = "本组结束";
    elements.answerDetail.textContent = "本阶段继续";
  }

  currentQuestion = null;
  hasAnswered = false;
  elements.replayButton.disabled = true;
}

function createSession(stageId) {
  return {
    stageId,
    answers: [],
  };
}

function renderStageRail() {
  elements.stageRail.innerHTML = "";

  for (const stage of STAGES) {
    const button = document.createElement("button");
    const isUnlocked = stage.id <= savedState.unlockedStage;

    button.type = "button";
    button.className = "stage-step";
    button.disabled = !isUnlocked;
    button.dataset.active = String(stage.id === session.stageId);
    button.innerHTML = `<span>${stage.id}</span><strong>${stage.shortTitle}</strong>`;
    button.addEventListener("click", () => {
      if (!isUnlocked) {
        return;
      }

      session = createSession(stage.id);
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
  elements.unlockedCount.textContent = savedState.unlockedStage;
  elements.primaryAction.querySelector("span:last-child").textContent = "开始";
  elements.replayButton.disabled = true;
  elements.answerState.textContent = "准备";
  elements.answerDetail.textContent = `第 ${stage.id} 阶段`;
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
    item.innerHTML = `<span>${entry.isCorrect ? "正确" : "错误"}</span><strong>${formatAnswer(entry.question)}</strong><small>${entry.question.detail}</small>`;
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
