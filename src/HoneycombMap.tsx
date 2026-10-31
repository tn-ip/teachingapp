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
import { perfectCount } from "./progress";

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
  perfectRuns: Record<string, string[]>;
  onOpen: (stageId: string) => void;
};

export function HoneycombMap({ stages, perfectRuns, onOpen }: Props) {
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
            const starredCount = group.stages.filter(
              (stage) => perfectCount(perfectRuns, stage.id) >= 2,
            ).length;
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
                    ★ {starredCount} / {group.stages.length}
                  </p>
                </div>
                <HoneycombCluster
                  layout={layout}
                  stages={group.stages}
                  bandLabel={group.label}
                  perfectRuns={perfectRuns}
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
  perfectRuns,
  onOpen,
}: {
  layout: HoneycombLayout;
  stages: StageCard[];
  bandLabel: string;
  perfectRuns: Record<string, string[]>;
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
      <ol>
        {layout.slots.map((slot) => {
          const stage = stages[slot.index];
          if (!stage) return null;
          const perfects = perfectCount(perfectRuns, stage.id);
          const starred = perfects >= 2;
          const halfway = perfects === 1;
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
                className={starred || halfway ? "hex has-mark" : "hex"}
                data-stage={stage.id}
                data-perfects={perfects}
                onClick={() => onOpen(stage.id)}
                aria-label={hexLabel(stage, bandLabel, perfects, practice)}
              >
                <svg className="hex-svg" viewBox="0 0 100 115.47" aria-hidden="true">
                  <polygon points={HEX_POINTS} />
                </svg>
                <span className="hex-body">
                  <span className="hex-code">{stage.id}</span>
                  <span className="hex-title">{stage.title}</span>
                  {starred ? (
                    <span className="hex-star" aria-hidden="true">
                      ★
                    </span>
                  ) : null}
                  {halfway ? <span className="hex-halfway">1/2</span> : null}
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
  perfects: number,
  practice: boolean,
): string {
  const facility =
    stage.averageFacility != null
      ? `Average facility ${formatFacility(stage.averageFacility)} percent.`
      : "No tagged facility.";
  const state =
    perfects >= 2 ? "Starred." : perfects === 1 ? "One of two perfect runs." : "No star yet.";
  const practiceText = practice ? " Practice available." : "";
  return `${stage.id} ${stage.title}. ${bandLabel}. ${facility} ${stage.questionCount} in the bank. ${state}${practiceText}`;
}
