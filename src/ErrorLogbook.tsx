import { useEffect, useMemo, useState } from "react";
import { fetchErrorLog } from "./accountSync";
import { stageById } from "./bank";
import { conceptLabel, questionIdentity, type ErrorLogRow, type ErrorStatus } from "./errorLog";
import { questionById } from "./questions";

type StatusFilter = "all" | ErrorStatus;

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export type ErrorLogbookProps = {
  userId: string;
  /** Shown on the teacher view. */
  studentName?: string;
  /** Teachers open a student's book read-only; no retry, no writes. */
  readOnly: boolean;
  onBack: () => void;
  onRetry?: (row: ErrorLogRow) => void;
};

export function ErrorLogbook({ userId, studentName, readOnly, onBack, onRetry }: ErrorLogbookProps) {
  const [rows, setRows] = useState<ErrorLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [stageId, setStageId] = useState("");
  const [concept, setConcept] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void fetchErrorLog(userId)
      .then((next) => {
        if (!cancelled) setRows(next);
      })
      .catch((reason: unknown) => {
        console.error(reason);
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  const stageOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { id: string; title: string }[] = [];
    for (const row of rows) {
      if (seen.has(row.stage_id)) continue;
      seen.add(row.stage_id);
      options.push({ id: row.stage_id, title: stageById(row.stage_id)?.title ?? row.stage_id });
    }
    options.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
    return options;
  }, [rows]);

  const conceptOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const row of rows) {
      if (row.concept) seen.add(row.concept);
    }
    return [...seen].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  }, [rows]);

  const visible = useMemo(() => {
    const openRank: Record<ErrorStatus, number> = { open: 0, corrected: 1 };
    return rows
      .filter((row) => {
        if (stageId && row.stage_id !== stageId) return false;
        if (concept && row.concept !== concept) return false;
        if (status !== "all" && row.status !== status) return false;
        return true;
      })
      .sort((a, b) => {
        if (openRank[a.status] !== openRank[b.status]) return openRank[a.status] - openRank[b.status];
        if (a.last_missed_at !== b.last_missed_at) {
          return a.last_missed_at < b.last_missed_at ? 1 : -1;
        }
        return a.question_id.localeCompare(b.question_id);
      });
  }, [rows, stageId, concept, status]);

  return (
    <main className="logbook">
      <button type="button" className="ghost logbook-back" onClick={onBack}>
        {readOnly ? "School progress" : "Stage map"}
      </button>
      <p className="lede">
        {readOnly
          ? `${studentName ?? "Student"}'s error logbook, read-only.`
          : "Every question you have missed, across stage runs, Practice, and drills. Getting it right later marks it corrected."}
      </p>

      {loading ? <p className="note">Loading error logbook…</p> : null}

      {error ? (
        <div className="school-error">
          <p className="sync-note error" role="alert">
            Could not load the error logbook.
          </p>
          <button type="button" className="ghost" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <p className="note">No mistakes saved yet.</p>
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <>
          <div className="logbook-tools">
            <select
              className="school-filter"
              value={stageId}
              aria-label="Filter by stage"
              onChange={(event) => setStageId(event.target.value)}
            >
              <option value="">All stages</option>
              {stageOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.id} · {option.title}
                </option>
              ))}
            </select>
            <select
              className="school-filter"
              value={concept}
              aria-label="Filter by concept"
              onChange={(event) => setConcept(event.target.value)}
            >
              <option value="">All concepts</option>
              {conceptOptions.map((code) => (
                <option key={code} value={code}>
                  {conceptLabel(code)}
                </option>
              ))}
            </select>
          </div>
          <div className="logbook-status" role="group" aria-label="Filter by status">
            {(["open", "corrected", "all"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={status === value ? "logbook-status-btn selected" : "logbook-status-btn"}
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
              >
                {value === "open" ? "Open" : value === "corrected" ? "Corrected" : "All"}
              </button>
            ))}
          </div>
          <p className="note logbook-summary">
            {visible.length} {visible.length === 1 ? "item" : "items"}
          </p>
          {visible.length === 0 ? <p className="note">No items match.</p> : null}
          <ol className="logbook-list">
            {visible.map((row) => {
              const question = questionById(row.question_id);
              const identity = question ? questionIdentity(question) : "Question no longer available";
              return (
                <li key={row.id} className={`logbook-card ${row.status}`}>
                  <header>
                    <span className={`logbook-status-pill ${row.status}`}>
                      {row.status === "open" ? "Open" : "Corrected"}
                    </span>
                    <span className="logbook-meta">
                      Missed {row.miss_count}× · {formatDate(row.last_missed_at)}
                    </span>
                  </header>
                  <p className="logbook-identity">
                    <strong>{row.stage_id}</strong> · {identity}
                  </p>
                  <p className="logbook-concept">{conceptLabel(row.concept)}</p>
                  {!readOnly && onRetry && question ? (
                    <button type="button" className="ghost logbook-retry" onClick={() => onRetry(row)}>
                      Retry
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </>
      ) : null}
    </main>
  );
}
