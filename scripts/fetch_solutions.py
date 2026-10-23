#!/usr/bin/env python3
"""Pull Junior Paper 2 worked solutions from mathseasy.hk.

Thomas Fok publishes a Paper II 題解 page for each HKDSE year (and the 2012
Practice Paper). This script fetches those pages once, keeps the blocks that
match src/data/questions.json by year and question number, and writes
src/data/solutions.json. The trainer renders that file with KaTeX. GitHub
Pages stays static: nothing is scraped in the browser.

Diagrams on the source pages are not downloaded. A question that uses one is
flagged so the app can point at the original page.

Re-run from the repo root when mathseasy updates a year, or when the Junior
bank changes:

    python3 scripts/fetch_solutions.py

The script prints a coverage report. Sample Paper questions have no matching
題解 page on mathseasy.hk (checked; the yearly pattern 404s for a sample slug).
"""

from __future__ import annotations

import html
import json
import re
import sys
import time
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QUESTIONS = ROOT / "src" / "data" / "questions.json"
OUT = ROOT / "src" / "data" / "solutions.json"

CREDIT = "Solution adapted from mathseasy.hk (Thomas Fok)"
AUTHOR = "Thomas Fok"
SOURCE_HOME = "https://mathseasy.hk/"

USER_AGENT = (
    "teachingapp-solution-fetch/1.0 "
    "(HK classroom trainer; stores attributed excerpts, links to source)"
)
CACHE = Path("/tmp/mathseasy-html")

# Years we know how to request. Sample is intentionally absent.
PAGE_URLS: dict[str, str] = {
    "Practice": "https://mathseasy.hk/articles/hkdse-2012pp-p2-ans/",
}
PAGE_URLS.update(
    {
        str(year): f"https://mathseasy.hk/articles/hkdse-{year}-p2-ans/"
        for year in range(2012, 2027)
    }
)

HEADER_RE = re.compile(
    r"<div\s+class=[\"']?tabs-section-header[\"']?\s*>(.*?)</div>",
    re.I | re.S,
)
HEADER_TEXT_RE = re.compile(r"0*(\d{1,2})\.\s*([A-D])\b", re.I)
DELIM_RE = re.compile(r"\$\$([\s\S]+?)\$\$|##([\s\S]+?)##")
ENV_RE = re.compile(
    r"\\begin\{(?:aligned|align\*?|cases|array|gathered|gather\*?|split|matrix|pmatrix|bmatrix|eqnarray\*?)}"
)
RELATED_RE = re.compile(r"相關文章：[^\n]*")
TAG_RE = re.compile(r"<[^>]+>")


def fetch(url: str) -> str:
    CACHE.mkdir(parents=True, exist_ok=True)
    cache_path = CACHE / (re.sub(r"[^a-z0-9]+", "-", url).strip("-") + ".html")
    if cache_path.exists():
        return cache_path.read_text(encoding="utf-8")
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            request = urllib.request.Request(
                url,
                headers={"User-Agent": USER_AGENT, "Accept": "text/html"},
            )
            with urllib.request.urlopen(request, timeout=60) as response:
                text = response.read().decode("utf-8", "replace")
            cache_path.write_text(text, encoding="utf-8")
            return text
        except (urllib.error.URLError, TimeoutError) as error:
            last_error = error
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"failed to fetch {url}: {last_error}")


def article_html(page: str) -> str:
    start = page.find("class=entry>")
    if start < 0:
        start = page.find('class="entry"')
    if start < 0:
        raise ValueError("article entry not found")
    ends = []
    for marker in (
        "id=related",
        'id="related"',
        'id="comments"',
        "id=comments",
        "class=allcomments",
    ):
        index = page.find(marker, start)
        if index >= 0:
            ends.append(index)
    end = min(ends) if ends else len(page)
    return page[start:end]


def tab_hash(number: int) -> str:
    """mathseasy groups questions in tabs of 10. There is no per-question anchor."""
    tab = min(5, (max(number, 1) - 1) // 10 + 1)
    return f"#tab-{tab}"


def source_url(year: str, number: int) -> str | None:
    base = PAGE_URLS.get(year)
    if not base:
        return None
    return f"{base}{tab_hash(number)}"


def sanitize_tex(tex: str) -> str:
    tex = html.unescape(tex)
    tex = (
        tex.replace("\u2212", "-")
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("\u00a0", " ")
        .replace("\u2009", " ")
        .replace("\u200a", "")
        .replace("\u200b", "")
        .replace("\ufeff", "")
    )
    tex = tex.replace("×", r"\times ")
    tex = tex.replace("÷", r"\div ")
    tex = tex.replace("≤", r"\le ")
    tex = tex.replace("≥", r"\ge ")
    tex = tex.replace("≠", r"\ne ")
    tex = tex.replace("≈", r"\approx ")
    tex = tex.replace("°", r"^{\circ}")
    tex = tex.replace("·", r"\cdot ")
    tex = tex.replace("＋", "+")
    # Currency in the source is a bare $. In math mode that opens another formula.
    tex = tex.replace("$", r"\$")
    tex = re.sub(r"\\begin\{eqnarray\*?\}", r"\\begin{aligned}", tex)
    tex = re.sub(r"\\end\{eqnarray\*?\}", r"\\end{aligned}", tex)
    tex = tex.replace(r"\hline", "")
    tex = tex.replace(r"\nonumber", "")
    tex = re.sub(r"\\deg(?![A-Za-z])", r"^{\\circ}", tex)
    # A bare % starts a TeX comment and drops the rest of the line.
    tex = re.sub(r"(?<!\\)%", r"\\%", tex)
    tex = re.sub(r"[ \t]+\n", "\n", tex)
    tex = re.sub(r"\n{3,}", "\n\n", tex)
    return tex.strip()


def promote_aligned(tex: str) -> str:
    """Give KaTeX a real alignment environment when the source used & or \\\\."""
    if not tex or ENV_RE.search(tex):
        return tex
    if "&" in tex or "\\\\" in tex:
        return "\\begin{aligned} " + tex + " \\end{aligned}"
    return tex


class FragmentToText(HTMLParser):
    """Turn one question's HTML into text plus \\(\\) / \\[\\] math."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip = 0
        self.math_depth = 0
        self.math_parts: list[str] = []
        self.open_scripts: list[str] = []
        self.has_diagram = False
        self.video_urls: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style"}:
            self.skip += 1
            return
        if self.skip:
            return
        attr = {key: value or "" for key, value in attrs}
        classes = attr.get("class", "").split()
        if tag == "span" and "math" in classes:
            if self.math_depth == 0:
                self.math_parts = []
                self.open_scripts = []
            self.math_depth += 1
            return
        if self.math_depth:
            if tag == "sub":
                self.math_parts.append("_{")
                self.open_scripts.append("sub")
            elif tag == "sup":
                self.math_parts.append("^{")
                self.open_scripts.append("sup")
            elif tag == "br":
                self.math_parts.append(" ")
            return
        if tag == "img":
            self.has_diagram = True
            return
        if tag == "iframe":
            src = attr.get("src", "")
            if src:
                self.video_urls.append(src)
            return
        if tag == "a":
            href = attr.get("href", "")
            if any(host in href for host in ("youtube.com", "youtu.be", "vimeo.com")):
                self.video_urls.append(href)
        if tag == "br":
            self.parts.append("\n")
        elif tag in {"p", "div", "li", "blockquote", "tr", "h2", "h3", "h4"}:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style"} and self.skip:
            self.skip -= 1
            return
        if self.skip:
            return
        if tag == "span" and self.math_depth:
            self.math_depth -= 1
            if self.math_depth == 0:
                while self.open_scripts:
                    self.math_parts.append("}")
                    self.open_scripts.pop()
                tex = sanitize_tex("".join(self.math_parts))
                if tex and "\n" in tex and "\\begin{" not in tex:
                    lines = [line.strip() for line in tex.splitlines() if line.strip()]
                    tex = promote_aligned(" \\\\\n".join(lines))
                    self.parts.append("\n\\[" + tex + "\\]\n")
                elif tex:
                    self.parts.append(r"\(" + tex + r"\)")
                self.math_parts = []
            return
        if self.math_depth and tag in {"sub", "sup"}:
            if self.open_scripts and self.open_scripts[-1] == tag:
                self.open_scripts.pop()
                self.math_parts.append("}")
            return

    def handle_data(self, data: str) -> None:
        if self.skip:
            return
        if self.math_depth:
            self.math_parts.append(data)
            return
        self.parts.append(data)

    def text(self) -> str:
        raw = "".join(self.parts)
        # A missing closer would swallow the rest of the question into one math block.
        if raw.count("$$") % 2 == 1:
            raw += "$$"
        if raw.count("##") % 2 == 1:
            raw += "##"
        return convert_delimiters(raw)


def convert_delimiters(text: str) -> str:
    pieces: list[str] = []
    cursor = 0
    for match in DELIM_RE.finditer(text):
        pieces.append(text[cursor : match.start()])
        raw = match.group(1) if match.group(1) is not None else match.group(2) or ""
        # A ## block with several lines is a stack of equations, not one inline run.
        display = match.group(1) is not None or "\\begin{" in raw or "\n" in raw
        if display and "\\begin{" not in raw and "\n" in raw:
            lines = [line.strip() for line in raw.splitlines() if line.strip()]
            raw = " \\\\\n".join(lines)
        tex = promote_aligned(sanitize_tex(raw))
        if tex:
            if display:
                pieces.append("\n\\[" + tex + "\\]\n")
            else:
                pieces.append("\\(" + tex + "\\)")
        cursor = match.end()
    pieces.append(text[cursor:])
    return "".join(pieces)


def tidy(text: str) -> str:
    text = text.replace("\r", "")
    text = text.replace("\xa0", " ")
    text = RELATED_RE.sub("", text)
    text = re.sub(r"If you enjoyed this article[\s\S]*", "", text)
    text = re.sub(r"Subscribe via RSS Feed", "", text)
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    # Drop spacer lines created by the tab markup between groups.
    cleaned: list[str] = []
    blank = 0
    for line in lines:
        if not line:
            blank += 1
            if blank <= 1 and cleaned:
                cleaned.append("")
            continue
        blank = 0
        cleaned.append(line)
    text = "\n".join(cleaned).strip()

    def compact_display(match: re.Match[str]) -> str:
        inner = re.sub(r"\n{2,}", "\n", match.group(1)).strip()
        return "\n\\[" + inner + "\\]\n"

    text = re.sub(r"\\\[([\s\S]+?)\\\]", compact_display, text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def parse_questions(page: str) -> dict[int, dict[str, object]]:
    body = article_html(page)
    matches = list(HEADER_RE.finditer(body))
    found: dict[int, dict[str, object]] = {}
    for index, match in enumerate(matches):
        header = re.sub(r"\s+", " ", TAG_RE.sub("", html.unescape(match.group(1)))).strip()
        parsed = HEADER_TEXT_RE.match(header)
        if not parsed:
            continue
        number = int(parsed.group(1))
        letter = parsed.group(2).upper()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(body)
        chunk = body[match.end() : end]
        for marker in ("id=related", 'id="related"', "class=allcomments"):
            cut = chunk.find(marker)
            if cut >= 0:
                chunk = chunk[:cut]
        parser = FragmentToText()
        parser.feed(chunk)
        parser.close()
        steps = tidy(parser.text())
        videos = list(dict.fromkeys(watch_url(url) for url in parser.video_urls))
        found[number] = {
            "sourceAnswer": letter,
            "solutionSteps": steps,
            "hasDiagram": parser.has_diagram,
            "videoUrl": videos[0] if videos else None,
        }
    return found


def watch_url(url: str) -> str:
    match = re.search(r"youtube\.com/embed/([^?&/]+)", url)
    if match:
        return f"https://www.youtube.com/watch?v={match.group(1)}"
    return url


def question_number(question_id: str) -> int | None:
    match = re.search(r"q(\d+)$", question_id)
    if not match:
        return None
    return int(match.group(1))


def main() -> int:
    bank = json.loads(QUESTIONS.read_text(encoding="utf-8"))
    questions = bank["questions"]
    needed_years = sorted({q["year"] for q in questions}, key=lambda year: (year not in PAGE_URLS, year))

    parsed_pages: dict[str, dict[int, dict[str, object]]] = {}
    fetch_errors: dict[str, str] = {}
    for year in needed_years:
        url = PAGE_URLS.get(year)
        if not url:
            continue
        print(f"fetch {year} {url}", file=sys.stderr)
        try:
            page = fetch(url)
            parsed_pages[year] = parse_questions(page)
            print(f"  {len(parsed_pages[year])} questions", file=sys.stderr)
        except Exception as error:  # noqa: BLE001 — report and keep going
            fetch_errors[year] = str(error)
            print(f"  ERROR {error}", file=sys.stderr)
        time.sleep(0.25)

    solutions: dict[str, dict[str, object]] = {}
    missing: list[dict[str, object]] = []
    mismatches: list[dict[str, object]] = []
    with_steps = 0
    link_only = 0
    diagrams = 0

    for question in questions:
        year = question["year"]
        number = question_number(question["id"])
        url = source_url(year, number) if number else None
        block = parsed_pages.get(year, {}).get(number) if number else None
        steps = str(block["solutionSteps"]) if block else ""
        source_answer = str(block["sourceAnswer"]) if block else None
        has_diagram = bool(block["hasDiagram"]) if block else False
        video_url = block.get("videoUrl") if block else None
        if has_diagram:
            diagrams += 1

        if year in fetch_errors:
            reason = "fetch-failed"
        elif year not in PAGE_URLS:
            reason = "no-mathseasy-page"
        elif not block:
            reason = "question-not-on-page"
        elif not steps:
            reason = "empty-after-parse"
        else:
            reason = ""

        answer_matches = bool(source_answer) and source_answer == question["answer"]
        if source_answer and not answer_matches:
            mismatches.append(
                {
                    "id": question["id"],
                    "year": year,
                    "number": number,
                    "bankAnswer": question["answer"],
                    "sourceAnswer": source_answer,
                }
            )

        if steps:
            with_steps += 1
        elif url:
            link_only += 1

        if reason:
            missing.append(
                {
                    "id": question["id"],
                    "year": year,
                    "number": number,
                    "reason": reason,
                    "sourceTag": question["sourceTag"],
                }
            )

        solutions[question["id"]] = {
            "year": year,
            "number": number,
            "solutionSteps": steps,
            "solutionSourceUrl": url,
            "solutionCredit": CREDIT,
            "sourceAnswer": source_answer,
            "hasDiagram": has_diagram,
            "videoUrl": video_url,
            "answerMatches": answer_matches,
        }

    payload = {
        "author": AUTHOR,
        "sourceHome": SOURCE_HOME,
        "credit": CREDIT,
        "note": (
            "Worked steps are adapted from Thomas Fok's HKDSE Maths Paper II 題解 "
            "on mathseasy.hk. They are not original to this trainer. "
            "Diagrams are not embedded; the source link opens the year's page "
            "on the tab that contains the question (the site has no per-question anchor). "
            "Re-run scripts/fetch_solutions.py to refresh."
        ),
        "pages": PAGE_URLS,
        "coverage": {
            "bankQuestions": len(questions),
            "withSteps": with_steps,
            "linkOnly": link_only,
            "noPage": sum(1 for item in missing if item["reason"] == "no-mathseasy-page"),
            "diagramsNoted": diagrams,
            "answerMismatches": mismatches,
            "fetchErrors": fetch_errors,
            "missing": missing,
        },
        "solutions": solutions,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    coverage = payload["coverage"]
    print(f"wrote {OUT}")
    print(
        f"with steps {coverage['withSteps']}/{coverage['bankQuestions']}; "
        f"link only {coverage['linkOnly']}; "
        f"no page {coverage['noPage']}; "
        f"diagrams {coverage['diagramsNoted']}; "
        f"answer mismatches {len(mismatches)}"
    )
    by_reason: dict[str, list[str]] = {}
    for item in missing:
        by_reason.setdefault(str(item["reason"]), []).append(
            f"{item['year']} Q{item['number']} ({item['id']})"
        )
    for reason, items in by_reason.items():
        print(f"\n{reason} ({len(items)})")
        for line in items:
            print(f"  {line}")
    if mismatches:
        print("\nanswer mismatches")
        for item in mismatches:
            print(
                f"  {item['id']}: bank {item['bankAnswer']} / mathseasy {item['sourceAnswer']}"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
