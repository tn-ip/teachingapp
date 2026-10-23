#!/usr/bin/env python3
"""Build the Paper 2 question bank from the sorted Word document.

Junior stages stay J1–J19 (no J6). Compulsory stages are C1–C23, one stage
per chapter number. TOC splits of Ch. 4, 10, 14, 19, 20, and 21 are merged
into that chapter. Equations are converted to KaTeX-friendly LaTeX (MTEF v3
in mtef3.py, MTEF v5 via the vendored mtef-py parser). Diagrams are written
to public/figures/.

Existing Junior records are copied through unchanged when their ids still
match, so localStorage progress keeps working. Pass --structure to print
chapter counts and the Junior id check without converting equations.
"""

from __future__ import annotations

import json
import re
import signal
import subprocess
import sys
import zipfile
from collections import Counter
from io import BytesIO, StringIO
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "scripts" / "vendor"))

from mtef3 import ParseError, equation_native_body, mtef3_to_latex  # noqa: E402
from mtef_py.mtef import MTEF  # noqa: E402
from mtef_py.ole_util.ole import Ole  # noqa: E402

_POSITIONAL = [arg for arg in sys.argv[1:] if not arg.startswith("--")]
STRUCTURE_ONLY = "--structure" in sys.argv[1:]
DOCX = (
    Path(_POSITIONAL[0])
    if _POSITIONAL
    else Path(
        "/home/ubuntu/.cursor/projects/workspace/uploads/sort_paper2_d627.docx"
    )
)
OUT_JSON = ROOT / "src" / "data" / "questions.json"
FIG_DIR = ROOT / "public" / "figures"

# Display titles for C1–C23. Split headings keep their own section label on
# each question's topic; the stage id is only the chapter number.
COMPULSORY_TITLES = {
    1: "Quadratic equations in one unknown (I)",
    2: "Quadratic equations in one unknown (II)",
    3: "Basic knowledge of functions",
    4: "More about polynomials",
    5: "Equations of straight lines",
    6: "Exponential functions",
    7: "Logarithmic functions",
    8: "More about equations",
    9: "More about trigonometry",
    10: "Applications in trigonometry",
    11: "Variations",
    12: "Basic properties of circles",
    13: "Tangents to circles",
    14: "Measures of dispersion",
    15: "Permutation and combination",
    16: "More about probability",
    17: "Inequalities in one unknown",
    18: "Linear programming",
    19: "Locus and equations of circles",
    20: "Arithmetic and geometric sequences",
    21: "Sum of arithmetic and geometric sequences",
    22: "More about graphs of functions",
    23: "Use and abuse of statistics",
}

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
V = "urn:schemas-microsoft-com:vml"
O = "urn:schemas-microsoft-com:office:office"

NS = {"w": W, "r": R, "a": A, "v": V, "o": O}

# Adobe Symbol encoding for the glyphs that actually appear in this paper.
SYMBOL_BYTE = {
    0x20: " ",
    0x2B: "+",
    0x2D: "−",
    0x30: "0",
    0x3D: "=",
    0x40: "≅",
    0x41: "Α",
    0x42: "Β",
    0x44: "Δ",
    0x47: "Γ",
    0x61: "α",
    0x62: "β",
    0x67: "γ",
    0x70: "π",
    0x71: "θ",
    0x7E: "∼",
    0xA3: "≤",
    0xB0: "°",
    0xB3: "≥",
    0xB4: "×",
    0xB9: "≠",
    0xBA: "≡",
    0xD0: "∠",
    0xD7: "·",
}


class Alarm(Exception):
    pass


def _alarm(signum, frame):
    raise Alarm()


signal.signal(signal.SIGALRM, _alarm)


def qn(prefix: str, name: str) -> str:
    return f"{{{ {'w': W, 'r': R, 'a': A, 'v': V, 'o': O}[prefix] }}}{name}"


def local(el) -> str:
    return el.tag.split("}")[-1]


def flag_on(el) -> bool:
    if el is None:
        return False
    val = el.get(qn("w", "val"))
    return val not in ("0", "false", "off")


def clean_latex(src: str) -> str:
    s = (src or "").strip()
    if s.startswith("$$") and s.endswith("$$"):
        s = s[2:-2].strip()
    elif len(s) >= 2 and s.startswith("$") and s.endswith("$"):
        s = s[1:-1].strip()
    s = s.replace(r"\operatorname{(}", "(").replace(r"\operatorname{)}", ")")
    s = s.replace("^{}", "").replace("_{}", "")
    s = re.sub(r"\s+", " ", s).strip()
    s = s.replace(" \\ ", " ")
    return s


def braces_ok(src: str) -> bool:
    t = src.replace(r"\{", "").replace(r"\}", "")
    return t.count("{") == t.count("}") and t.count("(") == t.count(")")


class Bank:
    def __init__(self, docx: Path):
        self.z = zipfile.ZipFile(docx)
        rels_xml = self.z.read("word/_rels/document.xml.rels")
        self.rels = {}
        root = ET.fromstring(rels_xml)
        for rel in root:
            self.rels[rel.get("Id")] = rel.get("Target")
        self.latex_cache: dict[str, str] = {}
        self.eq_fail = 0
        self.eq_ok = 0
        self.v5_timeout = 0

    def native_body(self, target: str) -> bytes:
        data = self.z.read("word/" + target)
        ole, err = Ole.Open(BytesIO(data))
        if err:
            raise ParseError(err)
        directory, err = ole.ListDir()
        if err:
            raise ParseError(err)
        native = next(f for f in directory if f.Name() == "Equation Native")
        reader = ole.OpenFile(native, directory[0])
        return equation_native_body(reader.read(native.Size))

    def latex_for(self, rid: str) -> str:
        target = self.rels.get(rid, "")
        if not target.endswith(".bin"):
            return ""
        if target in self.latex_cache:
            return self.latex_cache[target]
        latex = ""
        try:
            body = self.native_body(target)
            if body[:1] == b"\x03":
                latex = clean_latex(mtef3_to_latex(body))
            elif body[:1] == b"\x05":
                latex = clean_latex(self._v5(target))
        except Exception:
            latex = ""
        if not latex or not braces_ok(latex):
            self.eq_fail += 1
            latex = ""
        else:
            self.eq_ok += 1
        self.latex_cache[target] = latex
        return latex

    def _v5(self, target: str) -> str:
        data = self.z.read("word/" + target)
        buf = StringIO()
        signal.alarm(2)
        try:
            import contextlib

            with contextlib.redirect_stdout(buf):
                mtef, err = MTEF.OpenBytes(data)
                if err or mtef is None:
                    return ""
                return mtef.Translate() or ""
        except Alarm:
            self.v5_timeout += 1
            return ""
        finally:
            signal.alarm(0)

    def preview_rid(self, ole_rid: str) -> str | None:
        """WMF/EMF preview paired with an equation OLE, when the rel order is adjacent."""
        target = self.rels.get(ole_rid, "")
        m = re.search(r"oleObject(\d+)\.bin", target)
        if not m:
            return None
        # Previews are not reliably n-1. Search rels for imagedata stored beside
        # this object in document.xml instead — caller passes it.
        return None

    def write_media(self, rid: str, dest: Path) -> bool:
        target = self.rels.get(rid)
        if not target:
            return False
        dest.parent.mkdir(parents=True, exist_ok=True)
        blob = self.z.read("word/" + target)
        ext = target.rsplit(".", 1)[-1].lower()
        if ext == "png":
            dest.write_bytes(blob)
            return True
        tmp = dest.with_suffix("." + ext)
        svg = dest.with_suffix(".svg")
        tmp.write_bytes(blob)
        try:
            if ext == "emf":
                subprocess.run(
                    ["emf2svg-conv", "-i", str(tmp), "-o", str(svg)],
                    check=True,
                    capture_output=True,
                    timeout=40,
                )
                subprocess.run(
                    ["rsvg-convert", "-z", "2", "-b", "white", "-o", str(dest), str(svg)],
                    check=True,
                    capture_output=True,
                    timeout=40,
                )
            elif ext == "wmf":
                subprocess.run(
                    ["wmf2svg", str(tmp), "-o", str(svg)],
                    check=True,
                    capture_output=True,
                    timeout=40,
                )
                subprocess.run(
                    ["rsvg-convert", "-z", "2", "-b", "white", "-o", str(dest), str(svg)],
                    check=True,
                    capture_output=True,
                    timeout=40,
                )
            else:
                subprocess.run(
                    [
                        "convert",
                        "-density",
                        "140",
                        str(tmp),
                        "-background",
                        "white",
                        "-alpha",
                        "remove",
                        str(dest),
                    ],
                    check=True,
                    capture_output=True,
                    timeout=40,
                )
            return dest.exists() and dest.stat().st_size > 0
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            return False
        finally:
            for extra in (tmp, svg):
                if extra.exists() and extra != dest:
                    extra.unlink()


def map_sym(el) -> str:
    font = (el.get(qn("w", "font")) or "").lower()
    raw = el.get(qn("w", "char")) or "00"
    try:
        code = int(raw, 16)
    except ValueError:
        return ""
    byte = code - 0xF000 if code >= 0xF000 else code
    if font.startswith("symbol"):
        if byte in SYMBOL_BYTE:
            return SYMBOL_BYTE[byte]
        if 32 <= byte < 127:
            return chr(byte)
        return ""
    try:
        ch = chr(code)
    except ValueError:
        return ""
    return ch if ch.isprintable() else ""


def run_tokens(run) -> list[tuple]:
    rpr = run.find(qn("w", "rPr"))
    italic = False
    super_ = False
    sub_ = False
    if rpr is not None:
        italic = flag_on(rpr.find(qn("w", "i"))) or flag_on(rpr.find(qn("w", "iCs")))
        va = rpr.find(qn("w", "vertAlign"))
        valign = va.get(qn("w", "val")) if va is not None else ""
        if valign == "superscript":
            super_ = True
        elif valign == "subscript":
            sub_ = True
    tokens = []
    for child in run:
        tag = local(child)
        if tag == "t":
            text = child.text or ""
            if super_:
                tokens.append(("sup", text))
            elif sub_:
                tokens.append(("sub", text))
            elif italic and re.fullmatch(r"[A-Za-z]", text):
                tokens.append(("math", text))
            else:
                tokens.append(("text", text))
        elif tag == "tab":
            tokens.append(("text", "\t"))
        elif tag == "br":
            tokens.append(("text", "\n"))
        elif tag == "sym":
            glyph = map_sym(child)
            if super_:
                tokens.append(("sup", glyph))
            elif sub_:
                tokens.append(("sub", glyph))
            else:
                tokens.append(("text", glyph))
        elif tag == "object":
            ole = child.find(f".//{qn('o', 'OLEObject')}")
            rid = ole.get(qn("r", "id")) if ole is not None else None
            preview = child.find(f".//{qn('v', 'imagedata')}")
            prid = preview.get(qn("r", "id")) if preview is not None else None
            if rid:
                tokens.append(("eq", rid, prid))
        elif tag == "drawing":
            blip = child.find(f".//{qn('a', 'blip')}")
            if blip is not None:
                rid = blip.get(qn("r", "embed"))
                if rid:
                    tokens.append(("fig", rid))
        elif tag == "pict":
            ole = child.find(f".//{qn('o', 'OLEObject')}")
            if ole is not None:
                rid = ole.get(qn("r", "id"))
                preview = child.find(f".//{qn('v', 'imagedata')}")
                prid = preview.get(qn("r", "id")) if preview is not None else None
                if rid:
                    tokens.append(("eq", rid, prid))
            else:
                img = child.find(f".//{qn('v', 'imagedata')}")
                if img is not None and img.get(qn("r", "id")):
                    tokens.append(("fig", img.get(qn("r", "id"))))
    return tokens


def paragraph_tokens(p) -> list[tuple]:
    tokens: list[tuple] = []

    def walk(el):
        for child in list(el):
            tag = local(child)
            if tag in ("pPr", "bookmarkStart", "bookmarkEnd", "proofErr"):
                continue
            if tag == "r":
                tokens.extend(run_tokens(child))
            elif tag in ("hyperlink", "ins", "smartTag", "sdt", "sdtContent"):
                walk(child)
            else:
                walk(child)

    walk(p)
    return coalesce_scripts(tokens)


def coalesce_scripts(tokens: list[tuple]) -> list[tuple]:
    """Join consecutive super/subscripts into one KaTeX script."""
    out: list[tuple] = []
    buf: tuple[str, list[str]] | None = None

    def flush() -> None:
        nonlocal buf
        if not buf:
            return
        kind, parts = buf
        body = "".join(parts).replace(" ", "")
        if body:
            script = "^{" + body + "}" if kind == "sup" else "_{" + body + "}"
            out.append(("math", script))
        buf = None

    for tok in tokens:
        if tok[0] in ("sup", "sub"):
            if buf and buf[0] != tok[0]:
                flush()
            if buf is None:
                buf = (tok[0], [])
            buf[1].append(tok[1])
        else:
            flush()
            out.append(tok)
    flush()
    return out


def load_numbering(z: zipfile.ZipFile) -> dict[str, str]:
    """numId → level-0 format (upperLetter, upperRoman, decimal, ...)."""
    root = ET.fromstring(z.read("word/numbering.xml"))
    abstracts = {}
    for an in root.findall(qn("w", "abstractNum")):
        aid = an.get(qn("w", "abstractNumId"))
        for lvl in an.findall(qn("w", "lvl")):
            if lvl.get(qn("w", "ilvl")) != "0":
                continue
            fmt = lvl.find(qn("w", "numFmt"))
            abstracts[aid] = fmt.get(qn("w", "val")) if fmt is not None else ""
    out = {}
    for num in root.findall(qn("w", "num")):
        nid = num.get(qn("w", "numId"))
        absn = num.find(qn("w", "abstractNumId"))
        if absn is not None:
            out[nid] = abstracts.get(absn.get(qn("w", "val")), "")
    return out


def roman(n: int) -> str:
    vals = [(10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")]
    out = []
    for value, glyph in vals:
        while n >= value:
            out.append(glyph)
            n -= value
    return "".join(out)


def list_prefix(p, formats: dict[str, str], counters: dict[str, int]) -> str | None:
    ppr = p.find(qn("w", "pPr"))
    if ppr is None:
        return None
    numpr = ppr.find(qn("w", "numPr"))
    if numpr is None:
        return None
    nid_el = numpr.find(qn("w", "numId"))
    if nid_el is None:
        return None
    nid = nid_el.get(qn("w", "val"))
    fmt = formats.get(nid, "")
    if fmt not in ("upperLetter", "upperRoman"):
        return None
    counters[nid] = counters.get(nid, 0) + 1
    n = counters[nid]
    if fmt == "upperLetter":
        if n > 4:
            return None
        return chr(ord("A") + n - 1) + ". "
    return roman(n) + ". "


def paragraph_style(p) -> str:
    ppr = p.find(qn("w", "pPr"))
    if ppr is None:
        return ""
    st = ppr.find(qn("w", "pStyle"))
    return st.get(qn("w", "val")) if st is not None else ""


def plain(tokens) -> str:
    parts = []
    for t in tokens:
        if t[0] == "text":
            parts.append(t[1])
        elif t[0] == "math":
            parts.append(t[1])
        elif t[0] == "eq":
            parts.append(" □ ")
    return "".join(parts)


def parse_source(text: str):
    m = re.search(r"\[([^\]]+)\]", text)
    if not m or "HKDSE" not in m.group(1) and "P2" not in m.group(1):
        return None
    body = re.sub(r"\s+", " ", m.group(1)).strip()
    tag = "[" + body + "]"
    if re.search(r"sample", body, re.I):
        year = "Sample"
    elif re.search(r"practice", body, re.I):
        year = "Practice"
    else:
        ym = re.search(r"\b(\d{2})\s*-?\s*P\s*2\b", body, re.I)
        if not ym:
            ym = re.search(r"\b(20\d{2})\b", body)
            if ym:
                year = ym.group(1)
            else:
                year = ""
        else:
            year = str(2000 + int(ym.group(1)))
    qm = re.search(r"Q\s*(\d+)", body, re.I)
    qnum = int(qm.group(1)) if qm else None
    return tag, year, qnum


def difficulty_band(percent: int | None) -> str:
    """Easy ≥ 70, Medium 40–69, Hard below 40. Missing % stays unknown."""
    if percent is None:
        return "unknown"
    if percent >= 70:
        return "easy"
    if percent >= 40:
        return "medium"
    return "hard"


def is_subtitle(tokens) -> bool:
    if any(t[0] != "text" for t in tokens):
        return False
    text = plain(tokens).strip()
    if not text or len(text) > 80:
        return False
    # Real stems carry an equation, a number, or a question mark.
    if re.search(r"[=0-9?]", text):
        return False
    if re.search(r"\b(if|find|which|let|figure|suppose|given|in the)\b", text, re.I):
        return False
    return True


def render_piece(blob: str, maths: list[str], figs: list[str]) -> str:
    def repl(m):
        kind = m.group(1)
        idx = int(m.group(2))
        if kind == "M":
            latex = maths[idx].strip()
            return f"\\({latex}\\)" if latex else ""
        if kind == "F":
            return f"![]({figs[idx]})"
        return ""

    text = re.sub(r"\uE000([MF])(\d+)\uE001", repl, blob)
    text = text.replace("\t", " ").replace("\xa0", " ")
    text = re.sub(r"[ ]{2,}", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Drop a trailing full stop that was the equation's sentence dot glued on.
    text = re.sub(r"\s+\.\s*$", "", text.strip())
    text = re.sub(r"(?<=\))\s*\.\s*$", "", text.strip())
    return text.strip()


def dedupe_figs(tokens: list[tuple]) -> list[tuple]:
    """Word often anchors the same drawing several times. Keep one copy."""
    out: list[tuple] = []
    for tok in tokens:
        if tok[0] == "fig" and out and out[-1][0] == "fig" and out[-1][1] == tok[1]:
            continue
        out.append(tok)
    return out


def match_choice_mark(tokens: list[tuple], index: int):
    """A choice label, including 'A' and '.' split across runs. Returns
    (letter, index after the mark, leftover text) or None."""
    tok = tokens[index]
    if tok[0] != "text":
        return None
    text = tok[1]
    inline = re.match(r"^[\t \u00a0]*([A-D])\s*\.(.*)$", text, re.S)
    if inline:
        return inline.group(1), index + 1, inline.group(2)
    letter = re.match(r"^[\t \u00a0]*([A-D])[\t \u00a0]*$", text)
    if not letter:
        return None
    cursor = index + 1
    while cursor < len(tokens) and tokens[cursor][0] == "text" and not tokens[cursor][1].strip():
        cursor += 1
    if cursor >= len(tokens) or tokens[cursor][0] != "text":
        return None
    dotted = re.match(r"^[\t \u00a0]*\.(.*)$", tokens[cursor][1], re.S)
    if not dotted:
        return None
    return letter.group(1), cursor + 1, dotted.group(1)


def _media_only(tokens: list[tuple]) -> bool:
    for tok in tokens:
        if tok[0] in ("fig", "eq"):
            continue
        if tok[0] == "text" and not tok[1].strip():
            continue
        return False
    return True


def _figs(tokens: list[tuple]) -> list[tuple]:
    return [tok for tok in tokens if tok[0] == "fig"]


def assign_paragraph(para: list[tuple]) -> tuple[list[tuple], list[tuple[str, list[tuple]]]]:
    """Split one paragraph into a preamble and (letter, content) choices.

    Diagram papers put the picture before its A.–D. label. A single repeated
    drawing is the whole option panel and stays in the preamble. One distinct
    drawing per label is zipped onto those labels.
    """
    para = dedupe_figs(para)
    marks = []
    index = 0
    while index < len(para):
        hit = match_choice_mark(para, index)
        if not hit:
            index += 1
            continue
        letter, nxt, rest = hit
        marks.append((index, letter, nxt, rest))
        index = nxt
    if not marks:
        return para, []
    before = para[: marks[0][0]]
    segments: list[tuple[str, list[tuple]]] = []
    for mark_index, (start, letter, nxt, rest) in enumerate(marks):
        end = marks[mark_index + 1][0] if mark_index + 1 < len(marks) else len(para)
        content = para[nxt:end]
        if rest:
            content = [("text", rest)] + content
        segments.append((letter, content))
    if _media_only(before) and all(_media_only(content) for _letter, content in segments):
        media = _figs(before)
        if len(media) == len(segments):
            return [], [(letter, [fig]) for (letter, _content), fig in zip(segments, media)]
        # One panel for several labels, or an ambiguous mix. Keep any drawing
        # that was already parsed into a label; do not drop it.
        return before, segments
    return before, segments


def split_choices(tokens) -> tuple[str, dict, list[str], str | None]:
    maths: list[str] = []
    figs: list[str] = []
    subtopic = None
    paras: list[list] = [[]]
    for tok in tokens:
        if tok[0] == "text" and tok[1] == "\n" and not paras[-1]:
            continue
        if tok == ("para",):
            if paras[-1]:
                paras.append([])
            continue
        paras[-1].append(tok)
    paras = [dedupe_figs(para) for para in paras if para]
    if paras and is_subtitle(paras[0]):
        subtopic = plain(paras[0]).strip()
        paras = paras[1:]

    stem_tokens: list[tuple] = []
    choice_map: dict[str, list[tuple]] = {}
    pending: list[tuple] = []
    choice_figs: list[tuple] = []

    def remember(media: list[tuple]) -> None:
        for fig in media:
            if fig not in choice_figs:
                choice_figs.append(fig)

    for para in paras:
        preamble, segments = assign_paragraph(para)
        if not segments:
            if _media_only(para) and _figs(para):
                pending.extend(_figs(para))
            else:
                if pending and not choice_map:
                    stem_tokens.extend(pending)
                    pending = []
                elif pending and choice_map:
                    last = next(reversed(choice_map))
                    choice_map[last].extend(pending)
                    remember(pending)
                    pending = []
                if stem_tokens and not choice_map:
                    stem_tokens.append(("text", "\n"))
                stem_tokens.extend(para)
            continue
        if pending and all(_media_only(content) for _letter, content in segments):
            media = _figs(pending)
            pending = []
            if len(media) == len(segments) and all(not content for _letter, content in segments):
                segments = [(letter, [fig]) for (letter, _content), fig in zip(segments, media)]
            elif len(media) == 1 and all(not content for _letter, content in segments):
                preamble = media + preamble
            else:
                preamble = media + preamble
        elif pending:
            if not choice_map:
                stem_tokens.extend(pending)
            else:
                last = next(reversed(choice_map))
                choice_map[last].extend(pending)
                remember(pending)
            pending = []
        if preamble:
            # Drawings that share a paragraph with A.–D. are option drawings,
            # even when they also have to stay in the stem (one panel, four labels).
            remember(_figs(preamble))
            panel_row = _media_only(preamble) and all(not content for _letter, content in segments)
            if not choice_map or panel_row:
                if stem_tokens:
                    stem_tokens.append(("text", "\n"))
                stem_tokens.extend(preamble)
            else:
                last = next(reversed(choice_map))
                choice_map[last].extend(preamble)
        for letter, content in segments:
            choice_map.setdefault(letter, []).extend(content)
            remember(_figs(content))
    if pending:
        if choice_map:
            last = next(reversed(choice_map))
            choice_map[last].extend(pending)
            remember(pending)
        else:
            stem_tokens.extend(pending)

    # Four separate option drawings, in reading order, belong to A–D even when
    # a label was stored on the following run (the picture is anchored first).
    distinct = []
    for fig in choice_figs:
        if fig not in distinct:
            distinct.append(fig)
    labels_are_blank = choice_map and all(
        not _textish(choice_map.get(letter, [])) for letter in "ABCD"
    )
    if len(distinct) == 4 and labels_are_blank:
        for fig in distinct:
            stem_tokens = [tok for tok in stem_tokens if tok != fig]
            for content in choice_map.values():
                content[:] = [tok for tok in content if tok != fig]
        choice_map = {letter: [fig] for letter, fig in zip("ABCD", distinct)}

    # The same drawing repeated next to several labels is one panel, not four
    # different options (Word reuses the relationship id).
    repeated = []
    for letter in "ABCD":
        figures = _figs(choice_map.get(letter, []))
        if figures:
            repeated.append(figures[0])
    if len(repeated) >= 2 and len({fig[1] for fig in repeated}) == 1:
        panel = repeated[0]
        if panel not in stem_tokens:
            if stem_tokens:
                stem_tokens.append(("text", "\n"))
            stem_tokens.append(panel)
        for letter in list(choice_map):
            choice_map[letter] = [
                tok for tok in choice_map[letter] if not (tok[0] == "fig" and tok[1] == panel[1])
            ]

    # A choice that only repeats a drawing already in the stem is the same panel.
    stem_rels = {tok[1] for tok in stem_tokens if tok[0] == "fig"}
    for letter in list(choice_map):
        figures = _figs(choice_map[letter])
        if figures and not _textish(choice_map[letter]) and all(fig[1] in stem_rels for fig in figures):
            choice_map[letter] = [tok for tok in choice_map[letter] if tok[0] != "fig"]

    seen_stem_figs: set[str] = set()
    compact_stem: list[tuple] = []
    for tok in stem_tokens:
        if tok[0] == "fig":
            if tok[1] in seen_stem_figs:
                continue
            seen_stem_figs.add(tok[1])
        compact_stem.append(tok)
    stem_tokens = compact_stem

    def pieces_for(chunk: list[tuple], leading_break: bool) -> str:
        parts: list[str] = []
        if leading_break and chunk:
            parts.append("\n")
        for tok in chunk:
            if tok[0] == "text":
                parts.append(tok[1])
            elif tok[0] == "math":
                parts.append(f"\uE000M{len(maths)}\uE001")
                maths.append(tok[1])
            elif tok[0] == "fig":
                parts.append(f"\uE000F{len(figs)}\uE001")
                figs.append(tok[1])
        return "".join(parts)

    stem = render_piece(pieces_for(stem_tokens, False), maths, figs)
    choices = {
        letter: render_piece(pieces_for(choice_map.get(letter, []), False), maths, figs)
        for letter in "ABCD"
        if letter in choice_map
    }
    return stem, choices, figs, subtopic


def _textish(tokens: list[tuple]) -> bool:
    for tok in tokens:
        if tok[0] == "math":
            return True
        if tok[0] == "text" and tok[1].strip():
            return True
    return False


def table_paragraphs(tbl) -> list[list[tuple]]:
    """Turn a Word table into paragraphs. A leading A.–D. column becomes choices."""
    rows = []
    for tr in tbl.findall(qn("w", "tr")):
        cells = []
        for tc in tr.findall(qn("w", "tc")):
            tokens: list[tuple] = []
            for paragraph in tc.findall(qn("w", "p")):
                if tokens:
                    tokens.append(("text", " "))
                tokens.extend(paragraph_tokens(paragraph))
            cells.append(dedupe_figs(tokens))
        rows.append(cells)
    rows = [row for row in rows if any(plain(cell).strip() or _figs(cell) for cell in row)]
    if not rows:
        return []

    def label(cell: list[tuple]) -> str:
        return re.sub(r"\s+", "", plain(cell))

    labels = [label(row[0]) if row else "" for row in rows]
    if sum(1 for item in labels if re.fullmatch(r"[A-D]\.?", item)) >= 3:
        paras = []
        if not re.fullmatch(r"[A-D]\.?", labels[0]):
            header: list[tuple] = []
            for cell in rows[0]:
                if header:
                    header.append(("text", "\t"))
                header.extend(cell)
            paras.append(header)
        for row, item in zip(rows, labels):
            matched = re.fullmatch(r"([A-D])\.?", item)
            if not matched:
                continue
            line: list[tuple] = [("text", f"{matched.group(1)}.\t")]
            for cell in row[1:]:
                line.extend(cell)
                line.append(("text", "\t"))
            paras.append(line)
        return paras

    paras = []
    for row in rows:
        line = []
        for index, cell in enumerate(row):
            if index:
                line.append(("text", " | "))
            line.extend(cell)
        paras.append(line)
    return paras


def slug_year(year: str) -> str:
    if year == "Sample":
        return "sample"
    if year == "Practice":
        return "practice"
    return year or "x"


def section_label(heading: str, rest: str) -> str:
    """Short label for a TOC split, kept on the question topic."""
    ranged = re.match(r"Ch\.\s*(\d+\.\d+\s*-\s*\d+\.\d+)\s*(.*)", heading)
    if ranged:
        detail = re.sub(r"\s+", " ", ranged.group(2)).strip()
        return f"{ranged.group(1)} {detail}".strip()
    numbered = re.match(r"Ch\.\s*(\d+\.\d+)\s*(.*)", heading)
    if numbered:
        detail = re.sub(r"\s+", " ", numbered.group(2)).strip()
        return f"{numbered.group(1)} {detail}".strip()
    paren = re.search(r"\(([^)]+)\)\s*$", rest)
    if paren:
        return paren.group(1).strip()
    return rest


def parse_chapter_heading(text: str) -> tuple[str, str, str | None] | None:
    """(stage id, display title, section label). Section is None for Junior."""
    junior = re.match(r"(J\d+)\.\s*(.+)", text)
    if junior:
        return junior.group(1), junior.group(2).strip(), None
    compulsory = re.match(
        r"Ch\.\s*(\d+)(?:\.\d+(?:\s*-\s*\d+\.\d+)?)?\s*(.*)",
        text,
    )
    if not compulsory:
        return None
    number = int(compulsory.group(1))
    title = COMPULSORY_TITLES.get(number)
    if not title:
        return None
    rest = re.sub(r"\s+", " ", compulsory.group(2)).strip()
    return f"C{number}", title, section_label(text, rest)


def corrected_percent(year: str, qnum: int | None, percent: int | None) -> int | None:
    # 2025 P2 Q13 has no percent in the Keys; HKEAA facility is 60 (key A).
    # 2025 P2 Q36 is Ch. 18. Keys say B (26); published facility is 46.
    if year == "2025" and qnum == 13:
        return 60
    if year == "2025" and qnum == 36:
        return 46
    return percent


def question_id(stage_id: str, year: str, qnum: int | None, index: int, used: Counter) -> str:
    base_id = f"{stage_id}-{slug_year(year)}-q{qnum if qnum is not None else index}"
    used[base_id] += 1
    if used[base_id] == 1:
        return base_id
    return f"{base_id}-{used[base_id]}"


def main() -> None:
    bank = Bank(DOCX)
    num_formats = load_numbering(bank.z)
    num_counters: dict[str, int] = {}
    xml = bank.z.read("word/document.xml")
    root = ET.fromstring(xml)
    body = root.find(qn("w", "body"))
    assert body is not None

    chapter = None  # (id, title, section) or ("KEYS", "", None)
    chunk: list[list] = []
    questions_raw = []  # before answers
    keys = []
    heading_figs: list[tuple] = []

    def flush_chunk():
        if chapter is None or chapter[0] == "KEYS" or not chunk:
            chunk.clear()
            return
        # A question chunk ends at the reference paragraph, which is included.
        flat = []
        ref = None
        for tokens in chunk:
            text = plain(tokens)
            parsed = parse_source(text)
            if parsed and ref is None:
                ref = parsed
                # keep any non-tag text in the same paragraph
                stripped = re.sub(r"\[[^\]]+\]", "", text).strip()
                if stripped and any(t[0] != "text" for t in tokens):
                    flat.append(("para",))
                    flat.extend(tokens)
                continue
            if flat:
                flat.append(("para",))
            flat.extend(tokens)
        if ref is None:
            chunk.clear()
            return
        questions_raw.append({"chapter": chapter, "tokens": flat, "source": ref})
        chunk.clear()

    for p in body:
        if local(p) == "tbl":
            if chapter is None or chapter[0] == "KEYS":
                continue
            for tokens in table_paragraphs(p):
                if heading_figs:
                    chunk.append(heading_figs)
                    heading_figs = []
                chunk.append(dedupe_figs(tokens))
            continue
        if local(p) != "p":
            continue
        tokens = dedupe_figs(paragraph_tokens(p))
        prefix = list_prefix(p, num_formats, num_counters)
        if prefix and not plain(tokens).lstrip().startswith(prefix.strip()):
            # A choice row already carries its own A.–D. label. A list prefix
            # would invent a second one and hide the drawings.
            already_labelled = any(match_choice_mark(tokens, i) for i in range(len(tokens)))
            if not already_labelled:
                tokens = [("text", prefix)] + tokens
        text = plain(tokens).strip()
        style = paragraph_style(p)
        if style == "h1":
            # Blank Heading 1 paragraphs are leftover spacing, not new chapters.
            # A diagram anchored on the heading belongs to the first question.
            if not text:
                heading_figs.extend(tok for tok in tokens if tok[0] == "fig")
                continue
            flush_chunk()
            heading_figs = [tok for tok in tokens if tok[0] == "fig"]
            if text == "Keys" or text.startswith("Keys"):
                chapter = ("KEYS", "Keys", None)
                heading_figs = []
            else:
                parsed = parse_chapter_heading(text)
                if parsed:
                    chapter = parsed
                else:
                    chapter = (text[:12], text, None)
            continue
        if chapter is None:
            continue
        if chapter[0] == "KEYS":
            if not text or text.lower().startswith("note:"):
                continue
            for line in text.splitlines():
                km = re.match(r"^\s*([A-D])\s*(?:\((\d+)\))?\s*$", line.strip())
                if km:
                    keys.append((km.group(1), int(km.group(2)) if km.group(2) else None))
            continue
        if not text and not any(t[0] in ("eq", "fig") for t in tokens):
            continue
        if heading_figs:
            chunk.append(heading_figs)
            heading_figs = []
        chunk.append(tokens)
        if parse_source(text):
            flush_chunk()

    flush_chunk()

    print(f"questions {len(questions_raw)} keys {len(keys)}")
    if len(questions_raw) != len(keys):
        print("WARNING key/question count mismatch")

    existing = (
        json.loads(OUT_JSON.read_text(encoding="utf-8"))
        if OUT_JSON.exists()
        else {"stages": [], "questions": []}
    )
    existing_junior_stages = [
        stage for stage in existing.get("stages", []) if str(stage.get("id", "")).startswith("J")
    ]
    existing_junior = [
        question
        for question in existing.get("questions", [])
        if str(question.get("stage", "")).startswith("J")
    ]
    existing_by_id = {question["id"]: question for question in existing_junior}

    split_stages = set()
    sections_for: dict[str, list[str]] = {}
    for q in questions_raw:
        stage_id, _title, section = q["chapter"]
        if not section:
            continue
        sections_for.setdefault(stage_id, [])
        if section not in sections_for[stage_id]:
            sections_for[stage_id].append(section)
    split_stages = {stage_id for stage_id, labels in sections_for.items() if len(labels) > 1}
    print("merged sections", {sid: sections_for[sid] for sid in sorted(split_stages, key=lambda s: int(s[1:]))})

    if not STRUCTURE_ONLY:
        FIG_DIR.mkdir(parents=True, exist_ok=True)
    used_ids: Counter = Counter()
    compulsory_records = []
    junior_ids: list[str] = []
    key_mismatches = []
    warnings = []
    stage_counts: Counter = Counter()
    facility_values: dict[str, list[int | None]] = {}
    converted = 0

    def materialise(i: int, q: dict, stage_id: str, year: str, qnum: int | None, tag: str):
        resolved = []
        eq_i = 0
        for t in q["tokens"]:
            if t[0] != "eq":
                resolved.append(t)
                continue
            _kind, rid, prid = t
            latex = bank.latex_for(rid)
            if latex:
                resolved.append(("math", latex))
            elif prid and not STRUCTURE_ONLY:
                name = f"eq-{stage_id.lower()}-{i}-{eq_i}.png"
                dest = FIG_DIR / name
                if bank.write_media(prid, dest):
                    resolved.append(("fig", f"figures/{name}"))
                else:
                    resolved.append(("math", ""))
                eq_i += 1
            else:
                resolved.append(("math", ""))
        stem, choices, figs, subtopic = split_choices(resolved)
        figure_paths = []
        if not STRUCTURE_ONLY:
            for fi, fig in enumerate(figs):
                if fig.startswith("figures/"):
                    figure_paths.append(fig)
                    continue
                ext_name = f"{stage_id.lower()}-{slug_year(year)}-q{qnum or i}-{fi+1}.png"
                dest = FIG_DIR / ext_name
                if bank.write_media(fig, dest):
                    figure_paths.append(f"figures/{ext_name}")
                else:
                    warnings.append(f"figure failed {stage_id} {tag} {fig}")

            def swap(text: str) -> str:
                for rel, path in zip(figs, figure_paths):
                    if not rel.startswith("figures/"):
                        text = text.replace(f"![]({rel})", f"![]({path})")
                return text

            stem = swap(stem)
            choices = {k: swap(v) for k, v in choices.items()}
        filled = [letter for letter in "ABCD" if choices.get(letter, "").strip()]
        if len(filled) not in (0, 4):
            for letter in "ABCD":
                if letter not in filled:
                    warnings.append(f"missing {letter} {stage_id} {tag}")
        elif not filled and "![](" not in stem and not any("![](" in choices.get(letter, "") for letter in "ABCD"):
            warnings.append(f"no choices {stage_id} {tag}")
        return stem, choices, figure_paths, subtopic

    for i, q in enumerate(questions_raw):
        stage_id, stage_title, section = q["chapter"]
        if not (stage_id.startswith("J") or stage_id.startswith("C")):
            warnings.append(f"skipped heading {stage_id}")
            continue
        tag, year, qnum = q["source"]
        qid = question_id(stage_id, year, qnum, i, used_ids)
        answer, raw_percent = keys[i] if i < len(keys) else ("", None)
        percent = corrected_percent(year, qnum, raw_percent)
        facility_values.setdefault(stage_id, []).append(percent)
        stage_counts[stage_id] += 1

        if stage_id.startswith("J"):
            junior_ids.append(qid)
            kept = existing_by_id.get(qid)
            if kept is None:
                key_mismatches.append(f"missing existing junior id {qid}")
            else:
                if kept.get("answer") != answer or kept.get("facilityPct") != percent:
                    key_mismatches.append(
                        f"{qid} bank {kept.get('answer')} {kept.get('facilityPct')} "
                        f"vs keys {answer} {percent}"
                    )
            continue

        if STRUCTURE_ONLY:
            compulsory_records.append({"id": qid, "stage": stage_id, "sourceTag": tag})
            continue

        converted += 1
        if converted % 25 == 0:
            print(f"converted {converted} compulsory", flush=True)
        stem, choices, figure_paths, subtopic = materialise(i, q, stage_id, year, qnum, tag)
        topic = stage_title
        if stage_id in split_stages and section:
            topic = f"{stage_title} — {section}"
        if subtopic:
            topic = f"{topic} — {subtopic}"
        compulsory_records.append(
            {
                "id": qid,
                "stage": stage_id,
                "topic": topic,
                "year": year,
                "paper": "2",
                "sourceTag": tag,
                "stem": stem,
                "choices": {k: choices.get(k, "") for k in ("A", "B", "C", "D")},
                "answer": answer,
                "correctPercent": percent,
                "facilityPct": percent,
                "difficulty": difficulty_band(percent),
                "hasFigure": bool(figure_paths),
                "figure": figure_paths[0] if figure_paths else None,
                "figures": figure_paths,
            }
        )

    missing_ids = [qid for qid in junior_ids if qid not in existing_by_id]
    extra_ids = sorted(set(existing_by_id) - set(junior_ids))
    duplicate_junior = len(junior_ids) != len(set(junior_ids))
    print(
        f"junior ids doc {len(junior_ids)} existing {len(existing_by_id)} "
        f"missing {len(missing_ids)} extra {len(extra_ids)} "
        f"duplicate {duplicate_junior}"
    )
    for qid in missing_ids[:20]:
        print(" missing", qid)
    for qid in extra_ids[:20]:
        print(" extra", qid)
    print("key mismatches", len(key_mismatches))
    for line in key_mismatches[:30]:
        print(" -", line)

    seen_c: list[tuple[str, str]] = []
    for q in questions_raw:
        stage_id, title, _section = q["chapter"]
        if stage_id.startswith("C") and stage_id not in [sid for sid, _title in seen_c]:
            seen_c.append((stage_id, title))
    seen_c.sort(key=lambda item: int(item[0][1:]))
    compulsory_stages = [
        {"id": stage_id, "title": title, "questionCount": stage_counts[stage_id]}
        for stage_id, title in seen_c
    ]

    def average_of(stage_id: str) -> float | None:
        tagged = [value for value in facility_values.get(stage_id, []) if value is not None]
        if not tagged:
            return None
        return sum(tagged) / len(tagged)

    print("stage averages")
    catalogue = [(stage["id"], stage["title"]) for stage in existing_junior_stages]
    catalogue += [(stage["id"], stage["title"]) for stage in compulsory_stages]
    for stage_id, title in catalogue:
        avg = average_of(stage_id)
        tagged = sum(1 for value in facility_values.get(stage_id, []) if value is not None)
        band = difficulty_band(None if avg is None else avg)
        avg_text = "—" if avg is None else f"{avg:.1f}"
        print(
            f"  {stage_id:4} {stage_counts[stage_id]:3} tagged {tagged:3} "
            f"avg {avg_text:>6} {band:7} {title}"
        )

    print(
        "compulsory",
        len(compulsory_records),
        "eq ok",
        bank.eq_ok,
        "eq empty",
        bank.eq_fail,
        "v5 timeout",
        bank.v5_timeout,
    )
    print("warnings", len(warnings))
    for w in warnings[:40]:
        print(" -", w)
    if questions_raw and keys:
        print("first q", questions_raw[0]["source"], "key", keys[0])
        j0 = next(i for i, q in enumerate(questions_raw) if q["chapter"][0].startswith("J"))
        print("first junior index", j0, questions_raw[j0]["source"], "key", keys[j0])
        c18 = next(
            (
                i
                for i, q in enumerate(questions_raw)
                if q["source"][1] == "2025" and q["source"][2] == 36
            ),
            None,
        )
        if c18 is not None:
            print("2025 Q36", questions_raw[c18]["chapter"][0], questions_raw[c18]["source"], "key", keys[c18])

    if STRUCTURE_ONLY:
        return
    if missing_ids or extra_ids or duplicate_junior or len(junior_ids) != len(existing_junior):
        print("refusing to write: Junior ids would change")
        sys.exit(1)
    if len(compulsory_stages) != 23:
        print(f"refusing to write: expected C1–C23, got {len(compulsory_stages)}")
        sys.exit(1)

    payload = {
        "paper": "HKDSE Mathematics Compulsory Part Paper 2",
        "stageSet": "junior+compulsory",
        "idScheme": (
            "Junior stages stay J1–J19 (no J6). Compulsory stages are C1–C23, "
            "one stage per chapter number. TOC splits of Ch. 4, 10, 14, 19, 20, "
            "and 21 are merged into that chapter's stage. Question ids are "
            "{stage}-{year}-q{number}."
        ),
        "stages": existing_junior_stages + compulsory_stages,
        "questions": existing_junior + compulsory_records,
    }
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote", OUT_JSON, "questions", len(payload["questions"]))
    if compulsory_records:
        sample = compulsory_records[0]
        print("sample compulsory", sample["id"], sample["answer"], sample["facilityPct"])
        print("sample stem", sample["stem"][:240])


if __name__ == "__main__":
    main()
