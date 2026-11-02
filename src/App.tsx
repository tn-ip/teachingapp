import { useEffect, useMemo, useState } from "react";
import {
  CHOICES,
  difficultyLabel,
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
import { HoneycombMap } from "./HoneycombMap";
import { isPracticeDrillRun, practiceDrillEnabled } from "./features";
import { AccountBar } from "./AccountBar";
import { MathView } from "./MathView";
import { questionById } from "./questions";
import {
  choiceOrder,
  grantPerfectRun,
  loadProgress,
  paperAnswer,
  perfectCount,
  pickIsCorrect,
  saveProgress,
  scoreRun,
  remedialOffer,
  stageClearedBy,
  startRun,
  type Progress,
  type Run,
} from "./progress";
import { SchoolProgress } from "./SchoolProgress";
import { useAccountSync } from "./useAccountSync";

type Screen = "map" | "quiz" | "result" | "school";

/** An open practice drill is not a screen while that stage's drill is hidden. */
function screenForProgress(saved: Progress): Screen {
  if (!saved.run) return "map";
  if (isPracticeDrillRun(saved.run) && !practiceDrillEnabled(saved.run.stage)) return "map";
  return saved.run.marked ? "result" : "quiz";
}

function joinStageTitles(titles: readonly string[]): string {
  if (titles.length <= 1) return titles[0] ?? "";
  if (titles.length === 2) return `${titles[0]} and ${titles[1]}`;
  return `${titles.slice(0, -1).join(", ")}, and ${titles[titles.length - 1]}`;
}

function enabledPracticeNote(): string {
  const titles = stages
    .filter((stage) => practiceDrillEnabled(stage.id))
    .map((stage) => `${stage.title} (${stage.id})`);
  if (titles.length === 0) return "";
  return `✏️ Practice Drill on ${joinStageTitles(titles)}: two practice questions for each wrong one. Practice does not star the stage.`;
}

function practiceHint(run: Run, questionId: string): string {
  for (const repair of run.repairs ?? []) {
    const slot = repair.ids.indexOf(questionId);
    if (slot < 0) continue;
    return `Practice for paper question ${repair.paperNumber} · ${slot + 1} of 2`;
  }
  return "Practice";
}

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

function WorkedSolutionView({
  question,
  paperKey,
  shuffled,
}: {
  question: Question;
  paperKey: Choice;
  shuffled: boolean;
}) {
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
      {shuffled ? (
        <p className="shuffle-note">
          Options were shuffled for this run, so a letter in this scheme may not match the letter you tapped.
        </p>
      ) : null}
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
          mathseasy marks {solution.sourceAnswer}. This bank’s key is {question.answer}. On this paper that choice is {paperKey}.
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

export function App() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [screen, setScreen] = useState<Screen>(() => screenForProgress(loadProgress()));
  const [confirmReset, setConfirmReset] = useState(false);
  const account = useAccountSync(progress, setProgress, (next) => {
    setProgress(next);
    setScreen((current) => (current === "school" ? current : screenForProgress(next)));
  });
  const signedIn = Boolean(account.label);
  const teacher = account.role === "teacher";

  useEffect(() => {
    if (!teacher && screen === "school") setScreen("map");
  }, [teacher, screen]);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const stageIds = stages.map((stage) => stage.id);
  const clearedCount = stageIds.filter((id) => progress.cleared.includes(id)).length;
  const run = progress.run;
  const drillBlocked = Boolean(run && isPracticeDrillRun(run) && !practiceDrillEnabled(run.stage));
  const studentScreen: Screen = drillBlocked && screen !== "school" ? "map" : screen;

  useEffect(() => {
    if (!drillBlocked || screen === "school" || screen === "map") return;
    setScreen("map");
  }, [drillBlocked, screen]);

  function update(next: Progress, nextScreen?: Screen) {
    setProgress(next);
    if (nextScreen) setScreen(nextScreen);
  }

  function openStage(stageId: string) {
    const resumeOpenPaper =
      run &&
      run.stage === stageId &&
      !run.marked &&
      (practiceDrillEnabled(run.stage) || !isPracticeDrillRun(run));
    if (resumeOpenPaper) {
      setScreen("quiz");
      return;
    }
    const next = startRun(progress, stageId, "stage");
    if (next) update(next, "quiz");
  }

  function beginDrill() {
    if (!run || !practiceDrillEnabled(run.stage)) return;
    const next = startRun(progress, run.stage, "drill");
    if (next) update(next, "quiz");
  }

  return (
    <div className={`app screen-${screen === "school" ? "school" : studentScreen}`}>
        <header className="top">
          <div>
            <p className="eyebrow">HKDSE Mathematics · Paper 2</p>
            <h1>
              {screen === "school"
                ? "School progress"
                : studentScreen === "quiz"
                  ? run && practiceDrillEnabled(run.stage) && isPracticeDrillRun(run)
                    ? "Practice"
                    : "Stage run"
                  : studentScreen === "result"
                    ? "Result"
                    : "Stage map"}
            </h1>
          </div>
          <div className="top-side">
            <AccountBar account={account} />
            {screen === "school" ? null : (
              <p className="progress-pill" aria-label={`${clearedCount} of ${stages.length} stages starred`}>
                ★ {clearedCount} / {stages.length}
              </p>
            )}
          </div>
        </header>

      {screen === "school" && teacher ? <SchoolProgress onBack={() => setScreen("map")} /> : null}

      {studentScreen === "map" ? (
        <StageMap
          progress={progress}
          teacher={teacher}
          onOpenSchool={() => setScreen("school")}
          onOpen={openStage}
          onResume={() => setScreen(run?.marked ? "result" : "quiz")}
          confirmReset={confirmReset}
          onAskReset={() => setConfirmReset(true)}
          onCancelReset={() => setConfirmReset(false)}
          onReset={() => {
            void account
              .reset()
              .then(() => {
                setScreen("map");
                setConfirmReset(false);
              })
              .catch(() => {
                setConfirmReset(false);
              });
          }}
          signedIn={signedIn}
        />
      ) : null}

      {studentScreen === "quiz" && run ? (
        <Quiz
          run={run}
          onChange={(nextRun) => update({ ...progress, run: nextRun })}
          onHome={() => setScreen("map")}
          onMarked={(nextRun) => {
            const stamped = nextRun.clientId
              ? nextRun
              : { ...nextRun, clientId: crypto.randomUUID() };
            const result = scoreRun(stamped);
            const withStar = grantPerfectRun(progress, stamped, result.correct, result.total);
            update(
              {
                ...withStar,
                run: stamped,
                last: {
                  ...progress.last,
                  [stamped.stage]: {
                    correct: result.correct,
                    total: result.total,
                    mode: stamped.mode,
                    source: stamped.source,
                    at: new Date().toISOString(),
                  },
                },
              },
              "result",
            );
          }}
        />
      ) : null}

      {studentScreen === "result" && run?.marked ? (
        <Result
          run={run}
          perfects={perfectCount(progress.perfectRuns, run.stage)}
          onHome={() => setScreen("map")}
          onRetry={() => {
            const next = startRun(progress, run.stage, "stage");
            if (next) update(next, "quiz");
          }}
          onDrill={beginDrill}
          signedIn={signedIn}
        />
      ) : null}
    </div>
  );
}

function StageMap({
  progress,
  teacher,
  onOpenSchool,
  onOpen,
  onResume,
  confirmReset,
  onAskReset,
  onCancelReset,
  onReset,
  signedIn,
}: {
  progress: Progress;
  teacher: boolean;
  onOpenSchool: () => void;
  onOpen: (stageId: string) => void;
  onResume: () => void;
  confirmReset: boolean;
  onAskReset: () => void;
  onCancelReset: () => void;
  onReset: () => void;
  signedIn: boolean;
}) {
  const run = progress.run;
  const practiceNote = enabledPracticeNote();
  return (
    <main className="map">
      {teacher ? (
        <button type="button" className="school-entry" onClick={onOpenSchool}>
          School progress
        </button>
      ) : null}
      <p className="lede">
        Pick any stage. They all stay open. 👋
        <br />
        🍯 Honeycomb: Easy → Hard, then Untagged.
        <br />
        📝 Up to 5 real DSE questions, warming up Easy → Medium → untagged → Hard.
        <br />
        ⭐ A star is two perfect stage runs. They need not be consecutive, and a miss keeps the perfects you already have.
        {practiceNote ? (
          <>
            <br />
            {practiceNote}
          </>
        ) : null}
      </p>
      <p className="note source-credit">
        Disclaimer: DSE Worked solutions are adapted from{" "}
        <a href={solutionAttribution.home} target="_blank" rel="noopener noreferrer">
          mathseasy.hk
        </a>{" "}
        ({solutionAttribution.author}).
      </p>
      {run && (practiceDrillEnabled(run.stage) || !isPracticeDrillRun(run)) ? (
        <button className="resume" type="button" onClick={onResume}>
          {run.marked ? "Review" : "Continue"} {stageById(run.stage)?.id} ·{" "}
          {run.source === "generated"
            ? "practice drill"
            : run.mode === "drill"
              ? "drill"
              : "stage run"}
        </button>
      ) : null}
      <HoneycombMap
        stages={rankedStages}
        perfectRuns={progress.perfectRuns}
        onOpen={onOpen}
      />
      <p className="note">
        J6 is not in this bank, so it is not on the map. A stage with no tagged
        facility percentage sits in Untagged, after Hard. The average uses
        tagged questions only. One perfect run shows 1/2 on the hex. The second
        perfect run replaces that with a star.
      </p>

      <footer className="reset">
        {confirmReset ? (
          <div className="reset-row">
            <p>
              {signedIn
                ? "Clear saved progress for this account?"
                : "Clear saved progress on this iPad?"}
            </p>
            <button type="button" className="ghost" onClick={onCancelReset}>
              Keep it
            </button>
            <button type="button" className="danger" onClick={onReset}>
              Reset
            </button>
          </div>
        ) : (
          <button type="button" className="texty" onClick={onAskReset}>
            {signedIn ? "Reset saved progress" : "Reset this iPad"}
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
          {practiceDrillEnabled(run.stage) && run.source === "generated"
            ? "Practice"
            : practiceDrillEnabled(run.stage) && run.mode === "drill"
              ? "Drill"
              : "Stage"}{" "}
          ·{" "}
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
      {practiceDrillEnabled(run.stage) && run.source === "generated" ? (
        <p className="warmup-hint">{practiceHint(run, question.id)}</p>
      ) : null}
      <article className="question-card">
        {practiceDrillEnabled(run.stage) && question.generated ? (
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
      </article>
      <div className="choices" role="listbox" aria-label="Choices">
        {CHOICES.map((letter, index) => {
          const bankLetter = choiceOrder(run, question.id)[index];
          return (
            <button
              key={letter}
              type="button"
              role="option"
              aria-selected={pick === letter}
              className={pick === letter ? "choice selected" : "choice"}
              onClick={() => choose(letter)}
            >
              <span className="letter">{letter}</span>
              <MathView text={question.choices[bankLetter]} />
            </button>
          );
        })}
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
  perfects,
  onHome,
  onRetry,
  onDrill,
  signedIn,
}: {
  run: Run;
  perfects: number;
  onHome: () => void;
  onRetry: () => void;
  onDrill: () => void;
  signedIn: boolean;
}) {
  const items = run.ids
    .map((id) => questionById(id))
    .filter((q): q is Question => Boolean(q));
  const correct = items.filter((q) => pickIsCorrect(run, q)).length;
  const perfect = correct === items.length && items.length > 0;
  const stage = stageById(run.stage);
  const already = perfect ? Math.max(0, perfects - 1) : perfects;
  const justStarred = stageClearedBy(run, correct, items.length, already);
  const halfway = perfect && run.mode === "stage" && run.source !== "generated" && perfects === 1;
  const drillOn = practiceDrillEnabled(run.stage);
  const practice = drillOn && run.source === "generated";
  const offer = drillOn && run.mode === "stage" ? remedialOffer(run) : null;
  const canPractice = Boolean(offer && offer.mapped > 0 && !perfect);
  const shuffled = Boolean(run.optionOrders && Object.keys(run.optionOrders).length > 0);
  const stagePaper = run.mode === "stage" && run.source !== "generated";
  const lede = justStarred
    ? `${stage?.title} has its star${signedIn ? " and is saved to your account." : " on this iPad."}`
    : halfway
      ? "One perfect paper is saved. One more perfect stage run gives this stage its star. A miss in between is fine."
      : stagePaper && perfects >= 2
        ? `${stage?.title} already has its star. You can run it again whenever you want.`
        : stagePaper && perfects === 1
          ? "This paper was not perfect. You still have 1 of 2 perfect runs. A miss does not remove it."
          : stagePaper && canPractice
            ? "The stage stays open. Practice two questions for each miss, then retry the stage for a perfect paper."
            : stagePaper || !drillOn
              ? "The stage stays open. Retry it for another perfect-paper attempt."
              : "A practice drill does not star the stage. Retry the stage when you want another perfect-paper attempt.";

  return (
    <main className="result">
      <header className={perfect ? "result-summary perfect" : "result-summary mixed"}>
        <p className="eyebrow">
          {stage?.id} ·{" "}
          {practice
            ? "Practice drill"
            : drillOn && run.mode === "drill"
              ? "Drill"
              : "Stage run"}
        </p>
        <h2>
          <span className="score">
            {correct}/{items.length}
          </span>
          {justStarred
            ? " · star"
            : halfway
              ? " · 1/2"
              : perfect && practice
                ? " · practice complete"
                : perfect && drillOn && run.mode === "drill"
                  ? " · drill complete"
                  : ""}
        </h2>
        <p className="lede">{lede}</p>
      </header>
      {shuffled ? (
        <p className="shuffle-reminder" role="note">
          Options were shuffled for this run. A letter in the published marking scheme may not match the letter you tapped.
        </p>
      ) : null}
      <ol className="review">
        {items.map((question, index) => {
          const picked = run.picks[question.id];
          const key = paperAnswer(question, choiceOrder(run, question.id));
          const ok = picked === key;
          return (
            <li key={question.id} className={ok ? "ok" : "no"}>
              <header>
                <strong>
                  {index + 1}. {ok ? "Correct" : "Wrong"}
                </strong>
                {drillOn && question.generated ? (
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
                Your answer {picked ?? "—"} · key {key}
                {question.facilityPct != null
                  ? ` · ${question.facilityPct}% of candidates`
                  : ""}
              </p>
              {offer != null && offer.unmappedBankIds.includes(question.id) ? (
                <p className="drill-unmatched" role="note">
                  No mapped practice for this miss yet, so its 2 practice questions are skipped.
                  Teaching App will ask DSE Math Check and Weekly Question Generator to match this stem.
                </p>
              ) : null}
              {ok ? null : drillOn && question.generated ? (
                <PracticeWorking question={question} />
              ) : (
                <WorkedSolutionView question={question} paperKey={key} shuffled={shuffled} />
              )}
            </li>
          );
        })}
      </ol>
      <div className="quiz-nav">
        <button type="button" className="ghost" onClick={onHome}>
          Map
        </button>
        {canPractice ? (
          <button type="button" className="primary" onClick={onDrill}>
            Practice the misses (2 each)
          </button>
        ) : (
          <button type="button" className="primary" onClick={onRetry}>
            Retry stage
          </button>
        )}
      </div>
      {canPractice ? (
        <div className="quiz-nav second">
          <button type="button" className="ghost" onClick={onRetry}>
            Retry stage
          </button>
        </div>
      ) : null}
      {practice && run.unmatchedMisses && run.unmatchedMisses.length > 0 ? (
        <p className="drill-unmatched" role="note">
          {run.unmatchedMisses.length === 1
            ? "1 missed question had no mapped practice, so its 2 practice questions were skipped."
            : `${run.unmatchedMisses.length} missed questions had no mapped practice, so those practice questions were skipped.`}
        </p>
      ) : null}
      <p className="bank-note">
        {practice
          ? `${questionsFor(run.stage).length} real Paper 2 questions stay on the stage run. This drill is generated practice.`
          : `${questionsFor(run.stage).length} real Paper 2 questions in this stage.`}
      </p>
    </main>
  );
}
