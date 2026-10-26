import { useEffect, useMemo, useState } from "react";
import {
  CHOICES,
  difficultyLabel,
  formatFacility,
  questionsFor,
  rankedStages,
  solutionAttribution,
  solutionFor,
  stageById,
  stages,
  type Choice,
  type Difficulty,
  type Question,
} from "./bank";
import { hasGeneratedPool } from "./drillPools";
import { MathView } from "./MathView";
import { questionById } from "./questions";
import {
  loadProgress,
  saveProgress,
  stageClearedBy,
  startRun,
  type Progress,
  type Run,
} from "./progress";

type Screen = "map" | "quiz" | "result";

function DifficultyChip({ difficulty }: { difficulty: Difficulty }) {
  const label = difficultyLabel(difficulty);
  const name = difficulty === "unknown" ? "Not tagged yet" : label;
  return (
    <span
      className={`diff diff-${difficulty}`}
      title={`Difficulty: ${name}`}
      aria-label={`Difficulty: ${name}`}
    >
      {label}
    </span>
  );
}

function WorkedSolutionView({ question }: { question: Question }) {
  const solution = solutionFor(question.id);
  const steps = solution?.solutionSteps.trim() ?? "";
  const url = solution?.solutionSourceUrl ?? null;
  const videoUrl = solution?.videoUrl ?? null;
  let fallback = "No written solution is stored for this question yet.";
  if (solution?.hasDiagram && !steps) {
    fallback = "mathseasy’s write-up for this question is a diagram, so it is not embedded here.";
  } else if (!url) {
    fallback = "Sample Paper has no mathseasy 題解 page. The key is above.";
  }

  return (
    <section className="solution" aria-label="Worked solution">
      <p className="solution-label">題解 · Worked solution</p>
      {steps ? <MathView text={steps} /> : <p className="solution-missing">{fallback}</p>}
      {solution?.hasDiagram && url ? (
        <p className="solution-note">
          原頁有圖，不在這裡顯示。{" "}
          <a href={url} target="_blank" rel="noopener noreferrer">
            圖見原頁
          </a>
        </p>
      ) : null}
      {solution?.sourceAnswer && !solution.answerMatches ? (
        <p className="solution-note">
          mathseasy marks {solution.sourceAnswer}. This bank’s key is {question.answer}.
        </p>
      ) : null}
      {videoUrl ? (
        <a className="solution-source video" href={videoUrl} target="_blank" rel="noopener noreferrer">
          Video by Thomas Fok
        </a>
      ) : null}
    </section>
  );
}

function PracticeWorking({ question }: { question: Question }) {
  const steps = question.steps ?? [];
  if (steps.length === 0) return null;
  return (
    <section className="solution" aria-label="Practice working">
      <p className="solution-label">Working</p>
      <ol className="steps">
        {steps.map((step, index) => (
          <li key={index}>
            <span className="step-mark">{step.mark}</span>
            <div>
              <MathView text={step.text} />
              {step.note ? <span className="step-note">{step.note}</span> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Under a minute: `0s`, `12s`. From 60s: `1:00`, `1:05`. */
export function formatElapsed(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function QuestionTimer({ resetKey }: { resetKey: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    setElapsed(0);
    let timeoutId = 0;

    const tick = () => {
      const elapsedMs = Date.now() - startedAt;
      setElapsed(Math.floor(elapsedMs / 1000));
      timeoutId = window.setTimeout(tick, 1000 - (elapsedMs % 1000));
    };
    timeoutId = window.setTimeout(tick, 1000);

    const onWake = () => {
      if (document.visibilityState === "hidden") return;
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    };
    document.addEventListener("visibilitychange", onWake);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [resetKey]);

  const label = formatElapsed(elapsed);
  return (
    <div
      className="question-timer"
      role="timer"
      title="Time on this question"
      aria-label={`Time on this question: ${label}`}
    >
      <span className="question-timer-label">Time</span>
      <span className="question-timer-value">{label}</span>
    </div>
  );
}

function scoreRun(run: Run): { correct: number; total: number } {
  let correct = 0;
  for (const id of run.ids) {
    const question = questionById(id);
    if (question && run.picks[id] === question.answer) correct += 1;
  }
  return { correct, total: run.ids.length };
}

export function App() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [screen, setScreen] = useState<Screen>(() => {
    const saved = loadProgress();
    if (!saved.run) return "map";
    return saved.run.marked ? "result" : "quiz";
  });
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const stageIds = stages.map((stage) => stage.id);
  const clearedCount = stageIds.filter((id) => progress.cleared.includes(id)).length;
  const run = progress.run;

  function update(next: Progress, nextScreen?: Screen) {
    setProgress(next);
    if (nextScreen) setScreen(nextScreen);
  }

  function openStage(stageId: string) {
    if (run && run.stage === stageId && !run.marked) {
      setScreen("quiz");
      return;
    }
    const next = startRun(progress, stageId, "stage");
    if (next) update(next, "quiz");
  }

  function beginDrill() {
    if (!run) return;
    const next = startRun(progress, run.stage, "drill");
    if (next) update(next, "quiz");
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="eyebrow">HKDSE Mathematics · Paper 2</p>
          <h1>Stage map</h1>
        </div>
        <p className="progress-pill">
          {clearedCount}/{stages.length} cleared
        </p>
      </header>

      {screen === "map" ? (
        <StageMap
          progress={progress}
          onOpen={openStage}
          onResume={() => setScreen(run?.marked ? "result" : "quiz")}
          confirmReset={confirmReset}
          onAskReset={() => setConfirmReset(true)}
          onCancelReset={() => setConfirmReset(false)}
          onReset={() => {
            update(
              { cleared: [], used: {}, last: {}, run: null },
              "map",
            );
            setConfirmReset(false);
          }}
        />
      ) : null}

      {screen === "quiz" && run ? (
        <Quiz
          run={run}
          onChange={(nextRun) => update({ ...progress, run: nextRun })}
          onHome={() => setScreen("map")}
          onMarked={(nextRun) => {
            const result = scoreRun(nextRun);
            const cleared = stageClearedBy(nextRun, result.correct, result.total)
              ? Array.from(new Set([...progress.cleared, nextRun.stage]))
              : progress.cleared;
            update(
              {
                ...progress,
                cleared,
                run: nextRun,
                last: {
                  ...progress.last,
                  [nextRun.stage]: {
                    correct: result.correct,
                    total: result.total,
                    mode: nextRun.mode,
                    source: nextRun.source,
                  },
                },
              },
              "result",
            );
          }}
        />
      ) : null}

      {screen === "result" && run?.marked ? (
        <Result
          run={run}
          cleared={progress.cleared.includes(run.stage)}
          onHome={() => setScreen("map")}
          onRetry={() => {
            const next = startRun(progress, run.stage, "stage");
            if (next) update(next, "quiz");
          }}
          onDrill={beginDrill}
        />
      ) : null}
    </div>
  );
}

function StageMap({
  progress,
  onOpen,
  onResume,
  confirmReset,
  onAskReset,
  onCancelReset,
  onReset,
}: {
  progress: Progress;
  onOpen: (stageId: string) => void;
  onResume: () => void;
  confirmReset: boolean;
  onAskReset: () => void;
  onCancelReset: () => void;
  onReset: () => void;
}) {
  const run = progress.run;
  return (
    <main className="map">
      <p className="lede">
        Pick any stage. Junior and Compulsory chapters sit on one map, ranked
        by average facility from Easy to Hard. A run is up to 5 real DSE
        questions, warming up Easy → Medium → untagged → Hard. Clear a stage
        only with a perfect paper. A miss on Change of subjects, Indices,
        Identities, Factorization, Ratio and map scale, or Simultaneous
        equations opens 5 new practice questions. Other stages have no
        practice drill. A practice drill does not clear the stage.
      </p>
      <p className="note source-credit">
        Worked solutions are adapted from{" "}
        <a href={solutionAttribution.home} target="_blank" rel="noopener noreferrer">
          mathseasy.hk
        </a>{" "}
        ({solutionAttribution.author}).
      </p>
      {run ? (
        <button className="resume" type="button" onClick={onResume}>
          {run.marked ? "Review" : "Continue"} {stageById(run.stage)?.id} ·{" "}
          {run.source === "generated"
            ? "practice drill"
            : run.mode === "drill"
              ? "drill"
              : "stage run"}
        </button>
      ) : null}
      <ol className="trail">
        {rankedStages.map((stage) => {
          const cleared = progress.cleared.includes(stage.id);
          const last = progress.last[stage.id];
          const length = Math.min(5, stage.questionCount);
          const facility =
            stage.averageFacility != null
              ? `avg ${formatFacility(stage.averageFacility)}%`
              : "no tagged facility";
          return (
            <li key={stage.id}>
              <button
                type="button"
                className={cleared ? "stage cleared" : "stage"}
                onClick={() => onOpen(stage.id)}
              >
                <span className="badge">{stage.id}</span>
                <span className="stage-copy">
                  <strong>{stage.title}</strong>
                  <span className="stage-meta">
                    <DifficultyChip difficulty={stage.band} />
                    <span className="stage-detail">
                      {facility}
                      {" · "}
                      {stage.questionCount} in the bank · run of {length}
                      {hasGeneratedPool(stage.id) ? " · practice drills" : ""}
                      {cleared ? " · cleared" : ""}
                      {last && !cleared
                        ? ` · last ${last.source === "generated" ? "practice" : last.mode} ${last.correct}/${last.total}`
                        : ""}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="note">
        J6 is not in this bank, so it is not on the map. A stage with no tagged
        facility percentage sits at the end. The average uses tagged questions
        only.
      </p>

      <footer className="reset">
        {confirmReset ? (
          <div className="reset-row">
            <p>Clear saved progress on this iPad?</p>
            <button type="button" className="ghost" onClick={onCancelReset}>
              Keep it
            </button>
            <button type="button" className="danger" onClick={onReset}>
              Reset
            </button>
          </div>
        ) : (
          <button type="button" className="texty" onClick={onAskReset}>
            Reset this iPad
          </button>
        )}
      </footer>
    </main>
  );
}

function Quiz({
  run,
  onChange,
  onHome,
  onMarked,
}: {
  run: Run;
  onChange: (run: Run) => void;
  onHome: () => void;
  onMarked: (run: Run) => void;
}) {
  const items = useMemo(
    () =>
      run.ids
        .map((id) => questionById(id))
        .filter((q): q is Question => Boolean(q)),
    [run.ids],
  );
  const question = items[run.index];
  const stage = stageById(run.stage);
  const answered = items.filter((item) => run.picks[item.id]).length;
  if (!question || !stage) return null;
  const pick = run.picks[question.id];

  function choose(letter: Choice) {
    onChange({
      ...run,
      picks: { ...run.picks, [question.id]: letter },
    });
  }

  return (
    <main className="quiz">
      <div className="quiz-bar">
        <button type="button" className="ghost" onClick={onHome}>
          Map
        </button>
        <QuestionTimer
          key={`${run.index}:${question.id}`}
          resetKey={`${run.index}:${question.id}`}
        />
        <p className="quiz-progress">
          {run.source === "generated" ? "Practice" : run.mode === "drill" ? "Drill" : "Stage"} ·{" "}
          {run.index + 1}/{items.length}
          <span>
            {" "}
            · {answered}/{items.length} answered
          </span>
        </p>
      </div>
      <p className="stage-name">
        {stage.id} · {stage.title}
      </p>
      {run.mode === "stage" ? <p className="warmup-hint">Warm-up: Easy → Hard</p> : null}
      {run.source === "generated" && question.difficulty !== "unknown" ? (
        <p className="warmup-hint">Practice prefers Easy, then Medium, then Hard</p>
      ) : null}
      {question.generated ? (
        <p className="source">
          {question.difficulty !== "unknown" ? (
            <DifficultyChip difficulty={question.difficulty} />
          ) : null}
          <span>Generated practice · not a past paper</span>
        </p>
      ) : (
        <p className="source">
          <DifficultyChip difficulty={question.difficulty} />
          <span>{question.sourceTag}</span>
        </p>
      )}
      <MathView text={question.stem} />
      <div className="choices" role="listbox" aria-label="Choices">
        {CHOICES.map((letter) => (
          <button
            key={letter}
            type="button"
            role="option"
            aria-selected={pick === letter}
            className={pick === letter ? "choice selected" : "choice"}
            onClick={() => choose(letter)}
          >
            <span className="letter">{letter}</span>
            <MathView text={question.choices[letter]} />
          </button>
        ))}
      </div>
      <div className="quiz-nav">
        <button
          type="button"
          className="ghost"
          disabled={run.index === 0}
          onClick={() => onChange({ ...run, index: run.index - 1 })}
        >
          Previous
        </button>
        {run.index < items.length - 1 ? (
          <button
            type="button"
            className="primary"
            onClick={() => onChange({ ...run, index: run.index + 1 })}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            className="primary"
            disabled={answered < items.length}
            onClick={() => onMarked({ ...run, marked: true })}
          >
            Mark paper
          </button>
        )}
      </div>
    </main>
  );
}

function Result({
  run,
  cleared,
  onHome,
  onRetry,
  onDrill,
}: {
  run: Run;
  cleared: boolean;
  onHome: () => void;
  onRetry: () => void;
  onDrill: () => void;
}) {
  const items = run.ids
    .map((id) => questionById(id))
    .filter((q): q is Question => Boolean(q));
  const correct = items.filter((q) => run.picks[q.id] === q.answer).length;
  const perfect = correct === items.length && items.length > 0;
  const stage = stageById(run.stage);
  const justCleared = stageClearedBy(run, correct, items.length);
  const practice = run.source === "generated";
  const practicePool = hasGeneratedPool(run.stage);
  const lede = justCleared
    ? `${stage?.title} is cleared on this iPad.`
    : run.mode === "stage" && practicePool
      ? "The stage stays open. Drill 5 new practice questions, then retry the stage for a perfect paper."
      : run.mode === "stage"
        ? "The stage stays open. Retry it for another perfect-paper attempt."
        : "A practice drill does not clear the stage. Retry the stage when you want another perfect-paper attempt.";

  return (
    <main className="result">
      <p className="eyebrow">
        {stage?.id} · {practice ? "Practice drill" : run.mode === "drill" ? "Drill" : "Stage run"}
      </p>
      <h2>
        {correct}/{items.length}
        {justCleared
          ? " · stage cleared"
          : perfect && practice
            ? " · practice complete"
            : perfect && run.mode === "drill"
              ? " · drill complete"
              : ""}
      </h2>
      <p className="lede">
        {lede}
        {cleared && !justCleared ? " This stage is already cleared." : ""}
      </p>
      <ol className="review">
        {items.map((question, index) => {
          const picked = run.picks[question.id];
          const ok = picked === question.answer;
          return (
            <li key={question.id} className={ok ? "ok" : "no"}>
              <header>
                <strong>
                  {index + 1}. {ok ? "Correct" : "Wrong"}
                </strong>
                {question.generated ? (
                  <span className="review-meta">
                    {question.difficulty !== "unknown" ? (
                      <DifficultyChip difficulty={question.difficulty} />
                    ) : null}
                    Generated practice
                  </span>
                ) : (
                  <span className="review-meta">
                    <DifficultyChip difficulty={question.difficulty} />
                    {question.sourceTag}
                  </span>
                )}
              </header>
              <MathView text={question.stem} />
              <p className="verdict">
                Your answer {picked ?? "—"} · key {question.answer}
                {question.facilityPct != null
                  ? ` · ${question.facilityPct}% of candidates`
                  : ""}
              </p>
              {ok ? null : question.generated ? (
                <PracticeWorking question={question} />
              ) : (
                <WorkedSolutionView question={question} />
              )}
            </li>
          );
        })}
      </ol>
      <div className="quiz-nav">
        <button type="button" className="ghost" onClick={onHome}>
          Map
        </button>
        {run.mode === "stage" && !perfect && practicePool ? (
          <button type="button" className="primary" onClick={onDrill}>
            Drill 5 new practice Qs
          </button>
        ) : (
          <button type="button" className="primary" onClick={onRetry}>
            Retry stage
          </button>
        )}
      </div>
      {run.mode === "stage" && !perfect && !practicePool ? (
        <p className="note">
          Generated MC practice is available for Change of subjects, Indices,
          Identities, Factorization, Ratio and map scale, and Simultaneous
          equations for now.
        </p>
      ) : null}
      {run.mode === "drill" && practicePool ? (
        <div className="quiz-nav second">
          <button type="button" className="ghost" onClick={onRetry}>
            Retry stage
          </button>
          <button type="button" className="primary" onClick={onDrill}>
            Another 5 practice Qs
          </button>
        </div>
      ) : null}
      <p className="bank-note">
        {practice
          ? `${questionsFor(run.stage).length} real Paper 2 questions stay on the stage run. This drill is generated practice.`
          : `${questionsFor(run.stage).length} real Paper 2 questions in this stage.`}
      </p>
    </main>
  );
}
