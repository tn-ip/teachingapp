import { useEffect, useMemo, useState } from "react";
import {
  CHOICES,
  act2Chapters,
  difficultyLabel,
  questionById,
  questionsFor,
  stageById,
  stages,
  type Choice,
  type Difficulty,
  type Question,
} from "./bank";
import { MathView } from "./MathView";
import {
  allJuniorCleared,
  anchorForMisses,
  loadProgress,
  saveProgress,
  startRun,
  unusedCount,
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
  const act2Open = allJuniorCleared(progress, stageIds);
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
    const next = startRun(progress, run.stage, "drill", anchorForMisses(run));
    if (next) update(next, "quiz");
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="eyebrow">HKDSE Mathematics · Compulsory Paper 2</p>
          <h1>Junior stage map</h1>
        </div>
        <p className="progress-pill">
          {clearedCount}/{stages.length} cleared
        </p>
      </header>

      {screen === "map" ? (
        <StageMap
          progress={progress}
          act2Open={act2Open}
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
            const cleared =
              nextRun.mode === "stage" &&
              result.total > 0 &&
              result.correct === result.total
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
          unused={unusedCount(progress, run.stage)}
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
  act2Open,
  onOpen,
  onResume,
  confirmReset,
  onAskReset,
  onCancelReset,
  onReset,
}: {
  progress: Progress;
  act2Open: boolean;
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
        Pick any Junior stage. A run is up to 5 real DSE questions, warming up
        Easy → Medium → untagged → Hard. Clear it only with a perfect paper. A
        miss opens a drill of unused questions from the same stage, preferring
        the missed band or an easier one.
      </p>
      {run ? (
        <button className="resume" type="button" onClick={onResume}>
          {run.marked ? "Review" : "Continue"} {stageById(run.stage)?.id} ·{" "}
          {run.mode === "drill" ? "drill" : "stage run"}
        </button>
      ) : null}
      <ol className="trail">
        {stages.map((stage) => {
          const cleared = progress.cleared.includes(stage.id);
          const last = progress.last[stage.id];
          const length = Math.min(5, stage.questionCount);
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
                  <span>
                    {stage.questionCount} in the bank · run of {length}
                    {cleared ? " · cleared" : ""}
                    {last && !cleared
                      ? ` · last ${last.mode} ${last.correct}/${last.total}`
                      : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="note">J6 is not in this bank, so the path skips it.</p>

      <section className={act2Open ? "act2 open" : "act2"} aria-label="Act 2">
        <div className="act2-head">
          <h2>Act 2 · Compulsory chapters</h2>
          <p>
            {act2Open
              ? "Every Junior stage is cleared. Chapter questions are not in this version yet."
              : "Locked until every Junior stage on this map is cleared."}
          </p>
        </div>
        <ul>
          {act2Chapters.map((chapter) => (
            <li key={chapter.id}>
              <span>{chapter.id.replace("C", "Ch ")}</span>
              {chapter.title}
            </li>
          ))}
        </ul>
      </section>

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
        <p>
          {run.mode === "drill" ? "Drill" : "Stage"} · {run.index + 1}/
          {items.length}
          <span>
            {" "}
            · {answered}/{items.length} answered
          </span>
        </p>
      </div>
      <p className="stage-name">
        {stage.id} · {stage.title}
      </p>
      {run.mode === "stage" ? (
        <p className="warmup-hint">Warm-up: Easy → Hard</p>
      ) : null}
      <p className="source">
        <DifficultyChip difficulty={question.difficulty} />
        <span>{question.sourceTag}</span>
      </p>
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
  unused,
  onHome,
  onRetry,
  onDrill,
}: {
  run: Run;
  cleared: boolean;
  unused: number;
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
  const justCleared = run.mode === "stage" && perfect;

  return (
    <main className="result">
      <p className="eyebrow">{stage?.id} · {run.mode === "drill" ? "Drill" : "Stage run"}</p>
      <h2>
        {correct}/{items.length}
        {justCleared ? " · stage cleared" : perfect && run.mode === "drill" ? " · drill complete" : ""}
      </h2>
      <p className="lede">
        {justCleared
          ? `${stage?.title} is cleared on this iPad.`
          : run.mode === "stage"
            ? "The stage stays open. Consolidate with unused questions from the same bank, then retry the stage."
            : "A drill does not clear the stage. Retry the stage when you want another perfect-paper attempt."}
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
                <span className="review-meta">
                  <DifficultyChip difficulty={question.difficulty} />
                  {question.sourceTag}
                </span>
              </header>
              <MathView text={question.stem} />
              <p className="verdict">
                Your answer {picked ?? "—"} · key {question.answer}
                {question.facilityPct != null
                  ? ` · ${question.facilityPct}% of candidates`
                  : ""}
              </p>
            </li>
          );
        })}
      </ol>
      <div className="quiz-nav">
        <button type="button" className="ghost" onClick={onHome}>
          Map
        </button>
        {run.mode === "stage" && !perfect && unused > 0 ? (
          <button type="button" className="primary" onClick={onDrill}>
            Drill {Math.min(5, unused)} unused
          </button>
        ) : (
          <button type="button" className="primary" onClick={onRetry}>
            Retry stage
          </button>
        )}
      </div>
      {run.mode === "stage" && !perfect && unused === 0 ? (
        <p className="note">
          No unused questions remain in {stage?.id}. Retry the stage to draw
          again from the full bank.
        </p>
      ) : null}
      {run.mode === "drill" ? (
        <div className="quiz-nav second">
          <button type="button" className="ghost" onClick={onRetry}>
            Retry stage
          </button>
          {unused > 0 ? (
            <button type="button" className="primary" onClick={onDrill}>
              Another drill
            </button>
          ) : null}
        </div>
      ) : null}
      <p className="bank-note">
        {questionsFor(run.stage).length} real Paper 2 questions in this stage.
      </p>
    </main>
  );
}
