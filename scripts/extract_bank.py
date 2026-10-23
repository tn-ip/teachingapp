#!/usr/bin/env python3
"""Build the Junior Paper 2 question bank from the sorted Word document.

Equations are converted to KaTeX-friendly LaTeX (MTEF v3 in mtef3.py, MTEF v5
via the vendored mtef-py parser). Diagrams are written to public/figures/.
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

DOCX = (
    Path(sys.argv[1])
    if len(sys.argv) > 1
    else Path(
        "/home/ubuntu/.cursor/projects/workspace/uploads/sort_paper2_0e52.docx"
    )
)
OUT_JSON = ROOT / "src" / "data" / "questions.json"
FIG_DIR = ROOT / "public" / "figures"

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


def split_choices(tokens) -> tuple[str, dict, list[str], str | None]:
    maths: list[str] = []
    figs: list[str] = []
    pieces: list[str] = []
    subtopic = None
    paras: list[list] = [[]]
    for t in tokens:
        if t[0] == "text" and t[1] == "\n" and not paras[-1]:
            continue
        if t == ("para",):
            if paras[-1]:
                paras.append([])
            continue
        paras[-1].append(t)
    paras = [p for p in paras if p]
    if paras and is_subtitle(paras[0]):
        subtopic = plain(paras[0]).strip()
        paras = paras[1:]
    for i, para in enumerate(paras):
        if i:
            pieces.append("\n")
        for t in para:
            if t[0] == "text":
                pieces.append(t[1])
            elif t[0] == "math":
                pieces.append(f"\uE000M{len(maths)}\uE001")
                maths.append(t[1])
            elif t[0] == "fig":
                pieces.append(f"\uE000F{len(figs)}\uE001")
                figs.append(t[1])
    blob = "".join(pieces)
    # Choice letters may follow a tab, a new paragraph, or a figure placeholder.
    bits = re.split(
        r"(?:^|(?<=[\n\t])|(?<=  )|(?<=\uE001))[ \t]*([A-D])\.[ \t]*",
        blob,
    )
    stem_blob = bits[0]
    choices = {}
    # bits = [stem, letter, content, letter, content, ...]
    idx = 1
    while idx + 1 < len(bits):
        letter = bits[idx]
        content = bits[idx + 1]
        if letter not in choices:
            choices[letter] = render_piece(content, maths, figs)
        idx += 2
    stem = render_piece(stem_blob, maths, figs)
    return stem, choices, figs, subtopic


def slug_year(year: str) -> str:
    if year == "Sample":
        return "sample"
    if year == "Practice":
        return "practice"
    return year or "x"


def main() -> None:
    bank = Bank(DOCX)
    num_formats = load_numbering(bank.z)
    num_counters: dict[str, int] = {}
    xml = bank.z.read("word/document.xml")
    root = ET.fromstring(xml)
    body = root.find(qn("w", "body"))
    assert body is not None

    chapter = None  # (id, title) or ("KEYS", "")
    chunk: list[list] = []
    questions_raw = []  # before answers
    keys = []

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
        if local(p) != "p":
            continue
        tokens = paragraph_tokens(p)
        prefix = list_prefix(p, num_formats, num_counters)
        if prefix and not plain(tokens).lstrip().startswith(prefix.strip()):
            tokens = [("text", prefix)] + tokens
        text = plain(tokens).strip()
        style = paragraph_style(p)
        if style == "h1":
            # Blank Heading 1 paragraphs are leftover spacing, not new chapters.
            if not text:
                continue
            flush_chunk()
            if text == "Keys" or text.startswith("Keys"):
                chapter = ("KEYS", "Keys")
            else:
                m = re.match(r"(J\d+)\.\s*(.+)", text)
                m2 = re.match(r"Ch\.\s*(\d+(?:\.\d+)?)\s*(.*)", text)
                if m:
                    chapter = (m.group(1), m.group(2).strip())
                elif m2:
                    chapter = (f"C{m2.group(1)}", text)
                else:
                    chapter = (text[:12], text)
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
        chunk.append(tokens)
        if parse_source(text):
            flush_chunk()

    flush_chunk()

    print(f"questions {len(questions_raw)} keys {len(keys)}")
    if len(questions_raw) != len(keys):
        print("WARNING key/question count mismatch")

    # Convert equations only for junior questions, then build records.
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    used_ids = Counter()
    records = []
    warnings = []
    stage_counts = Counter()

    for i, q in enumerate(questions_raw):
        stage_id, stage_title = q["chapter"]
        if not stage_id.startswith("J"):
            continue
        tag, year, qnum = q["source"]
        # Resolve equations in tokens.
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
            elif prid:
                # fallback preview image
                name = f"eq-{stage_id.lower()}-{i}-{eq_i}.png"
                dest = FIG_DIR / name
                if bank.write_media(prid, dest):
                    resolved.append(("fig", f"figures/{name}"))
                else:
                    resolved.append(("math", ""))
                eq_i += 1
                bank.eq_fail += 0
            else:
                resolved.append(("math", ""))
        stem, choices, figs, subtopic = split_choices(resolved)
        # Materialise real figure files. Placeholder paths in `figs` are either
        # already "figures/..." (equation fallbacks) or relationship ids.
        figure_paths = []
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
        # Rewrite figure placeholders that were relationship ids inside stem/choices.
        # split_choices already embedded rel ids via render. Replace them.
        def swap(text: str) -> str:
            for rel, path in zip(figs, figure_paths):
                if not rel.startswith("figures/"):
                    text = text.replace(f"![]({rel})", f"![]({path})")
            return text

        stem = swap(stem)
        choices = {k: swap(v) for k, v in choices.items()}
        for letter in ("A", "B", "C", "D"):
            if letter not in choices:
                warnings.append(f"missing {letter} {stage_id} {tag}")
        base_id = f"{stage_id}-{slug_year(year)}-q{qnum if qnum is not None else i}"
        used_ids[base_id] += 1
        qid = base_id if used_ids[base_id] == 1 else f"{base_id}-{used_ids[base_id]}"
        answer, percent = keys[i] if i < len(keys) else ("", None)
        # 2025 P2 Q13 has no percent in the Keys; HKEAA facility is 60 (key A).
        # 2025 P2 Q36 is Ch. 18 (not Junior). Keys say B (26); published facility is 46.
        if year == "2025" and qnum == 13:
            percent = 60
        elif year == "2025" and qnum == 36:
            percent = 46
        topic = stage_title
        if subtopic:
            topic = f"{stage_title} — {subtopic}"
        records.append(
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
        stage_counts[stage_id] += 1

    # Stage catalogue in document order.
    seen = []
    for q in questions_raw:
        sid, title = q["chapter"]
        if sid.startswith("J") and sid not in [s[0] for s in seen]:
            seen.append((sid, title))
    stages = [
        {"id": sid, "title": title, "questionCount": stage_counts[sid]}
        for sid, title in seen
    ]
    payload = {
        "paper": "HKDSE Mathematics Compulsory Part Paper 2",
        "stageSet": "junior",
        "stages": stages,
        "questions": records,
    }
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print("stages", stages)
    print("junior", len(records), "eq ok", bank.eq_ok, "eq empty", bank.eq_fail, "v5 timeout", bank.v5_timeout)
    print("warnings", len(warnings))
    for w in warnings[:40]:
        print(" -", w)
    # Spot-check alignment: first junior and a known Ch1 key.
    if questions_raw:
        print("first q", questions_raw[0]["source"], "key", keys[0] if keys else None)
        j0 = next(i for i, q in enumerate(questions_raw) if q["chapter"][0].startswith("J"))
        print("first junior index", j0, questions_raw[j0]["source"], "key", keys[j0])
        print("sample stem", records[0]["stem"][:240])
        print("sample choices", {k: records[0]["choices"][k][:80] for k in "ABCD"})
        print("sample answer", records[0]["answer"])


if __name__ == "__main__":
    main()
