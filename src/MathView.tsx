import katex from "katex";
import { useMemo } from "react";

type Piece =
  | { kind: "text"; value: string }
  | { kind: "math"; value: string }
  | { kind: "display"; value: string }
  | { kind: "image"; src: string };

function tokenize(source: string): Piece[] {
  const pieces: Piece[] = [];
  const re = /\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|!\[\]\(([^)]+)\)/g;
  let last = 0;
  for (const match of source.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > last) pieces.push({ kind: "text", value: source.slice(last, index) });
    if (match[1] != null) pieces.push({ kind: "display", value: match[1] });
    else if (match[2] != null) pieces.push({ kind: "math", value: match[2] });
    else if (match[3]) pieces.push({ kind: "image", src: match[3] });
    last = index + match[0].length;
  }
  if (last < source.length) pieces.push({ kind: "text", value: source.slice(last) });
  return pieces;
}

function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}${path.replace(/^\//, "")}`;
}

export function MathView({ text }: { text: string }) {
  const pieces = useMemo(() => tokenize(text), [text]);
  return (
    <div className="mathview">
      {pieces.map((piece, index) => {
        if (piece.kind === "math" || piece.kind === "display") {
          const html = katex.renderToString(piece.value, {
            throwOnError: false,
            displayMode: piece.kind === "display",
            output: "html",
            strict: "ignore",
          });
          if (piece.kind === "display") {
            return (
              <div
                key={index}
                className="math-display"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          }
          return (
            <span
              key={index}
              className="math"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        if (piece.kind === "image") {
          return (
            <img
              key={index}
              className="figure"
              src={assetUrl(piece.src)}
              alt="Diagram for this question"
            />
          );
        }
        const lines = piece.value.split("\n");
        return (
          <span key={index}>
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {line}
              </span>
            ))}
          </span>
        );
      })}
    </div>
  );
}
