import { useEffect, useMemo, useState } from "react";
import { fetchSchoolRoster } from "./accountSync";
import { stageById, stages } from "./bank";
import type { SchoolStudent } from "./schoolRoster";

const stageOrder = stages.map((stage) => stage.id);

export function SchoolProgress({ onBack }: { onBack: () => void }) {
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [stageId, setStageId] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void fetchSchoolRoster(stageOrder)
      .then((rows) => {
        if (!cancelled) setStudents(rows);
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
  }, [attempt]);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return students.filter((student) => {
      if (stageId && !student.cleared.includes(stageId)) return false;
      if (!query) return true;
      const haystack = `${student.displayName} ${student.email ?? ""}`.toLocaleLowerCase();
      return haystack.includes(query);
    });
  }, [students, search, stageId]);

  const stageTitle = stageId ? stageById(stageId)?.title : null;

  return (
    <main className="school">
      <button type="button" className="ghost school-back" onClick={onBack}>
        Stage map
      </button>
      <p className="lede">
        Every signed-in student. A star is two perfect stage runs, and the list
        under each name is the stages they have starred. One perfect run stays
        on that student’s map as 1/2 until the second. Names are the display
        names on their accounts, including class and number.
      </p>

      {loading ? <p className="note">Loading school progress…</p> : null}

      {error ? (
        <div className="school-error">
          <p className="sync-note error" role="alert">
            Could not load school progress.
          </p>
          <button type="button" className="ghost" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : null}

      {!loading && !error && students.length === 0 ? (
        <p className="note">No students yet.</p>
      ) : null}

      {!loading && !error && students.length > 0 ? (
        <>
          <div className="school-tools">
            <input
              type="search"
              className="school-search"
              value={search}
              placeholder="Search name"
              aria-label="Search students by name"
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="school-filter"
              value={stageId}
              aria-label="Filter by starred stage"
              onChange={(event) => setStageId(event.target.value)}
            >
              <option value="">All stages</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.id} · {stage.title}
                </option>
              ))}
            </select>
          </div>
          <p className="note school-summary">
            {visible.length} {visible.length === 1 ? "student" : "students"}
            {stageTitle ? ` with a star on ${stageId}` : ""}
          </p>
          {visible.length === 0 ? <p className="note">No students match.</p> : null}
          <ol className="school-list">
            {visible.map((student) => (
              <li key={student.id} className="school-card">
                <header>
                  <div>
                    <span className="school-name">{student.displayName}</span>
                    {student.email ? <span className="school-email">{student.email}</span> : null}
                  </div>
                  <span className="school-count" aria-label={`${student.cleared.length} stars`}>
                    ★ {student.cleared.length}
                  </span>
                </header>
                {student.cleared.length > 0 ? (
                  <ul className="school-stages" aria-label={`Starred stages for ${student.displayName}`}>
                    {student.cleared.map((id) => {
                      const title = stageById(id)?.title ?? id;
                      return (
                        <li key={id} title={title} aria-label={`Starred ${id}, ${title}`}>
                          <span aria-hidden="true">★ </span>
                          {id}
                          <span className="school-stage-title">{title}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="school-none">No stars yet.</p>
                )}
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </main>
  );
}
