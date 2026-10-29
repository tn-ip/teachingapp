import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  formatFacility,
  type Difficulty,
  type StageCard,
} from "./bank";
import { hasGeneratedPool } from "./drillPools";
import { PRACTICE_DRILL_ENABLED } from "./features";
import {
  columnsForCount,
  fitHoneycomb,
  layoutHoneycomb,
  type HoneycombLayout,
} from "./honeycomb";
import type { LastResult } from "./progress";

const BANDS: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
  { id: "unknown", label: "Untagged" },
];

/** Pointy-top hex in a 100 × 115.47 viewBox, inset so the stroke stays inside. */
const HEX_POINTS = "50,3.46 96.5,30.33 96.5,85.14 50,112.01 3.5,85.14 3.5,30.33";

type Props = {
  stages: StageCard[];
  clearedIds: readonly string[];
  last: Record<string, LastResult>;
  onOpen: (stageId: string) => void;
};

export function HoneycombMap({ stages, clearedIds, last, onOpen }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cleared = useMemo(() => new Set(clearedIds), [clearedIds]);
  const fit = useMemo(() => fitHoneycomb(width), [width]);
  const groups = useMemo(
    () =>
      BANDS.map((band) => ({
        ...band,
        stages: stages.filter((stage) => stage.band === band.id),
      })).filter((group) => group.stages.length > 0),
    [stages],
  );

  return (
    <div className="hex-map" ref={frameRef}>
      {width > 0
        ? groups.map((group) => {
            const layout = layoutHoneycomb(
              group.stages.length,
              columnsForCount(group.stages.length, fit.columns),
              fit.hexW,
              fit.gap,
            );
            const clearedCount = group.stages.filter((stage) => cleared.has(stage.id)).length;
            return (
              <section
                key={group.id}
                className={`hex-band hex-band-${group.id}`}
                aria-labelledby={`hex-band-${group.id}-label`}
                id={`hex-band-${group.id}`}
              >
                <div className="hex-band-head">
                  <h2 id={`hex-band-${group.id}-label`}>
                    <span className="hex-band-mark" aria-hidden="true" />
                    {group.label}
                  </h2>
                  <p className="hex-band-count">
                    {clearedCount}/{group.stages.length} cleared
                  </p>
                </div>
                <HoneycombCluster
                  layout={layout}
                  stages={group.stages}
                  bandLabel={group.label}
                  cleared={cleared}
                  last={last}
                  onOpen={onOpen}
                />
              </section>
            );
          })
        : null}
    </div>
  );
}

function HoneycombCluster({
  layout,
  stages,
  bandLabel,
  cleared,
  last,
  onOpen,
}: {
  layout: HoneycombLayout;
  stages: StageCard[];
  bandLabel: string;
  cleared: Set<string>;
  last: Record<string, LastResult>;
  onOpen: (stageId: string) => void;
}) {
  return (
    <div
      className="hex-cluster"
      style={{
        width: layout.width,
        height: layout.height + 14,
        ["--hex-w" as string]: `${layout.hexW}px`,
      }}
    >
      <svg
        className="hex-bridges"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width={layout.width}
        height={layout.height}
        aria-hidden="true"
      >
        {layout.bridges.map((bridge, index) => (
          <line
            key={index}
            x1={bridge.x1}
            y1={bridge.y1}
            x2={bridge.x2}
            y2={bridge.y2}
          />
        ))}
      </svg>
      <ol>
        {layout.slots.map((slot) => {
          const stage = stages[slot.index];
          if (!stage) return null;
          const isCleared = cleared.has(stage.id);
          const score = isCleared ? last[stage.id] : undefined;
          const practice = PRACTICE_DRILL_ENABLED && hasGeneratedPool(stage.id);
          return (
            <li
              key={stage.id}
              className="hex-slot"
              style={{
                left: slot.x - layout.hexW / 2,
                top: slot.y - layout.hexH / 2,
                width: layout.hexW,
                height: layout.hexH,
              }}
            >
              <button
                type="button"
                className={
                  isCleared
                    ? score
                      ? "hex cleared has-score"
                      : "hex cleared"
                    : "hex"
                }
                data-stage={stage.id}
                onClick={() => onOpen(stage.id)}
                aria-label={hexLabel(stage, bandLabel, isCleared, score, practice)}
              >
                <svg className="hex-svg" viewBox="0 0 100 115.47" aria-hidden="true">
                  <polygon points={HEX_POINTS} />
                </svg>
                <span className="hex-body">
                  <span className="hex-code">{stage.id}</span>
                  <span className="hex-title">{stage.title}</span>
                  {score ? (
                    <span className="hex-score">
                      {score.correct}/{score.total}
                    </span>
                  ) : null}
                  {practice ? <span className="hex-practice">Practice</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function hexLabel(
  stage: StageCard,
  bandLabel: string,
  cleared: boolean,
  score: LastResult | undefined,
  practice: boolean,
): string {
  const facility =
    stage.averageFacility != null
      ? `Average facility ${formatFacility(stage.averageFacility)} percent.`
      : "No tagged facility.";
  const state = cleared ? "Cleared." : "Not cleared.";
  const scoreText = score ? ` Last score ${score.correct} of ${score.total}.` : "";
  const practiceText = practice ? " Practice available." : "";
  return `${stage.id} ${stage.title}. ${bandLabel}. ${facility} ${stage.questionCount} in the bank. ${state}${scoreText}${practiceText}`;
}
